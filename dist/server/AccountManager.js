'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _invariant = require('invariant');

var _invariant2 = _interopRequireDefault(_invariant);

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

  function AccountManager(secretKey, email) {
    _classCallCheck(this, AccountManager);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(AccountManager).call(this));

    _this._secretKey = secretKey;
    return _this;
  }

  /**
   * Sends an email to a user. If email not provided then
   * email will be sent to first available email. If no
   * emails available then it throws an error.
   * @param  {String} userId
   * @param  {String} email
   * @return {Promise}
   */


  _createClass(AccountManager, [{
    key: 'sendEmailForAccount',
    value: function sendEmailForAccount(userId, letter, email) {
      return MarsAccount.users().findOne(userId).then(function (user) {
        (0, _invariant2.default)(user, 'No user with given id %s found', userId);

        var targetEmail = email;
        if (!targetEmail) {
          targetEmail = user.emails[0].address;
        }

        // TODO
      });
    }

    /**
     * Returns a Promise that resolved with user object with
     * given email or null if no user found
     * @param  {String} email
     * @return {Promise}
     */

  }, {
    key: 'getUserByEmail',
    value: function getUserByEmail(email) {
      email = email.toLowerCase();
      return MarsAccount.users().findOne({ 'emails.address': email });
    }

    /**
     * Create new user with given email and passObj
     * @param  {String} email
     * @param  {Object} passObj
     * @return {Promise}
     */

  }, {
    key: 'createUserByEmailPass',
    value: function createUserByEmailPass(email, passObj) {
      email = email.toLowerCase();
      var newUserObj = {
        profile: {},
        createdAt: new Date(),
        services: { resume: { tokens: [] } },
        emails: [{ address: email, verified: false }],
        password: passObj
      };

      newUserObj._id = MarsAccount.users().idGenerator().value;
      this.emit('user:create', newUserObj);
      return MarsAccount.users().insert(newUserObj).then(function () {
        return newUserObj;
      });
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

  }, {
    key: 'authConnection',
    value: function authConnection(conn, userId, usedToken) {
      var _this2 = this;

      // Authorize connection
      this.emit('user:authorize', userId);
      conn.data.userId = userId;
      conn.subManager.updateSubscriptions();

      // Renew tokens of the user
      var users = MarsAccount.users();
      return users.findOne(userId).then(function (user) {
        var loginTokens = user.services.resume.tokens;

        var _filterTokensAndCreat = _this2._filterTokensAndCreate(userId, loginTokens, usedToken);

        var validTokens = _filterTokensAndCreat.validTokens;
        var token = _filterTokensAndCreat.token;

        return users.update(userId, {
          $set: { 'services.resume.tokens': validTokens }
        }).then(function () {
          return { userId: userId, token: token };
        });
      });
    }

    /**
     * Remove userId from conneciton and update subscriptions
     * @param  {DDPConnection} conn
     * @return {Promise}
     */

  }, {
    key: 'unauthConneciton',
    value: function unauthConneciton(conn) {
      delete conn.data.userId;
      return conn.subManager.updateSubscriptions();
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
      var _services,
          _this3 = this;

      var provider = profile.provider;

      var newUserObj = {
        profile: { name: profile.displayName },
        createdAt: new Date(),
        services: (_services = {}, _defineProperty(_services, provider, profile), _defineProperty(_services, 'resume', { tokens: [] }), _services)
      };

      return MarsAccount.users().findOne(_defineProperty({}, 'services.' + provider + '.id', profile.id)).then(function (user) {
        if (!user) {
          newUserObj._id = MarsAccount.users().idGenerator().value;
          _this3.emit('user:create', newUserObj);
          return MarsAccount.users().insert(newUserObj).then(function () {
            return newUserObj;
          });
        } else {
          return user;
        }
      });
    }

    /**
     * Adds given OAuth profile to given account.
     * If profile of given provider already exists then it will
     * be replaced
     * @param {String} userId
     * @param {Object} profile
     */

  }, {
    key: 'addServiceToUser',
    value: function addServiceToUser(userId, profile) {
      var provider = profile.provider;

      return MarsAccount.users().update(userId, { $set: _defineProperty({}, 'services.' + provider, profile) });
    }

    /**
     * Verify given JWT token and returns incapsulated data.
     * (object with `userId` field for now)
     * @param  {String} token
     * @return {Object}
     */

  }, {
    key: 'verifyAuthToken',
    value: function verifyAuthToken(token) {
      return _jsonwebtoken2.default.verify(token, this._secretKey);
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
          _this4.verifyAuthToken(token);
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