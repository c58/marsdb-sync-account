import invariant from 'invariant';
import bcrypt from 'bcryptjs';
import validateEmail from 'email-validator';
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
            // TODO send a letter to verify email
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
    return this._accManager.authConnection(ctx.connection, userId, token);
  };

  _handleVerifyEmail = (req, res) => {

  };
}
