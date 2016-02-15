import sha256 from 'js-sha256';
import * as MarsSync from 'marsdb-sync-client';
import { BASIC_LOGIN_ERR } from '../common/ErrorCodes';


// Internals
export function _createPasswordObject(passStr) {
  return {
    algorithm: 'sha-256',
    digest: sha256(passStr),
  }
}

// Constants
const _haveLocalstorage = typeof localStorage !== 'undefined' || null;
const _tokenKey = 'auth.login.token';
const _userIdKey = 'auth.login.id';

/**
 * Email/Password login clint
 */
export default class BasicLoginClient {

  /**
   * Login user with email and password
   * @param  {String} email
   * @param  {String} password
   * @return {Promise}
   */
  login(email, password) {
    const passObj = _createPasswordObject(password);
    return MarsSync.call('/auth/basic/login', email, passObj)
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
  register(email, password) {
    const passObj = _createPasswordObject(password);
    return MarsSync.call('/auth/basic/register', email, passObj)
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
        return MarsSync.apply('/auth/token/login', [token],
          {retryOnDisconnect: true});
      } else {
        throw new Error('No login tokek found');
      }
    }).then(this._handleLoginResponse, this._handleLoginError);
  }

  /**
   * Return previous successfully logged in user id
   * @return {String}
   */
  getSavedUserId() {
    return _haveLocalstorage && localStorage.getItem(_userIdKey);
  }

  _getRestoreLoginToken() {
    return _haveLocalstorage && localStorage.getItem(_tokenKey);
  }

  _unsetLoginData = () => {
    if (_haveLocalstorage) {
      localStorage.removeItem(_tokenKey);
      localStorage.removeItem(_userIdKey);
    }
  };

  _handleLoginResponse = ({ userId, token }) => {
    if (_haveLocalstorage) {
      localStorage.setItem(_tokenKey, token);
      localStorage.setItem(_userIdKey, userId);
    }
    return userId;
  };

  _handleLoginError = (err) => {
    this._unsetLoginData();
    throw err;
  };
}
