'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _invariant = require('invariant');

var _invariant2 = _interopRequireDefault(_invariant);

var _marsdbSyncServer = require('marsdb-sync-server');

var _marsdb = require('marsdb');

var _passport = require('passport');

var _passport2 = _interopRequireDefault(_passport);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// Internals
var _urlPrefix = '/_auth/oauth';
var _popupResponseTemplate = _fs2.default.readFileSync(_path2.default.join(__dirname, '..', '..', 'resources', 'end_of_popup_response.html')).toString();

/**
 * OAuth login manager. It uses Passport.js for passing OAuth
 * auth process and wraps any kind of Passport.js OAuth strategy.
 * It can be used for browser-style authentication (with popup, for example),
 * or for authenticating some accessToken for a provider (given by native
 * mobile SDKs, for example).
 */

var OAuthLoginManager = function () {
  function OAuthLoginManager(accManager, middlewareApp, rootUrl) {
    var _this = this;

    _classCallCheck(this, OAuthLoginManager);

    this._handleSecretLogin = function (ctx, credentialToken, secret) {
      var credential = _this._credentials[credentialToken];
      delete _this._credentials[credentialToken];

      if (credential && credential.credentialSecret === secret) {
        return _this._accManager.authConnection(ctx.connection, credential.userId);
      } else {
        throw new Error('No credential found with given token');
      }
    };

    this._handleTokenLogin = function (ctx, provider, accessToken) {
      (0, _invariant2.default)(_this._providerOpts[provider], 'Provider %s is not supported', provider);

      var reqMock = { query: { access_token: accessToken } };
      return new Promise(function (resolve, reject) {
        _passport2.default.authenticate(provider, function (err, user, info) {
          if (!err && user) {
            resolve(_this._accManager.authConnection(ctx.connection, user._id));
          } else {
            reject(err);
          }
        })(reqMock, {});
      });
    };

    this._handleOAuthLogin = function (accessToken, refreshToken, profile, done) {
      delete profile._raw;
      delete profile._json;
      _this._accManager.getOrCreateAccByProfile(profile).then(function (user) {
        return done(null, user);
      }, done);
    };

    this._handleGETPopup = function (req, res, next) {
      var _req$params = req.params;
      var provider = _req$params.provider;
      var credentialToken = _req$params.credentialToken;

      (0, _invariant2.default)(_this._providerOpts[provider], 'Provider %s is not supported', provider);

      var b64Token = new Buffer(credentialToken).toString('base64');
      var options = _extends({}, _this._providerOpts[provider], {
        session: false,
        state: b64Token
      });

      _passport2.default.authenticate(provider, options)(req, res, next);
    };

    this._handleGETPopupCallback = function (req, res, next) {
      var provider = req.params.provider;
      var credentialToken = new Buffer(req.query.state, 'base64').toString('binary');

      _passport2.default.authenticate(provider, function (err, user, info) {
        var config = {};
        if (!err && user && credentialToken) {
          var userId = user._id;
          var credentialSecret = _marsdb.Random.default().id(20);
          config.setCredentialToken = true;
          config.credentialSecret = credentialSecret;
          config.credentialToken = credentialToken;

          _this._credentials[credentialToken] = { credentialSecret: credentialSecret, userId: userId };
          setTimeout(function () {
            return delete _this._credentials[credentialToken];
          }, 5000);
        }

        var tplWithConfig = _popupResponseTemplate.replace('##CONFIG##', JSON.stringify(config));

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.write(tplWithConfig);
        res.end();
      })(req, res, next);
    };

    this._accManager = accManager;
    this._rootUrl = rootUrl;
    this._credentials = {};
    this._providerOpts = {};

    (0, _marsdbSyncServer.method)(_urlPrefix + '/secret/login', this._handleSecretLogin);
    (0, _marsdbSyncServer.method)(_urlPrefix + '/token/login', this._handleTokenLogin);
    middlewareApp.get(_urlPrefix + '/popup/:provider/callback', this._handleGETPopupCallback);
    middlewareApp.get(_urlPrefix + '/popup/:provider/:credentialToken', this._handleGETPopup);
  }

  /**
   * Adds Passport.OAuth strategy by given provider name and
   * strategy generator function. The function will be called with
   * callbackURL and callback function arguments to pass to a strategy
   * object.
   * If provider with given name already registered it rises an exception.
   * @param {String}   provider
   * @param {Function} strategyCreatorFn
   */


  _createClass(OAuthLoginManager, [{
    key: 'addStrategy',
    value: function addStrategy(provider, strategyCreatorFn) {
      var options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

      (0, _invariant2.default)(!this._providerOpts[provider], 'Provider with name "%s" already exists', provider);

      this._providerOpts[provider] = options;
      var cbUrlPrefix = '' + this._rootUrl + _urlPrefix;
      var callbackUrl = cbUrlPrefix + '/popup/' + provider + '/callback';
      var callback = this._handleOAuthLogin;
      var strategy = strategyCreatorFn(callbackUrl, callback);
      _passport2.default.use(provider, strategy);
    }

    /**
     * Login user with given credential token and secret. The secret
     * comes to a client from popup, generated by `_handleGETPopupCallback`
     * method. If no credential token with given secret found then
     * it rises an exception. Otherwise it returns a promise that will be
     * resolved with object with `userId`, `token` and `expires` fields.
     * @param  {Object} ctx
     * @param  {String} credentialToken
     * @param  {String} secret
     * @return {Promise}
     */


    /**
     * Login user with given accessToken for given provider.
     * If no provider with given name exists it reses an exception.
     * Returns a promise that will be resolved when will be successfully
     * authenticated. Resolved object consists of `userId`, `token` and `expores`
     * fields.
     * @param  {Object} ctx
     * @param  {String} provider
     * @param  {String} accessToken
     * @return {Promise}
     */


    /**
     * Try to get user object by given OAuth user profile
     * and on fail creates new user.
     * @param  {String}   accessToken
     * @param  {String}   refreshToken
     * @param  {Object}   profile
     * @param  {Function} done
     */


    /**
     * Creates Base64 encoded credentialToken for sending it
     * as a `state` field of an OAuth request and invoke
     * passport.authenticate for given provider.
     * If no provider with given name registered then it rises
     * an exception
     * @param  {Requrst}  req
     * @param  {Response} res
     * @param  {Function} next
     */


    /**
     * Handle return from OAuth service to our callback.
     * If no errors then credentialToken will be set with
     * gotten user id for authenticating the connection.
     * If no authentication of the connection happened after 5sec,
     * then credential will be removed.
     * In any case send an HTML page for setting credential info
     * (credential secret) in the parent window.
     * @param  {Request}   req
     * @param  {Response}  res
     * @param  {Function}  next
     */

  }]);

  return OAuthLoginManager;
}();

exports.default = OAuthLoginManager;