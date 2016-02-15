'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.configure = configure;
exports.addOAuthStrategy = addOAuthStrategy;
exports.listenUserCreate = listenUserCreate;
exports.listenEmailVerify = listenEmailVerify;
exports.users = users;

var _invariant = require('invariant');

var _invariant2 = _interopRequireDefault(_invariant);

var _marsdb = require('marsdb');

var _OAuthLoginManager = require('./OAuthLoginManager');

var _OAuthLoginManager2 = _interopRequireDefault(_OAuthLoginManager);

var _BasicLoginManager = require('./BasicLoginManager');

var _BasicLoginManager2 = _interopRequireDefault(_BasicLoginManager);

var _AccountManager = require('./AccountManager');

var _AccountManager2 = _interopRequireDefault(_AccountManager);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Internals
var _oauthManager = null;
var _basicManager = null;
var _accManager = null;
var _usersCollection = null;

/**
 * Configure accounts support for mars-sync stack.
 * @param  {Express|Connect}  options.middlewareApp
 * @param  {String}           options.rootUrl
 * @param  {Collection}       options.usersColl
 */
function configure(_ref) {
  var middlewareApp = _ref.middlewareApp;
  var rootUrl = _ref.rootUrl;
  var usersColl = _ref.usersColl;
  var secretKey = _ref.secretKey;
  var smtpUrl = _ref.smtpUrl;

  (0, _invariant2.default)(middlewareApp, 'AccountManager.configure(...): you need to pass express/connect app ' + 'to MarsSync.configure() `middlewareApp` field');

  _usersCollection = usersColl || new _marsdb.Collection('users');
  _accManager = new _AccountManager2.default(secretKey, smtpUrl);
  _oauthManager = new _OAuthLoginManager2.default(_accManager, middlewareApp, rootUrl);
  _basicManager = new _BasicLoginManager2.default(_accManager, middlewareApp, rootUrl);
}

/**
 * Adds new OAuth authentication strategy (Passport.JS).
 * Given funtion must to return a Passport.js oauth startegy.
 * Function is executed with two arguments: callbackUrl and
 * authCallback. Use it to create a strategy object.
 * @param {String} provider
 * @param {Function} strategyCreatorFn
 */
function addOAuthStrategy(provider, strategyCreatorFn) {
  (0, _invariant2.default)(_oauthManager, 'addOAuthStrategy(...): no OAuth login manager found. Did you pass ' + 'AccountManager to `managers` field of `MarsSync.configure()`?');

  _oauthManager.addStrategy(provider, strategyCreatorFn);
}

/**
 * Listen for new user create event. Given callback
 * will be executed with user object as first argument.
 * You can change user object, changed object will be saved.
 * @param  {Function} handlerFn
 */
function listenUserCreate(handlerFn) {
  _accManager.on('user:create', handlerFn);
}

function listenEmailVerify(handlerFn) {
  _accManager.on('user:email:verify', handlerFn);
}

/**
 * Returns users collection
 * @return {Collection}
 */
function users() {
  return _usersCollection;
}