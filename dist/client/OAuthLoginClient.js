'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _marsdb = require('marsdb');

var _marsdbSyncClient = require('marsdb-sync-client');

var _marsdbSyncClient2 = _interopRequireDefault(_marsdbSyncClient);

var _BasicLoginClient2 = require('./BasicLoginClient');

var _BasicLoginClient3 = _interopRequireDefault(_BasicLoginClient2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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
            _marsdbSyncClient2.default.call(_urlPrefix + '/secret/login', credentialToken, secret).then(_this2._handleLoginResponse, reject).then(resolve);
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
      return _marsdbSyncClient2.default.call(_urlPrefix + '/token/login', serviceName, accessToken).then(this._handleLoginResponse, this._handleLoginError);
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