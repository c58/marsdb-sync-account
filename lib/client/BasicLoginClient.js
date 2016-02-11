import { EJSON } from 'marsdb';
import MarsSync from 'marsdb-sync-client';


// Internals
const _haveLocalstorage = typeof localStorage !== 'undefined' || null;
const _tokenKey = 'auth.login.token';
const _userIdKey = 'auth.login.id';

/**
 * General methods for logging in the client
 */
export default class BasicLoginClient {

  /**
   * Login user with username and password
   * @param  {String} username
   * @param  {String} password
   * @return {Promise}
   */
  login(username, password) {
    return MarsSync.call('/auth/basic/login', username, password)
      .then(this._handleLoginResponse, this._handleLoginError);
  }

  /**
   * Logout the user
   */
  logout() {
    MarsSync.call('/auth/basic/logout');
    this._unsetLoginData();
  }

  /**
   * Register the user with given username and password
   * and logg them in
   * @param  {String} username
   * @param  {String} password
   * @return {Promise}
   */
  register(username, password) {
    return MarsSync.call('/auth/basic/register', username, password)
      .then(this._handleLoginResponse, this._handleLoginError);
  }

  /**
   * Restore login session with saved in a localstorage
   * login token
   * @return {Promise}
   */
  restoreLogin() {
    // Wrap with promise for errors handling
    // (via rejection of the promise)
    return Promise.resolve().then(() => {
      const token = this._getRestoreLoginToken();
      if (token) {
        return MarsSync.call('/auth/token/login', token);
      } else {
        throw new Error('No login toke found');
      }
    }).then(this._handleLoginResponse, this._handleLoginError);
  }

  /**
   * Return previous successfully logged in user id
   * @return {String}
   */
  getSavedUserId() {
    return _haveLocalstorage && localStorage.get(_userIdKey);
  }

  _getRestoreLoginToken() {
    const tokenObjStr = _haveLocalstorage && localStorage.get(_tokenKey);
    if (tokenObjStr) {
      const tokenObj = EJSON.parse(tokenObjStr)
      if (tokenObj && tokenObj.expires && tokenObj.expires > new Date()) {
        return tokenObj.token;
      }
    }
  }

  _unsetLoginData = () => {
    if (_haveLocalstorage) {
      localStorage.remove(_tokenKey);
      localStorage.remove(_userIdKey);
    }
  };

  _handleLoginResponse = ({ userId, token, tokenExpires }) => {
    if (_haveLocalstorage) {
      localStorage.set(_tokenKey, EJSON.stringify({ token, expires })),
      localStorage.set(_userIdKey, userId);
    }
    return userId;
  };

  _handleLoginError = (err) => {
    this._unsetLoginData();
    throw err;
  };
}
