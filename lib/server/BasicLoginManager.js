import invariant from 'invariant';
import bcrypt from 'bcryptjs';
import validateEmail from 'email-validator';
import * as MarsAccount from './index';
import { method } from 'marsdb-sync-server';
import { BASIC_LOGIN_ERR } from '../common/ErrorCodes';


// Internals
export function _getPasswordString(passObj) {
  invariant(
    (
      passObj && passObj.algorithm === 'sha-256' &&
      typeof passObj.digest === 'string' &&
      passObj.digest.length === 64
    ),
    BASIC_LOGIN_ERR.INVALID_PASS
  );
  return passObj.digest;
}

export function _validateEmailPass(email, passObj) {
  const passStr = _getPasswordString(passObj);
  invariant(validateEmail.validate(email), BASIC_LOGIN_ERR.INVALID_EMAIL);
  email = email.toLowerCase();
  return { email, passStr };
}

/**
 * Email/password login manager.
 */
export default class BasicLoginManager {
  constructor(accManager, middlewareApp, rootUrl) {
    this._accManager = accManager;
    this._rootUrl = rootUrl;

    method('/auth/basic/login', this._handleBasicLogin);
    method('/auth/basic/register', this._handleBasicRegister);
    method('/auth/basic/logout', this._handleBasicLogout);
    method('/auth/token/login', this._handleTokenLogin);
    middlewareApp.get('/auth/basic/email/verify', this._handleVerifyEmail);
  }

  /**
   * Handle login by email and password
   * @param  {Context} ctx
   * @param  {String} email
   * @param  {Object} passObj
   * @return {Promise}
   */
  _handleBasicLogin = (ctx, rawEmail, passObj) => {
    const { email, passStr } = _validateEmailPass(rawEmail, passObj);

    return this._accManager.getUserByEmail(email).then(user => {
      invariant(user, BASIC_LOGIN_ERR.WRONG_EMAIL);
      const userPassStr = user.password.bcrypt;

      return new Promise(resolve => {
        bcrypt.compare(userPassStr, passStr, (err, res) => {
          invariant(res && !err, BASIC_LOGIN_ERR.WRONG_PASS);

          const authPromise = this._accManager.authConnection(
            ctx.connection, user._id);
          resolve(authPromise);
        });
      });
    });
  };

  /**
   * Register new user by email and password
   * @param  {Context} ctx
   * @param  {String} email
   * @param  {Object} passObj
   * @return {Promise}
   */
  _handleBasicRegister = (ctx, rawEmail, passObj) => {
    const { email, passStr } = _validateEmailPass(rawEmail, passObj);

    return this._accManager.getUserByEmail(email).then(existingUser => {
      invariant(!existingUser, BASIC_LOGIN_ERR.USED_EMAIL);

      return new Promise(resolve => {
        bcrypt.hash(passStr, 10, (err, bcryptPassStr) => {
          this._accManager.createUserByEmailPass(
            email, { bcrypt: bcryptPassStr }
          ).then(user => {
            this._sendVerifyEmail(user._id, email);
            return this._accManager.authConnection(ctx.connection, user._id);
          }).then(resolve);
        });
      });
    });
  };

  /**
   * Logout user
   * @param  {Context} ctx
   * @return {Promise}
   */
  _handleBasicLogout = (ctx) => {
    return this._accManager.unauthConneciton(ctx.connection);
  };

  /**
   * Authorize connection with given JWT token
   * @param  {Context} ctx
   * @param  {String} token
   * @return {Promise}
   */
  _handleTokenLogin = (ctx, token) => {
    const { userId } = this._accManager.verifyAuthToken(token);
    return MarsAccount.users().findOne(userId).project({}).then((usr) => {
      if (usr) {
        return this._accManager.authConnection(ctx.connection, userId, token);
      } else {
        throw new Error('User from a token does not exists');
      }
    })
  };

  /**
   * Handle email verification token and verify email from the token
   * @param  {Request} req
   * @param  {Response} res
   */
  _handleVerifyEmail = (req, res) => {
    const token = decodeURIComponent(req.query && req.query.t);
    invariant(token, 'No token provided');
    const { userId, email } = this._accManager.verifyAuthToken(token);

    return MarsAccount.users().update(
      {
        _id: userId,
        'emails.address': email,
        'emails.verified': false,
      },
      {
        $set: {'emails.$.verified': true},
        $pull: {'services.email.verify': token},
      }
    ).then(
      () => res.redirect(this._rootUrl),
      () => res.sendStatus(500)
    );
  };

  /**
   * Sends an email to verify an email
   * @param  {String} userId
   * @param  {String} email
   * @return {Promise}
   */
  _sendVerifyEmail(userId, email) {
    const token = this._accManager.createToken({ email, userId });
    const tokenEncoded = encodeURIComponent(token);
    const verifyUrl = `${this._rootUrl}/auth/basic/email/verify?t=${tokenEncoded}`;

    return MarsAccount.users().update(
      userId, {$push: {'services.email.verify': token}}
    ).then(() => {
      return this._accManager.sendEmailForAccount(userId, 'verify',
        { verifyUrl }, email);
    })
  }
}
