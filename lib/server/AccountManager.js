import invariant from 'invariant';
import _filter from 'fast.js/array/filter';
import { EventEmitter } from 'marsdb';
import jwt from 'jsonwebtoken';
import * as MarsAccount from './index';
import EmailSender from './EmailSender';


// Internals
const TOKEN_EXPIERS_IN = 3 * 30 * 24 * 60 * 60; // 3 months in sec

/**
 * Manager for dealing with creating/updating of user object
 * and to authorize DDP connection.
 */
export default class AccountManager extends EventEmitter {
  constructor(secretKey, smtpUrl) {
    super();
    this._secretKey = secretKey;
    this._emailSender = new EmailSender(smtpUrl);
  }

  /**
   * Sends an email to a user. If email not provided then
   * email will be sent to first available email. If no
   * emails available then it throws an error.
   * @param  {String} userId
   * @param  {String} email
   * @return {Promise}
   */
  sendEmailForAccount(userId, type, letter, email) {
    return MarsAccount.users().findOne(userId).then(user => {
      invariant(
        user,
        'No user with given id %s found',
        userId
      );

      let targetEmail = email;
      if (!targetEmail) {
        targetEmail = user.emails[0].address;
      }

      this.emit(`user:email:${type}`, letter);
      return this._emailSender.send(targetEmail, letter);
    });
  }

  /**
   * Returns a Promise that resolved with user object with
   * given email or null if no user found
   * @param  {String} email
   * @return {Promise}
   */
  getUserByEmail(email) {
    email = email.toLowerCase();
    return MarsAccount.users().findOne({'emails.address': email});
  }

  /**
   * Create new user with given email and passObj
   * @param  {String} email
   * @param  {Object} passObj
   * @return {Promise}
   */
  createUserByEmailPass(email, passObj) {
    email = email.toLowerCase();
    const newUserObj = {
      profile: { },
      createdAt: new Date(),
      services: { resume: { tokens: [] } },
      emails: [{ address: email, verified: false }],
      password: passObj,
    };

    newUserObj._id = MarsAccount.users().idGenerator().value;
    this.emit('user:create', newUserObj);
    return MarsAccount.users()
      .insert(newUserObj)
      .then(() => newUserObj);
  }

  /**
   * Authenticate given connection for using with given
   * userId and relaunch all subscriptions. It also create
   * JWT token and store it in the user object or renew provided.
   * Returns a promise that will be resolved with object with
   * `userId` and `token` fields.
   * @param  {DDPConnection}  conn
   * @param  {String}         userId
   * @param  {String}         token
   * @return {Promise}
   */
  authConnection(conn, userId, usedToken) {
    // Authorize connection
    this.emit('user:authorize', userId);
    conn.data.userId = userId;
    conn.subManager.updateSubscriptions();

    // Renew tokens of the user
    const users = MarsAccount.users();
    return users.findOne(userId).then(user => {
      const loginTokens = user.services.resume.tokens;
      const { validTokens, token } = this._filterTokensAndCreate(
        userId, loginTokens, usedToken
      );
      return users.update(userId, {
        $set: { 'services.resume.tokens': validTokens },
      }).then(() => ({ userId, token }));
    });
  }

  /**
   * Remove userId from conneciton and update subscriptions
   * @param  {DDPConnection} conn
   * @return {Promise}
   */
  unauthConneciton(conn) {
    delete conn.data.userId;
    return conn.subManager.updateSubscriptions();
  }

  /**
   * Get user by given profile or create new one.
   * Returns a promise that will be resolved with user object.
   * @param  {Object} profile
   * @return {Promise}
   */
  getOrCreateAccByProfile(profile) {
    const { provider } = profile;
    const newUserObj = {
      profile: { name: profile.displayName },
      createdAt: new Date(),
      services: {
        [provider]: profile,
        resume: { tokens: [] },
      },
    };

    return MarsAccount.users()
      .findOne({[`services.${provider}.id`]: profile.id})
      .then(user => {
        if (!user) {
          newUserObj._id = MarsAccount.users().idGenerator().value;
          this.emit('user:create', newUserObj);
          return MarsAccount.users()
            .insert(newUserObj)
            .then(() => newUserObj);
        } else {
          return user;
        }
      });
  }

  /**
   * Adds given OAuth profile to given account.
   * If profile of given provider already exists then it will
   * be replaced
   * @param {String} userId
   * @param {Object} profile
   */
  addServiceToUser(userId, profile) {
    const { provider } = profile;
    return MarsAccount.users()
      .update(userId, {$set: {[`services.${provider}`]: profile}});
  }

  /**
   * Verify given JWT token and returns incapsulated data.
   * (object with `userId` field for now)
   * @param  {String} token
   * @return {Object}
   */
  verifyAuthToken(token) {
    return jwt.verify(token, this._secretKey);
  }

  /**
   * Created JWT token signed with secret key for given payload
   * @param  {Object}   payload
   * @param  {Integer}  expiresIn
   * @return {String}
   */
  createToken(payload, expiresIn = TOKEN_EXPIERS_IN) {
    return jwt.sign(payload, this._secretKey, { expiresIn: expiresIn });
  }

  /**
   * Filter out invalid and used tokens from given array
   * and creates new valid token
   * @param  {String} userId
   * @param  {Array}  tokens
   * @param  {String} usedToken
   * @return {Object}
   */
  _filterTokensAndCreate(userId, tokens = [], usedToken) {
    const validTokens = _filter(tokens, (token) => {
      try {
        this.verifyAuthToken(token);
        return token !== usedToken;
      } catch (err) {
        return false;
      }
    });

    const token = this.createToken({ userId });
    validTokens.push(token);

    return { validTokens, token };
  }
}
