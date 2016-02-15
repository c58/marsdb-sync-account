'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports._getPasswordString = _getPasswordString;
exports._validateEmailPass = _validateEmailPass;

var _invariant = require('invariant');

var _invariant2 = _interopRequireDefault(_invariant);

var _bcryptjs = require('bcryptjs');

var _bcryptjs2 = _interopRequireDefault(_bcryptjs);

var _emailValidator = require('email-validator');

var _emailValidator2 = _interopRequireDefault(_emailValidator);

var _marsdbSyncServer = require('marsdb-sync-server');

var _ErrorCodes = require('../common/ErrorCodes');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// Internals
function _getPasswordString(passObj) {
  (0, _invariant2.default)(passObj && passObj.algorithm === 'sha-256' && typeof passObj.digest === 'string' && passObj.digest.length === 64, _ErrorCodes.BASIC_LOGIN_ERR.INVALID_PASS);
  return passObj.digest;
}

function _validateEmailPass(email, passObj) {
  var passStr = _getPasswordString(passObj);
  (0, _invariant2.default)(_emailValidator2.default.validate(email), _ErrorCodes.BASIC_LOGIN_ERR.INVALID_EMAIL);
  email = email.toLowerCase();
  return { email: email, passStr: passStr };
}

/**
 * Email/password login manager.
 */

var BasicLoginManager = function BasicLoginManager(accManager, middlewareApp, rootUrl) {
  var _this = this;

  _classCallCheck(this, BasicLoginManager);

  this._handleBasicLogin = function (ctx, rawEmail, passObj) {
    var _validateEmailPass2 = _validateEmailPass(rawEmail, passObj);

    var email = _validateEmailPass2.email;
    var passStr = _validateEmailPass2.passStr;


    return _this._accManager.getUserByEmail(email).then(function (user) {
      (0, _invariant2.default)(user, _ErrorCodes.BASIC_LOGIN_ERR.WRONG_EMAIL);
      var userPassStr = user.password.bcrypt;

      return new Promise(function (resolve) {
        _bcryptjs2.default.compare(userPassStr, passStr, function (err, res) {
          (0, _invariant2.default)(res && !err, _ErrorCodes.BASIC_LOGIN_ERR.WRONG_PASS);

          var authPromise = _this._accManager.authConnection(ctx.connection, user._id);
          resolve(authPromise);
        });
      });
    });
  };

  this._handleBasicRegister = function (ctx, rawEmail, passObj) {
    var _validateEmailPass3 = _validateEmailPass(rawEmail, passObj);

    var email = _validateEmailPass3.email;
    var passStr = _validateEmailPass3.passStr;


    return _this._accManager.getUserByEmail(email).then(function (existingUser) {
      (0, _invariant2.default)(!existingUser, _ErrorCodes.BASIC_LOGIN_ERR.USED_EMAIL);

      return new Promise(function (resolve) {
        _bcryptjs2.default.hash(passStr, 10, function (err, bcryptPassStr) {
          _this._accManager.createUserByEmailPass(email, { bcrypt: bcryptPassStr }).then(function (user) {
            // TODO send a letter to verify email
            return _this._accManager.authConnection(ctx.connection, user._id);
          }).then(resolve);
        });
      });
    });
  };

  this._handleBasicLogout = function (ctx) {
    return _this._accManager.unauthConneciton(ctx.connection);
  };

  this._handleTokenLogin = function (ctx, token) {
    var _accManager$verifyAut = _this._accManager.verifyAuthToken(token);

    var userId = _accManager$verifyAut.userId;

    return _this._accManager.authConnection(ctx.connection, userId, token);
  };

  this._handleVerifyEmail = function (req, res) {};

  this._accManager = accManager;
  this._rootUrl = rootUrl;

  (0, _marsdbSyncServer.method)('/auth/basic/login', this._handleBasicLogin);
  (0, _marsdbSyncServer.method)('/auth/basic/register', this._handleBasicRegister);
  (0, _marsdbSyncServer.method)('/auth/basic/logout', this._handleBasicLogout);
  (0, _marsdbSyncServer.method)('/auth/token/login', this._handleTokenLogin);
  middlewareApp.get('/auth/basic/email/verify', this._handleVerifyEmail);
}

/**
 * Handle login by email and password
 * @param  {Context} ctx
 * @param  {String} email
 * @param  {Object} passObj
 * @return {Promise}
 */


/**
 * Register new user by email and password
 * @param  {Context} ctx
 * @param  {String} email
 * @param  {Object} passObj
 * @return {Promise}
 */


/**
 * Logout user
 * @param  {Context} ctx
 * @return {Promise}
 */


/**
 * Authorize connection with given JWT token
 * @param  {Context} ctx
 * @param  {String} token
 * @return {Promise}
 */
;

exports.default = BasicLoginManager;