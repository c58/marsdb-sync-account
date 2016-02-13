import _filter from 'fast.js/array/filter';
import { EventEmitter } from 'marsdb';
import jwt from 'jsonwebtoken';
import * as MarsAccount from './index';


// Internals
const TOKEN_EXPIERS_IN = 3 * 30 * 24 * 60 * 60; // 3 months in sec

/**
 * Manager for dealing with creating/updating of user object
 * and to authorize DDP connection.
 */
export default class AccountManager extends EventEmitter {
  constructor(secretKey) {
    super();
    this._secretKey = secretKey;
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
    conn.data.userId = userId;
    conn.subManager.updateSubscriptions();
    this.emit('user:authorized', userId);

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
          newUserObj._id = MarsAccount.users().idGenerator();
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
        jwt.verify(token, this._secretKey);
        return token !== usedToken;
      } catch (err) {
        return false;
      }
    });

    const token = jwt.sign({ userId }, this._secretKey,
      { expiresIn: TOKEN_EXPIERS_IN });
    validTokens.push(token);

    return { validTokens, token };
  }
}
