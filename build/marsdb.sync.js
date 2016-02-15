(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}(g.Mars || (g.Mars = {})).Account = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

exports._createPasswordObject = _createPasswordObject;

var _jsSha = require('js-sha256');

var _jsSha2 = _interopRequireDefault(_jsSha);

var _marsdbSyncClient = require('marsdb-sync-client');

var MarsSync = _interopRequireWildcard(_marsdbSyncClient);

var _ErrorCodes = require('../common/ErrorCodes');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// Internals
function _createPasswordObject(passStr) {
  return {
    algorithm: 'sha-256',
    digest: (0, _jsSha2.default)(passStr)
  };
}

// Constants
var _haveLocalstorage = typeof localStorage !== 'undefined' || null;
var _tokenKey = 'auth.login.token';
var _userIdKey = 'auth.login.id';

/**
 * Email/Password login clint
 */

var BasicLoginClient = function () {
  function BasicLoginClient() {
    var _this = this;

    _classCallCheck(this, BasicLoginClient);

    this._unsetLoginData = function () {
      if (_haveLocalstorage) {
        localStorage.removeItem(_tokenKey);
        localStorage.removeItem(_userIdKey);
      }
    };

    this._handleLoginResponse = function (_ref) {
      var userId = _ref.userId;
      var token = _ref.token;

      if (_haveLocalstorage) {
        localStorage.setItem(_tokenKey, token);
        localStorage.setItem(_userIdKey, userId);
      }
      return userId;
    };

    this._handleLoginError = function (err) {
      _this._unsetLoginData();
      throw err;
    };
  }

  _createClass(BasicLoginClient, [{
    key: 'login',


    /**
     * Login user with email and password
     * @param  {String} email
     * @param  {String} password
     * @return {Promise}
     */
    value: function login(email, password) {
      var passObj = _createPasswordObject(password);
      return MarsSync.call('/auth/basic/login', email, passObj).then(this._handleLoginResponse, this._handleLoginError);
    }

    /**
     * Logout the user
     */

  }, {
    key: 'logout',
    value: function logout() {
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

  }, {
    key: 'register',
    value: function register(email, password) {
      var passObj = _createPasswordObject(password);
      return MarsSync.call('/auth/basic/register', email, passObj).then(this._handleLoginResponse, this._handleLoginError);
    }

    /**
     * Restore login session with saved in a localstorage
     * login token
     * @return {Promise}
     */

  }, {
    key: 'restoreLogin',
    value: function restoreLogin() {
      var _this2 = this;

      // Wrap with promise for errors handling
      // (via rejection of the promise)
      return Promise.resolve().then(function () {
        var token = _this2._getRestoreLoginToken();
        if (token) {
          return MarsSync.apply('/auth/token/login', [token], { retryOnDisconnect: true });
        } else {
          throw new Error('No login tokek found');
        }
      }).then(this._handleLoginResponse, this._handleLoginError);
    }

    /**
     * Return previous successfully logged in user id
     * @return {String}
     */

  }, {
    key: 'getSavedUserId',
    value: function getSavedUserId() {
      return _haveLocalstorage && localStorage.getItem(_userIdKey);
    }
  }, {
    key: '_getRestoreLoginToken',
    value: function _getRestoreLoginToken() {
      return _haveLocalstorage && localStorage.getItem(_tokenKey);
    }
  }]);

  return BasicLoginClient;
}();

exports.default = BasicLoginClient;
},{"../common/ErrorCodes":4,"js-sha256":6,"marsdb-sync-client":undefined}],2:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _marsdb = require('marsdb');

var _marsdbSyncClient = require('marsdb-sync-client');

var MarsSync = _interopRequireWildcard(_marsdbSyncClient);

var _BasicLoginClient2 = require('./BasicLoginClient');

var _BasicLoginClient3 = _interopRequireDefault(_BasicLoginClient2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

// Internals
var _urlPrefix = '/_auth/oauth';
var _isCordova = typeof window !== 'undefined' && !!window.cordova;
var _haveLocalStorage = typeof localStorage !== 'undefined';
var _credentialSecrets = {};
if (typeof window !== 'undefined') {
  window.__handleCredentialSecret = function (token, secret) {
    _credentialSecrets[token] = secret;
  };
}

/**
 * Basic OAuth login strategy implementation
 */

var BasicOAuthLoginClient = function (_BasicLoginClient) {
  _inherits(BasicOAuthLoginClient, _BasicLoginClient);

  function BasicOAuthLoginClient() {
    _classCallCheck(this, BasicOAuthLoginClient);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(BasicOAuthLoginClient).apply(this, arguments));
  }

  _createClass(BasicOAuthLoginClient, [{
    key: 'login',

    /**
     * Login with OAuth by openning popup with form for
     * given service.
     * @return {Promise}
     */
    value: function login(serviceName) {
      var _this2 = this;

      var credentialToken = _marsdb.Random.default().id();
      var serviceUrl = _urlPrefix + '/popup/' + serviceName + '/' + credentialToken;

      return new Promise(function (resolve, reject) {
        _this2._showPopup(serviceUrl, function () {
          var secret = _credentialSecrets[credentialToken] || _haveLocalStorage && localStorage.getItem(credentialToken);
          if (!secret) {
            reject(new Error('No secret for given credential token'));
          } else {
            delete _credentialSecrets[credentialToken];
            if (_haveLocalStorage) {
              localStorage.removeItem(credentialToken);
            }
            MarsSync.call(_urlPrefix + '/secret/login', credentialToken, secret).then(_this2._handleLoginResponse, reject).then(resolve);
          }
        });
      }).then(null, this._handleLoginError);
    }

    /**
     * Login with given accessToken from some login source,
     * like native mobile social SDKs.
     * @return {Promise}
     */

  }, {
    key: 'loginWithToken',
    value: function loginWithToken(serviceName, accessToken) {
      return MarsSync.call(_urlPrefix + '/token/login', serviceName, accessToken).then(this._handleLoginResponse, this._handleLoginError);
    }
  }, {
    key: '_handleCredentialSecret',
    value: function _handleCredentialSecret(credentialToken, secret) {
      _credentialSecrets[credentialToken] = secret;
    }
  }, {
    key: '_showPopup',
    value: function _showPopup(url, callback) {
      throw new Error('Not implemented');
    }
  }]);

  return BasicOAuthLoginClient;
}(_BasicLoginClient3.default);

/**
 * Abstract Implementation of an OAuth service
 * for Browser
 */


var AOAuth_Browser = function (_BasicOAuthLoginClien) {
  _inherits(AOAuth_Browser, _BasicOAuthLoginClien);

  function AOAuth_Browser() {
    _classCallCheck(this, AOAuth_Browser);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(AOAuth_Browser).apply(this, arguments));
  }

  _createClass(AOAuth_Browser, [{
    key: '_showPopup',
    value: function _showPopup(url, callback, dimensions) {
      var _this4 = this;

      // default dimensions that worked well for facebook and google
      var popup = this._openCenteredPopup(url, dimensions && dimensions.width || 650, dimensions && dimensions.height || 331);

      var receiveMessage = function receiveMessage(event) {
        var _event$data$split = event.data.split(':');

        var _event$data$split2 = _slicedToArray(_event$data$split, 2);

        var credentialToken = _event$data$split2[0];
        var credentialSecret = _event$data$split2[1];

        if (credentialToken && credentialSecret) {
          _this4._handleCredentialSecret(credentialToken, credentialSecret);
        }
      };

      var checkPopupOpen = setInterval(function () {
        var popupClosed = undefined;
        try {
          // Fix for #328 - added a second test criteria (popup.closed === undefined)
          // to humour this Android quirk:
          // http://code.google.com/p/android/issues/detail?id=21061
          popupClosed = popup.closed || popup.closed === undefined;
        } catch (e) {
          // For some unknown reason, IE9 (and others?) sometimes (when
          // the popup closes too quickly?) throws 'SCRIPT16386: No such
          // interface supported' when trying to read 'popup.closed'. Try
          // again in 100ms.
          return;
        }

        if (popupClosed) {
          window.removeEventListener('message', receiveMessage);
          clearInterval(checkPopupOpen);
          callback();
        }
      }, 100);

      window.addEventListener('message', receiveMessage, false);
    }
  }, {
    key: '_openCenteredPopup',
    value: function _openCenteredPopup(url, width, height) {
      var screenX = typeof window.screenX !== 'undefined' ? window.screenX : window.screenLeft;
      var screenY = typeof window.screenY !== 'undefined' ? window.screenY : window.screenTop;
      var outerWidth = typeof window.outerWidth !== 'undefined' ? window.outerWidth : document.body.clientWidth;
      var outerHeight = typeof window.outerHeight !== 'undefined' ? window.outerHeight : document.body.clientHeight - 22;

      // Use `outerWidth - width` and `outerHeight - height` for help in
      // positioning the popup centered relative to the current window
      var left = screenX + (outerWidth - width) / 2;
      var top = screenY + (outerHeight - height) / 2;
      var features = 'width=' + width + ',height=' + height + ',left=' + left + ',top=' + top + ',scrollbars=yes';

      var newwindow = window.open(url, 'Login', features);
      //document.domain = this.Utils.domain();

      if (typeof newwindow === 'undefined') {
        // blocked by a popup blocker maybe?
        var err = new Error('The login popup was blocked by the browser');
        err.attemptedUrl = url;
        throw err;
      }

      if (newwindow.focus) {
        newwindow.focus();
      }

      return newwindow;
    }
  }]);

  return AOAuth_Browser;
}(BasicOAuthLoginClient);

/**
 * Abstract Implementation of an OAuth service
 * for Cordova
 */


var AOAuth_Cordova = function (_BasicOAuthLoginClien2) {
  _inherits(AOAuth_Cordova, _BasicOAuthLoginClien2);

  function AOAuth_Cordova() {
    _classCallCheck(this, AOAuth_Cordova);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(AOAuth_Cordova).apply(this, arguments));
  }

  _createClass(AOAuth_Cordova, [{
    key: '_showPopup',


    /**
     * Open a popup window, centered on the screen, and call a callback when it
     * closes.
     * @param url {String} url to show
     * @param callback {Function} Callback function to call on completion. Takes no
     *                            arguments.
     * @param dimensions {optional Object(width, height)} The dimensions of
     *                             the popup. If not passed defaults to something sane.
     */
    value: function _showPopup(url, callback, dimensions) {
      var _this6 = this;

      var fail = function fail(err) {
        callback(new Error('Error from OAuth popup: ' + JSON.stringify(err)));
      };

      // When running on an android device, we sometimes see the
      // `pageLoaded` callback fire twice for the final page in the OAuth
      // popup, even though the page only loads once. This is maybe an
      // Android bug or maybe something intentional about how onPageFinished
      // works that we don't understand and isn't well-documented.
      var oauthFinished = false;

      var pageLoaded = function pageLoaded(event) {
        if (oauthFinished) {
          return;
        }

        if (event.url.indexOf('_oauth') >= 0) {
          var splitUrl = event.url.split('#');
          var hashFragment = splitUrl[1];

          if (!hashFragment) {
            setTimeout(pageLoaded, 100);
            return;
          }

          var credentials = JSON.parse(decodeURIComponent(hashFragment));
          _this6._handleCredentialSecret(credentials.credentialToken, credentials.credentialSecret);

          oauthFinished = true;

          // On iOS, this seems to prevent 'Warning: Attempt to dismiss from
          // view controller <MainViewController: ...> while a presentation
          // or dismiss is in progress'. My guess is that the last
          // navigation of the OAuth popup is still in progress while we try
          // to close the popup. See
          // https://issues.apache.org/jira/browse/CB-2285.
          //
          // XXX Can we make this timeout smaller?
          setTimeout(function () {
            popup.close();
            callback();
          }, 100);
        }
      };

      var onExit = function onExit() {
        popup.removeEventListener('loadstop', pageLoaded);
        popup.removeEventListener('loaderror', fail);
        popup.removeEventListener('exit', onExit);
        if (!oauthFinished) {
          callback(new Error('Login canceled'));
        }
      };

      var popup = window.open(url, '_blank', 'location=yes,hidden=yes,' + 'clearcache=yes,' + 'clearsessioncache=yes');
      popup.addEventListener('loadstop', pageLoaded);
      popup.addEventListener('loaderror', fail);
      popup.addEventListener('exit', onExit);
      popup.show();
    }
  }]);

  return AOAuth_Cordova;
}(BasicOAuthLoginClient);

// Platform specific export


exports.default = _isCordova ? AOAuth_Cordova : AOAuth_Browser;
},{"./BasicLoginClient":1,"marsdb":undefined,"marsdb-sync-client":undefined}],3:[function(require,module,exports){
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
},{"./BasicLoginClient":1,"./OAuthLoginClient":2,"marsdb":undefined,"marsdb-sync-client":undefined}],4:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
/**
 * Error codes for basic login
 * @type {Object}
 */
var BASIC_LOGIN_ERR = exports.BASIC_LOGIN_ERR = {
  WRONG_PASS: 'WRONG_PASS',
  WRONG_EMAIL: 'WRONG_EMAIL',
  INVALID_EMAIL: 'INVALID_EMAIL',
  INVALID_PASS: 'INVALID_PASS',
  USED_EMAIL: 'USED_EMAIL'
};
},{}],5:[function(require,module,exports){
module.exports = require('./dist/client');

},{"./dist/client":3}],6:[function(require,module,exports){
(function (global){
/*
 * js-sha256 v0.3.0
 * https://github.com/emn178/js-sha256
 *
 * Copyright 2014-2015, emn178@gmail.com
 *
 * Licensed under the MIT license:
 * http://www.opensource.org/licenses/MIT
 */
;(function(root, undefined) {
  'use strict';

  var NODE_JS = typeof(module) != 'undefined';
  if(NODE_JS) {
    root = global;
  }
  var TYPED_ARRAY = typeof(Uint8Array) != 'undefined';
  var HEX_CHARS = '0123456789abcdef'.split('');
  var EXTRA = [-2147483648, 8388608, 32768, 128];
  var SHIFT = [24, 16, 8, 0];
  var K =[0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
          0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
          0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
          0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
          0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
          0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
          0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
          0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];

  var blocks = [];

  var sha224 = function(message) {
    return sha256(message, true);
  };

  var sha256 = function(message, is224) {
    var notString = typeof(message) != 'string';
    if(notString && message.constructor == root.ArrayBuffer) {
      message = new Uint8Array(message);
    }

    var h0, h1, h2, h3, h4, h5, h6, h7, block, code, first = true, end = false,
        i, j, index = 0, start = 0, bytes = 0, length = message.length,
        s0, s1, maj, t1, t2, ch, ab, da, cd, bc;

    if(is224) {
      h0 = 0xc1059ed8;
      h1 = 0x367cd507;
      h2 = 0x3070dd17;
      h3 = 0xf70e5939;
      h4 = 0xffc00b31;
      h5 = 0x68581511;
      h6 = 0x64f98fa7;
      h7 = 0xbefa4fa4;
    } else { // 256
      h0 = 0x6a09e667;
      h1 = 0xbb67ae85;
      h2 = 0x3c6ef372;
      h3 = 0xa54ff53a;
      h4 = 0x510e527f;
      h5 = 0x9b05688c;
      h6 = 0x1f83d9ab;
      h7 = 0x5be0cd19;
    }
    block = 0;
    do {
      blocks[0] = block;
      blocks[16] = blocks[1] = blocks[2] = blocks[3] =
      blocks[4] = blocks[5] = blocks[6] = blocks[7] =
      blocks[8] = blocks[9] = blocks[10] = blocks[11] =
      blocks[12] = blocks[13] = blocks[14] = blocks[15] = 0;
      if(notString) {
        for (i = start;index < length && i < 64; ++index) {
          blocks[i >> 2] |= message[index] << SHIFT[i++ & 3];
        }
      } else {
        for (i = start;index < length && i < 64; ++index) {
          code = message.charCodeAt(index);
          if (code < 0x80) {
            blocks[i >> 2] |= code << SHIFT[i++ & 3];
          } else if (code < 0x800) {
            blocks[i >> 2] |= (0xc0 | (code >> 6)) << SHIFT[i++ & 3];
            blocks[i >> 2] |= (0x80 | (code & 0x3f)) << SHIFT[i++ & 3];
          } else if (code < 0xd800 || code >= 0xe000) {
            blocks[i >> 2] |= (0xe0 | (code >> 12)) << SHIFT[i++ & 3];
            blocks[i >> 2] |= (0x80 | ((code >> 6) & 0x3f)) << SHIFT[i++ & 3];
            blocks[i >> 2] |= (0x80 | (code & 0x3f)) << SHIFT[i++ & 3];
          } else {
            code = 0x10000 + (((code & 0x3ff) << 10) | (message.charCodeAt(++index) & 0x3ff));
            blocks[i >> 2] |= (0xf0 | (code >> 18)) << SHIFT[i++ & 3];
            blocks[i >> 2] |= (0x80 | ((code >> 12) & 0x3f)) << SHIFT[i++ & 3];
            blocks[i >> 2] |= (0x80 | ((code >> 6) & 0x3f)) << SHIFT[i++ & 3];
            blocks[i >> 2] |= (0x80 | (code & 0x3f)) << SHIFT[i++ & 3];
          }
        }
      }
      bytes += i - start;
      start = i - 64;
      if(index == length) {
        blocks[i >> 2] |= EXTRA[i & 3];
        ++index;
      }
      block = blocks[16];
      if(index > length && i < 56) {
        blocks[15] = bytes << 3;
        end = true;
      }

      var a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
      for(j = 16;j < 64;++j) {
        // rightrotate
        t1 = blocks[j - 15];
        s0 = ((t1 >>> 7) | (t1 << 25)) ^ ((t1 >>> 18) | (t1 << 14)) ^ (t1 >>> 3);
        t1 = blocks[j - 2];
        s1 = ((t1 >>> 17) | (t1 << 15)) ^ ((t1 >>> 19) | (t1 << 13)) ^ (t1 >>> 10);
        blocks[j] = blocks[j - 16] + s0 + blocks[j - 7] + s1 << 0;
      }

      bc = b & c;
      for(j = 0;j < 64;j += 4) {
        if(first) {
          if(is224) {
            ab = 300032;
            t1 = blocks[0] - 1413257819;
            h = t1 - 150054599 << 0;
            d = t1 + 24177077 << 0;
          } else {
            ab = 704751109;
            t1 = blocks[0] - 210244248;
            h = t1 - 1521486534 << 0;
            d = t1 + 143694565 << 0;
          }
          first = false;
        } else {
          s0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
          s1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
          ab = a & b;
          maj = ab ^ (a & c) ^ bc;
          ch = (e & f) ^ (~e & g);
          t1 = h + s1 + ch + K[j] + blocks[j];
          t2 = s0 + maj;
          h = d + t1 << 0;
          d = t1 + t2 << 0;
        }
        s0 = ((d >>> 2) | (d << 30)) ^ ((d >>> 13) | (d << 19)) ^ ((d >>> 22) | (d << 10));
        s1 = ((h >>> 6) | (h << 26)) ^ ((h >>> 11) | (h << 21)) ^ ((h >>> 25) | (h << 7));
        da = d & a;
        maj = da ^ (d & b) ^ ab;
        ch = (h & e) ^ (~h & f);
        t1 = g + s1 + ch + K[j + 1] + blocks[j + 1];
        t2 = s0 + maj;
        g = c + t1 << 0;
        c = t1 + t2 << 0;
        s0 = ((c >>> 2) | (c << 30)) ^ ((c >>> 13) | (c << 19)) ^ ((c >>> 22) | (c << 10));
        s1 = ((g >>> 6) | (g << 26)) ^ ((g >>> 11) | (g << 21)) ^ ((g >>> 25) | (g << 7));
        cd = c & d;
        maj = cd ^ (c & a) ^ da;
        ch = (g & h) ^ (~g & e);
        t1 = f + s1 + ch + K[j + 2] + blocks[j + 2];
        t2 = s0 + maj;
        f = b + t1 << 0;
        b = t1 + t2 << 0;
        s0 = ((b >>> 2) | (b << 30)) ^ ((b >>> 13) | (b << 19)) ^ ((b >>> 22) | (b << 10));
        s1 = ((f >>> 6) | (f << 26)) ^ ((f >>> 11) | (f << 21)) ^ ((f >>> 25) | (f << 7));
        bc = b & c;
        maj = bc ^ (b & d) ^ cd;
        ch = (f & g) ^ (~f & h);
        t1 = e + s1 + ch + K[j + 3] + blocks[j + 3];
        t2 = s0 + maj;
        e = a + t1 << 0;
        a = t1 + t2 << 0;
      }

      h0 = h0 + a << 0;
      h1 = h1 + b << 0;
      h2 = h2 + c << 0;
      h3 = h3 + d << 0;
      h4 = h4 + e << 0;
      h5 = h5 + f << 0;
      h6 = h6 + g << 0;
      h7 = h7 + h << 0;
    } while(!end);

    var hex = HEX_CHARS[(h0 >> 28) & 0x0F] + HEX_CHARS[(h0 >> 24) & 0x0F] +
              HEX_CHARS[(h0 >> 20) & 0x0F] + HEX_CHARS[(h0 >> 16) & 0x0F] +
              HEX_CHARS[(h0 >> 12) & 0x0F] + HEX_CHARS[(h0 >> 8) & 0x0F] +
              HEX_CHARS[(h0 >> 4) & 0x0F] + HEX_CHARS[h0 & 0x0F] +
              HEX_CHARS[(h1 >> 28) & 0x0F] + HEX_CHARS[(h1 >> 24) & 0x0F] +
              HEX_CHARS[(h1 >> 20) & 0x0F] + HEX_CHARS[(h1 >> 16) & 0x0F] +
              HEX_CHARS[(h1 >> 12) & 0x0F] + HEX_CHARS[(h1 >> 8) & 0x0F] +
              HEX_CHARS[(h1 >> 4) & 0x0F] + HEX_CHARS[h1 & 0x0F] +
              HEX_CHARS[(h2 >> 28) & 0x0F] + HEX_CHARS[(h2 >> 24) & 0x0F] +
              HEX_CHARS[(h2 >> 20) & 0x0F] + HEX_CHARS[(h2 >> 16) & 0x0F] +
              HEX_CHARS[(h2 >> 12) & 0x0F] + HEX_CHARS[(h2 >> 8) & 0x0F] +
              HEX_CHARS[(h2 >> 4) & 0x0F] + HEX_CHARS[h2 & 0x0F] +
              HEX_CHARS[(h3 >> 28) & 0x0F] + HEX_CHARS[(h3 >> 24) & 0x0F] +
              HEX_CHARS[(h3 >> 20) & 0x0F] + HEX_CHARS[(h3 >> 16) & 0x0F] +
              HEX_CHARS[(h3 >> 12) & 0x0F] + HEX_CHARS[(h3 >> 8) & 0x0F] +
              HEX_CHARS[(h3 >> 4) & 0x0F] + HEX_CHARS[h3 & 0x0F] +
              HEX_CHARS[(h4 >> 28) & 0x0F] + HEX_CHARS[(h4 >> 24) & 0x0F] +
              HEX_CHARS[(h4 >> 20) & 0x0F] + HEX_CHARS[(h4 >> 16) & 0x0F] +
              HEX_CHARS[(h4 >> 12) & 0x0F] + HEX_CHARS[(h4 >> 8) & 0x0F] +
              HEX_CHARS[(h4 >> 4) & 0x0F] + HEX_CHARS[h4 & 0x0F] +
              HEX_CHARS[(h5 >> 28) & 0x0F] + HEX_CHARS[(h5 >> 24) & 0x0F] +
              HEX_CHARS[(h5 >> 20) & 0x0F] + HEX_CHARS[(h5 >> 16) & 0x0F] +
              HEX_CHARS[(h5 >> 12) & 0x0F] + HEX_CHARS[(h5 >> 8) & 0x0F] +
              HEX_CHARS[(h5 >> 4) & 0x0F] + HEX_CHARS[h5 & 0x0F] +
              HEX_CHARS[(h6 >> 28) & 0x0F] + HEX_CHARS[(h6 >> 24) & 0x0F] +
              HEX_CHARS[(h6 >> 20) & 0x0F] + HEX_CHARS[(h6 >> 16) & 0x0F] +
              HEX_CHARS[(h6 >> 12) & 0x0F] + HEX_CHARS[(h6 >> 8) & 0x0F] +
              HEX_CHARS[(h6 >> 4) & 0x0F] + HEX_CHARS[h6 & 0x0F];
    if(!is224) {
      hex += HEX_CHARS[(h7 >> 28) & 0x0F] + HEX_CHARS[(h7 >> 24) & 0x0F] +
             HEX_CHARS[(h7 >> 20) & 0x0F] + HEX_CHARS[(h7 >> 16) & 0x0F] +
             HEX_CHARS[(h7 >> 12) & 0x0F] + HEX_CHARS[(h7 >> 8) & 0x0F] +
             HEX_CHARS[(h7 >> 4) & 0x0F] + HEX_CHARS[h7 & 0x0F];
    }
    return hex;
  };
  
  if(!root.JS_SHA256_TEST && NODE_JS) {
    sha256.sha256 = sha256;
    sha256.sha224 = sha224;
    module.exports = sha256;
  } else if(root) {
    root.sha256 = sha256;
    root.sha224 = sha224;
  }
}(this));

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}]},{},[5])(5)
});