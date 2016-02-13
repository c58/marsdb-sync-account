'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.currentUser = currentUser;
exports.logout = logout;
exports.restoreLogin = restoreLogin;
exports.loginBasic = loginBasic;
exports.register = register;
exports.loginOAuth = loginOAuth;
exports.loginOAuthToken = loginOAuthToken;

var _marsdb = require('marsdb');

var _OAuthLoginClient = require('./OAuthLoginClient');

var _OAuthLoginClient2 = _interopRequireDefault(_OAuthLoginClient);

var _BasicLoginClient = require('./BasicLoginClient');

var _BasicLoginClient2 = _interopRequireDefault(_BasicLoginClient);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Internals
var _basicLogin = new _BasicLoginClient2.default();
var _oauthLogin = new _OAuthLoginClient2.default();
var _updateUserEmitter = new _marsdb.EventEmitter();
var _handleSuccessLogin = function _handleSuccessLogin(userId) {
  _updateUserEmitter.emit('change', userId);
  return userId;
};

/**
 * Return a cursor that returns current logged in user object,
 * retrived from given collection. The cursor may resolve undefined
 * if user is not logged in. It also resolve user object optimistically
 * using previous successfully logged in user id.
 * @param  {Collection} coll
 * @return {CursorObservable}
 */
function currentUser(coll) {
  var userCursor = coll.find({ _id: _basicLogin.getSavedUserId() });
  _updateUserEmitter.on('change', function (userId) {
    userCursor.find({ _id: userId });
    userCursor.update();
  });
  return userCursor;
}

/**
 * Logout current logged in user
 */
function logout() {
  _basicLogin.logout();
  _handleSuccessLogin(null);
}

/**
 * Login user with saved in localStorage token
 * @return {Promise}
 */
function restoreLogin() {
  return _basicLogin.restoreLogin().then(_handleSuccessLogin);
}

/**
 * Regular login via username and password. Returns a Promise
 * that will be resolved or rejected depends on success status
 * of the login
 * @param  {String} username
 * @param  {String} password
 * @return {Promise}
 */
function loginBasic(username, password) {
  return _basicLogin.login(username, password).then(_handleSuccessLogin);
}

/**
 * Register the user with given username and password.
 * If registered successfully the user will be also
 * registered and promise resolved as any other login method.
 * @param  {String} username
 * @param  {String} password
 * @return {Promise}
 */
function register(username, password) {
  return _basicLogin.register(username, password).then(_handleSuccessLogin);
}

/**
 * Login via provided OAuth service. Returns a Promise
 * that will be resolved or rejected depends on success status
 * of the login.
 * @param  {String} serviceName
 * @return {Promise}
 */
function loginOAuth(serviceName) {
  return _oauthLogin.login(serviceName).then(_handleSuccessLogin);
}

/**
 * Login via OAuth access token given from som client-side OAuth
 * process (mobile app native SDK, for example). Returns a Promise
 * that will be resolved or rejected depends on success status
 * @param  {String} serviceName
 * @param  {String} accessToken
 * @return {Promise}
 */
function loginOAuthToken(serviceName, accessToken) {
  return _oauthLogin.loginWithToken(serviceName, accessToken).then(_handleSuccessLogin);
}