'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _filter2 = require('fast.js/array/filter');

var _filter3 = _interopRequireDefault(_filter2);

var _marsdb = require('marsdb');

var _jsonwebtoken = require('jsonwebtoken');

var _jsonwebtoken2 = _interopRequireDefault(_jsonwebtoken);

var _index = require('./index');

var MarsAccount = _interopRequireWildcard(_index);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

// Internals
var TOKEN_EXPIERS_IN = 3 * 30 * 24 * 60 * 60; // 3 months in sec

/**
 * Manager for dealing with creating/updating of user object
 * and to authorize DDP connection.
 */

var AccountManager = function (_EventEmitter) {
  _inherits(AccountManager, _EventEmitter);

  function AccountManager(secretKey) {
    _classCallCheck(this, AccountManager);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(AccountManager).call(this));

    _this._secretKey = secretKey;
    return _this;
  }

  /**
   * Authenticate given connection for using with given
   * userId and relaunch all subscriptions. It also create
   * JWT token and store it in the user object or renew provided.
   * Returns a promise that will be resolved with object with
   * `userId` and `token` fields.
   * @param  {DDPConnection}  conn
   * @param  {String}         userId
   * @param  {String}         token
   * @return {Promise}
   */


  _createClass(AccountManager, [{
    key: 'authConnection',
    value: function authConnection(conn, userId, usedToken) {
      var _this2 = this;

      // Authorize connection
      conn.data.userId = userId;
      conn.subManager.updateSubscriptions();
      this.emit('user:authorized', userId);

      // Renew tokens of the user
      var users = MarsAccount.users();
      return users.findOne(userId).then(function (user) {
        var _filterTokensAndCreat = _this2._filterTokensAndCreate(userId, user.tokens, usedToken);

        var validTokens = _filterTokensAndCreat.validTokens;
        var token = _filterTokensAndCreat.token;

        return users.update(userId, { $set: { tokens: validTokens } }).then(function () {
          return { userId: userId, token: token };
        });
      });
    }

    /**
     * Get user by given profile or create new one.
     * Returns a promise that will be resolved with user object.
     * @param  {Object} profile
     * @return {Promise}
     */

  }, {
    key: 'getOrCreateAccByProfile',
    value: function getOrCreateAccByProfile(profile) {
      var _this3 = this;

      var provider = profile.provider;

      var newUserObj = {};
      newUserObj.services = _defineProperty({}, provider, profile);

      return MarsAccount.users().update(_defineProperty({}, 'service.' + provider + '.id', profile.id), { $setOnInsert: newUserObj }, { upsert: true }).then(function (_ref) {
        var original = _ref.original;
        var updated = _ref.updated;

        var user = updated[0];
        if (original[0] === null) {
          _this3.emit('user:created', user);
        }
        return user;
      });
    }

    /**
     * Filter out invalid and used tokens from given array
     * and creates new valid token
     * @param  {String} userId
     * @param  {Array}  tokens
     * @param  {String} usedToken
     * @return {Object}
     */

  }, {
    key: '_filterTokensAndCreate',
    value: function _filterTokensAndCreate(userId) {
      var _this4 = this;

      var tokens = arguments.length <= 1 || arguments[1] === undefined ? [] : arguments[1];
      var usedToken = arguments[2];

      var validTokens = (0, _filter3.default)(tokens, function (token) {
        try {
          _jsonwebtoken2.default.verify(token, _this4._secretKey);
          return token !== usedToken;
        } catch (err) {
          return false;
        }
      });

      var token = _jsonwebtoken2.default.sign({ userId: userId }, this._secretKey, { expiresIn: TOKEN_EXPIERS_IN });
      validTokens.push(token);

      return { validTokens: validTokens, token: token };
    }
  }]);

  return AccountManager;
}(_marsdb.EventEmitter);

exports.default = AccountManager;