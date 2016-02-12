'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.configure = configure;
exports.addOAuthStrategy = addOAuthStrategy;
exports.listenUserCreated = listenUserCreated;
exports.users = users;

var _invariant = require('invariant');

var _invariant2 = _interopRequireDefault(_invariant);

var _marsdb = require('marsdb');

var _OAuthLoginManager = require('./OAuthLoginManager');

var _OAuthLoginManager2 = _interopRequireDefault(_OAuthLoginManager);

var _BasicLoginManager = require('./BasicLoginManager');

var _BasicLoginManager2 = _interopRequireDefault(_BasicLoginManager);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Internals
var _emitter = new _marsdb.EventEmitter();
var _oauthManager = null;
var _basicManager = null;
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

  (0, _invariant2.default)(middlewareApp, 'AccountManager.configure(...): you need to pass express/connect app ' + 'to MarsSync.configure() `middlewareApp` field');

  _usersCollection = usersColl || new _marsdb.Collection('users');
  _oauthManager = new _OAuthLoginManager2.default(_emitter, middlewareApp, rootUrl);
  _basicManager = new _BasicLoginManager2.default(_emitter, middlewareApp, rootUrl);
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
 * Listen for new user created event. Given callback
 * will be executed with user object as first argument
 * @param  {Function} handlerFn
 */
function listenUserCreated(handlerFn) {
  _emitter.on('user:created', handlerFn);
}

/**
 * Returns users collection
 * @return {Collection}
 */
function users() {
  return _usersCollection;
}