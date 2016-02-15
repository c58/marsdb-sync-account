'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports._handleSuccessLogin = _handleSuccessLogin;
exports._handleFailLogin = _handleFailLogin;
exports.configure = configure;
exports.currentUser = currentUser;
exports.logout = logout;
exports.restoreLogin = restoreLogin;
exports.loginBasic = loginBasic;
exports.register = register;
exports.loginOAuth = loginOAuth;
exports.loginOAuthToken = loginOAuthToken;

var _OAuthLoginClient = require('./OAuthLoginClient');

var _OAuthLoginClient2 = _interopRequireDefault(_OAuthLoginClient);

var _BasicLoginClient = require('./BasicLoginClient');

var _BasicLoginClient2 = _interopRequireDefault(_BasicLoginClient);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var EventEmitter = typeof window !== 'undefined' && window.Mars ? window.Mars.EventEmitter : require('marsdb').EventEmitter;
var MarsClient = typeof window !== 'undefined' && window.Mars ? window.Mars.Meteor : require('marsdb-sync-client');

// Internals
var _basicLogin = null;
var _oauthLogin = null;
var _updateUserEmitter = null;

function _handleSuccessLogin(userId) {
  _updateUserEmitter.emit('change', userId);
  return userId;
}

function _handleFailLogin(err) {
  _updateUserEmitter.emit('change', null);
  throw err;
}

var RestoreLoginManager = function RestoreLoginManager(ddpConn) {
  _classCallCheck(this, RestoreLoginManager);

  ddpConn.on('status:connected', function (reconnected) {
    if (reconnected) {
      restoreLogin();
    }
  });
};

/**
 * Configure Mars stack to use Accounts
 * @param  {Object} options
 */


function configure() {
  var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

  MarsClient.addManager(RestoreLoginManager);
  _basicLogin = new _BasicLoginClient2.default();
  _oauthLogin = new _OAuthLoginClient2.default();
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
  return _basicLogin.restoreLogin().then(_handleSuccessLogin, _handleFailLogin);
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
  return _basicLogin.login(username, password).then(_handleSuccessLogin, _handleFailLogin);
}

/**
 * Register the user with given email and password.
 * If registered successfully the user will be also
 * registered and promise resolved as any other login method.
 * @param  {String} email
 * @param  {String} password
 * @return {Promise}
 */
function register(email, password) {
  return _basicLogin.register(email, password).then(_handleSuccessLogin, _handleFailLogin);
}

/**
 * Login via provided OAuth service. Returns a Promise
 * that will be resolved or rejected depends on success status
 * of the login.
 * @param  {String} serviceName
 * @return {Promise}
 */
function loginOAuth(serviceName) {
  return _oauthLogin.login(serviceName).then(_handleSuccessLogin, _handleFailLogin);
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
  return _oauthLogin.loginWithToken(serviceName, accessToken).then(_handleSuccessLogin, _handleFailLogin);
}