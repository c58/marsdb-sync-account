import invariant from 'invariant';
import { Collection } from 'marsdb';
import OAuthLoginManager from './OAuthLoginManager';
import BasicLoginManager from './BasicLoginManager';
import AccountManager from './AccountManager';


// Internals
let _oauthManager = null;
let _basicManager = null;
let _accManager = null;
let _usersCollection = null;

/**
 * Configure accounts support for mars-sync stack.
 * @param  {Express|Connect}  options.middlewareApp
 * @param  {String}           options.rootUrl
 * @param  {Collection}       options.usersColl
 */
export function configure(
  { middlewareApp, rootUrl, usersColl, secretKey, smtpUrl }
) {
  invariant(
    middlewareApp,
    'AccountManager.configure(...): you need to pass express/connect app ' +
    'to MarsSync.configure() `middlewareApp` field'
  );

  _usersCollection = usersColl || new Collection('users');
  _accManager = new AccountManager(secretKey, smtpUrl);
  _oauthManager = new OAuthLoginManager(_accManager, middlewareApp, rootUrl);
  _basicManager = new BasicLoginManager(_accManager, middlewareApp, rootUrl);
}

/**
 * Adds new OAuth authentication strategy (Passport.JS).
 * Given funtion must to return a Passport.js oauth startegy.
 * Function is executed with two arguments: callbackUrl and
 * authCallback. Use it to create a strategy object.
 * @param {String} provider
 * @param {Function} strategyCreatorFn
 */
export function addOAuthStrategy(provider, strategyCreatorFn) {
  invariant(
    _oauthManager,
    'addOAuthStrategy(...): no OAuth login manager found. Did you pass ' +
    'AccountManager to `managers` field of `MarsSync.configure()`?'
  );

  _oauthManager.addStrategy(provider, strategyCreatorFn);
}

/**
 * Listen for new user create event. Given callback
 * will be executed with user object as first argument.
 * You can change user object, changed object will be saved.
 * @param  {Function} handlerFn
 */
export function listenUserCreate(handlerFn) {
  _accManager.on('user:create', handlerFn);
}

export function listenEmailVerify(handlerFn) {
  _accManager.on('user:email:verify', handlerFn);
}

/**
 * Returns users collection
 * @return {Collection}
 */
export function users() {
  return _usersCollection;
}
