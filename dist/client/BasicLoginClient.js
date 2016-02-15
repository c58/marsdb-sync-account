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