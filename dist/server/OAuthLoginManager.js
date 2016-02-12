'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _bind2 = require('fast.js/function/bind');

var _bind3 = _interopRequireDefault(_bind2);

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

var _index = require('./index');

var MarsAccount = _interopRequireWildcard(_index);

var _AbstractLoginManager2 = require('./AbstractLoginManager');

var _AbstractLoginManager3 = _interopRequireDefault(_AbstractLoginManager2);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

// Internals
var _urlPrefix = '/_auth/oauth';
var _popupResponseTemplate = _fs2.default.readFileSync(_path2.default.join(__dirname, 'resources', 'end_of_popup_response.html')).toString();

/**
 * Listen to OAuth login methods
 */

var OAuthLoginManager = function (_AbstractLoginManager) {
  _inherits(OAuthLoginManager, _AbstractLoginManager);

  function OAuthLoginManager(eventBus, middlewareApp, rootUrl) {
    _classCallCheck(this, OAuthLoginManager);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(OAuthLoginManager).call(this, eventBus, middlewareApp, rootUrl));

    _this._handleSecretLogin = function (ctx, credentialToken, secret) {
      var savedCred = _this._credentials[credentialToken];
      delete _this._credentials[credentialToken];

      if (savedCred && savedCred.credentialSecret === secret) {
        return _this._handleUserLoggedIn(ctx, savedCred.userId);
      } else {
        throw new Error('No credential found with given token');
      }
    };

    _this._handleTokenLogin = function (ctx, provider, accessToken) {
      var reqMock = { query: { access_token: accessToken } };
      return new Promise(function (resolve, reject) {
        _passport2.default.authenticate(provider, function (err, user, info) {
          if (!err && user) {
            resolve(_this._handleUserLoggedIn(ctx, user._id));
          } else {
            reject(err);
          }
        })(reqMock, {});
      });
    };

    _this._handleOAuthLogin = function (accessToken, refreshToken, profile, done) {
      var provider = profile.provider;

      delete profile._raw;
      delete profile._json;

      MarsAccount.users().update(_defineProperty({}, 'service.' + provider + '.id', profile.id), { $setOnInsert: { service: _defineProperty({}, provider, profile) } }, { upsert: true }).then(function (_ref) {
        var original = _ref.original;
        var updated = _ref.updated;

        var user = updated[0];
        if (original[0] === null) {
          _this._handleUserCreated(user);
        }
        done(null, user);
      }, done);
    };

    _this._handleGETPopup = function (req, res, next) {
      var _req$params = req.params;
      var provider = _req$params.provider;
      var credentialToken = _req$params.credentialToken;

      (0, _invariant2.default)(_this._providerOpts[provider], 'Provider %s is not supported', provider);

      var options = _extends({}, _this._providerOpts[provider], {
        session: false,
        state: new Buffer(_marsdb.EJSON.stringify({ credentialToken: credentialToken })).toString('base64')
      });

      _passport2.default.authenticate(provider, options)(req, res, next);
    };

    _this._handleGETPopupCallback = function (req, res, next) {
      var provider = req.params.provider;

      var _EJSON$parse = _marsdb.EJSON.parse(new Buffer(req.query.state, 'base64').toString('binary'));

      var credentialToken = _EJSON$parse.credentialToken;


      _passport2.default.authenticate(provider, function (err, user, info) {
        // Configure response for logged in user
        var config = {};
        if (!err && user) {
          var userId = user._id;
          var credentialSecret = _marsdb.Random.default().id(20);
          config.setCredentialToken = true;
          config.credentialSecret = credentialSecret;
          config.credentialToken = credentialToken;

          // Set token for authentication and delete it after 5sec
          _this._credentials[credentialToken] = { credentialSecret: credentialSecret, userId: userId };
          setTimeout(function () {
            return delete _this._credentials[credentialToken];
          }, 5000);
        }

        // Create HTML response with created config
        var tplWithConfig = _popupResponseTemplate.replace('##CONFIG##', JSON.stringify(config));

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.write(tplWithConfig);
        res.end();
      })(req, res, next);
    };

    _this._credentials = {};
    _this._providerOpts = {};

    (0, _marsdbSyncServer.method)(_urlPrefix + '/secret/login', _this._handleSecretLogin);
    (0, _marsdbSyncServer.method)(_urlPrefix + '/token/login', _this._handleTokenLogin);
    middlewareApp.get(_urlPrefix + '/popup/:provider/callback', _this._handleGETPopupCallback);
    middlewareApp.get(_urlPrefix + '/popup/:provider/:credentialToken', _this._handleGETPopup);
    return _this;
  }

  _createClass(OAuthLoginManager, [{
    key: 'addStrategy',
    value: function addStrategy(provider, strategyCreatorFn) {
      var options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

      this._providerOpts[provider] = options;
      var cbUrlPrefix = '' + this._rootUrl + _urlPrefix;
      var callbackUrl = cbUrlPrefix + '/popup/' + provider + '/callback';
      var callback = this._handleOAuthLogin;
      var strategy = strategyCreatorFn(callbackUrl, callback);
      _passport2.default.use(provider, strategy);
    }
  }]);

  return OAuthLoginManager;
}(_AbstractLoginManager3.default);

exports.default = OAuthLoginManager;