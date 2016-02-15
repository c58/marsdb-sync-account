'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

exports._validateSMTPUrl = _validateSMTPUrl;

var _simplesmtp = require('simplesmtp');

var _simplesmtp2 = _interopRequireDefault(_simplesmtp);

var _mailcomposer = require('mailcomposer');

var _mailcomposer2 = _interopRequireDefault(_mailcomposer);

var _url = require('url');

var _url2 = _interopRequireDefault(_url);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// Internals
function _validateSMTPUrl(smtpUrl) {
  if (smtpUrl) {
    var mailUrl = _url2.default.parse(smtpUrl);
    if (mailUrl.protocol !== 'smtp:') {
      throw new Error('Given SMTP address ' + smtpUrl + ' ' + 'must have \'smtp:\' protocol');
    }
  }
}

/**
 * Send an email or print it out if SMTP_URL is not provided
 */

var EmailSender = function () {
  function EmailSender(smtpUrl) {
    _classCallCheck(this, EmailSender);

    _validateSMTPUrl(smtpUrl);
    this._smtpUrl = smtpUrl;
    this._devEmailId = 0;
  }

  _createClass(EmailSender, [{
    key: 'send',
    value: function send(email, letter) {
      var composedMail = (0, _mailcomposer2.default)(letter);
      if (this._smtpUrl) {
        this._doSendSMTP(composedMail);
      } else {
        this._doSendPrint(composedMail);
      }
    }
  }, {
    key: '_doSendSMTP',
    value: function _doSendSMTP(composedMail) {
      var pool = this._getSMTPPool();
      return new Promise(function (resolve, reject) {
        pool.sendMail(composedMail, function (err, res) {
          if (!err) {
            resolve(res);
          } else {
            reject(err);
          }
        });
      });
    }
  }, {
    key: '_doSendPrint',
    value: function _doSendPrint(composedMail) {
      var _this = this;

      return new Promise(function (resolve, reject) {
        composedMail.build(function (err, message) {
          _this._devEmailId++;
          if (!err) {
            console.log('====== BEGIN MAIL #' + _this._devEmailId + ' ======');
            console.log('(Mail is not sent; Provide "smtpUrl" option to MarsAccount config)');
            console.log(message.toString());
            console.log('====== END MAIL #' + _this._devEmailId + ' ======');
            resolve();
          } else {
            reject(err);
          }
        });
      });
    }
  }, {
    key: '_getSMTPPool',
    value: function _getSMTPPool() {
      if (!this._smptPool) {
        var mailUrl = _url2.default.parse(this._smtpUrl);
        var port = +mailUrl.port;

        var auth = false;
        if (mailUrl.auth) {
          var parts = mailUrl.auth.split(':', 2);
          auth = {
            user: parts[0] && decodeURIComponent(parts[0]),
            pass: parts[1] && decodeURIComponent(parts[1])
          };
        }

        this._smptPool = _simplesmtp2.default.createClientPool(port, mailUrl.hostname, {
          secureConnection: port === 465,
          auth: auth
        });
      }
      return this._smptPool;
    }
  }]);

  return EmailSender;
}();

exports.default = EmailSender;