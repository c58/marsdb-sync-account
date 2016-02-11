import invariant from 'invariant';
import { Collection, EventEmitter } from 'marsdb';


// Internals
const _emitter = new EventEmitter();
let _oauthManager = null;
let _basicManager = null;
let _usersCollection = null;

/**
 * Configure accounts support for mars-sync stack.
 * @param  {Express|Connect}  options.middlewareApp
 * @param  {String}           options.rootUrl
 * @param  {Collection}       options.usersColl
 */
export function configure({ middlewareApp, rootUrl, usersColl }) {
  invariant(
    middlewareApp,
    'AccountManager.configure(...): you need to pass express/connect app ' +
    'to MarsSync.configure() `middlewareApp` field'
  );

  _usersCollection = usersColl || new Collection('users');
  _oauthManager = new OAuthLoginManager(_emitter, middlewareApp, rootUrl);
  _basicLogin = new BasicLoginManager(_emitter, middlewareApp, rootUrl);
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
 * Listen for new user created event. Given callback
 * will be executed with user object as first argument
 * @param  {Function} handlerFn
 */
export function listenUserCreated(handlerFn) {
  _emitter.on('user:created', handlerFn);
}

/**
 * Returns users collection
 * @return {Collection}
 */
export function users() {
  return _usersCollection;
}
