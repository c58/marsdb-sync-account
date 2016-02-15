'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

exports._getPasswordString = _getPasswordString;
exports._validateEmailPass = _validateEmailPass;

var _invariant = require('invariant');

var _invariant2 = _interopRequireDefault(_invariant);

var _bcryptjs = require('bcryptjs');

var _bcryptjs2 = _interopRequireDefault(_bcryptjs);

var _emailValidator = require('email-validator');

var _emailValidator2 = _interopRequireDefault(_emailValidator);

var _index = require('./index');

var MarsAccount = _interopRequireWildcard(_index);

var _marsdbSyncServer = require('marsdb-sync-server');

var _ErrorCodes = require('../common/ErrorCodes');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

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

var BasicLoginManager = function () {
  function BasicLoginManager(accManager, middlewareApp, rootUrl) {
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
              _this._sendVerifyEmail(user._id, email);
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

      return MarsAccount.users().findOne(userId).project({}).then(function (usr) {
        if (usr) {
          return _this._accManager.authConnection(ctx.connection, userId, token);
        } else {
          throw new Error('User from a token does not exists');
        }
      });
    };

    this._handleVerifyEmail = function (req, res) {
      var token = decodeURIComponent(req.query && req.query.t);
      (0, _invariant2.default)(token, 'No token provided');

      var _accManager$verifyAut2 = _this._accManager.verifyAuthToken(token);

      var userId = _accManager$verifyAut2.userId;
      var email = _accManager$verifyAut2.email;


      return MarsAccount.users().update({ _id: userId, 'emails.address': email }, {
        $set: { 'emails.$.verified': true },
        $pull: { 'services.email.verify': token }
      }).then(function () {
        return res.redirect(_this._rootUrl);
      }, function () {
        return res.sendStatus(500);
      });
    };

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


  /**
   * Handle email verification token and verify email from the token
   * @param  {Request} req
   * @param  {Response} res
   */


  _createClass(BasicLoginManager, [{
    key: '_sendVerifyEmail',


    /**
     * Sends an email to verify an email
     * @param  {String} userId
     * @param  {String} email
     * @return {Promise}
     */
    value: function _sendVerifyEmail(userId, email) {
      var _this2 = this;

      var token = this._accManager.createToken({ email: email, userId: userId });
      var tokenEncoded = encodeURIComponent(token);
      var verifyUrl = this._rootUrl + '/auth/basic/email/verify?t=' + tokenEncoded;

      return MarsAccount.users().update(userId, { $push: { 'services.email.verify': token } }).then(function () {
        return _this2._accManager.sendEmailForAccount(userId, 'verify', { verifyUrl: verifyUrl }, email);
      });
    }
  }]);

  return BasicLoginManager;
}();

exports.default = BasicLoginManager;