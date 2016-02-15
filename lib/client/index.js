import OAuthLoginClient from './OAuthLoginClient';
import BasicLoginClient from './BasicLoginClient';
const EventEmitter = typeof window !== 'undefined' && window.Mars
  ? window.Mars.EventEmitter : require('marsdb').EventEmitter;
const MarsClient = typeof window !== 'undefined' && window.Mars
  ? window.Mars.Meteor : require('marsdb-sync-client');


// Internals
let _basicLogin = null;
let _oauthLogin = null;
let _updateUserEmitter = null;

export function _handleSuccessLogin(userId) {
  _updateUserEmitter.emit('change', userId);
  return userId;
}

export function _handleFailLogin(err) {
  _updateUserEmitter.emit('change', null);
  throw err;
}

class RestoreLoginManager {
  constructor(ddpConn) {
    ddpConn.on('status:connected', (reconnected) => {
      if (reconnected) {
        restoreLogin();
      }
    });
  }
}

/**
 * Configure Mars stack to use Accounts
 * @param  {Object} options
 */
export function configure(options = {}) {
  MarsClient.addManager(RestoreLoginManager);
  _basicLogin = new BasicLoginClient();
  _oauthLogin = new OAuthLoginClient();
  _updateUserEmitter = new EventEmitter();
  restoreLogin();
}

/**
 * Return a cursor that returns current logged in user object,
 * retrived from given collection. The cursor may resolve undefined
 * if user is not logged in. It also resolve user object optimistically
 * using previous successfully logged in user id.
 * @param  {Collection} coll
 * @return {CursorObservable}
 */
export function currentUser(coll) {
  const userCursor = coll.find({_id: _basicLogin.getSavedUserId()});
  _updateUserEmitter.on('change', (userId) => {
    userCursor.find({_id: userId});
    userCursor.update();
  });
  return userCursor;
}

/**
 * Logout current logged in user
 */
export function logout() {
  _basicLogin.logout();
  _handleSuccessLogin(null);
}

/**
 * Login user with saved in localStorage token
 * @return {Promise}
 */
export function restoreLogin() {
  return _basicLogin.restoreLogin()
    .then(_handleSuccessLogin, _handleFailLogin);
}

/**
 * Regular login via username and password. Returns a Promise
 * that will be resolved or rejected depends on success status
 * of the login
 * @param  {String} username
 * @param  {String} password
 * @return {Promise}
 */
export function loginBasic(username, password) {
  return _basicLogin.login(username, password)
    .then(_handleSuccessLogin, _handleFailLogin);
}

/**
 * Register the user with given email and password.
 * If registered successfully the user will be also
 * registered and promise resolved as any other login method.
 * @param  {String} email
 * @param  {String} password
 * @return {Promise}
 */
export function register(email, password) {
  return _basicLogin.register(email, password)
    .then(_handleSuccessLogin, _handleFailLogin);
}

/**
 * Login via provided OAuth service. Returns a Promise
 * that will be resolved or rejected depends on success status
 * of the login.
 * @param  {String} serviceName
 * @return {Promise}
 */
export function loginOAuth(serviceName) {
  return _oauthLogin.login(serviceName)
    .then(_handleSuccessLogin, _handleFailLogin);
}

/**
 * Login via OAuth access token given from som client-side OAuth
 * process (mobile app native SDK, for example). Returns a Promise
 * that will be resolved or rejected depends on success status
 * @param  {String} serviceName
 * @param  {String} accessToken
 * @return {Promise}
 */
export function loginOAuthToken(serviceName, accessToken) {
  return _oauthLogin.loginWithToken(serviceName, accessToken)
    .then(_handleSuccessLogin, _handleFailLogin);
}
