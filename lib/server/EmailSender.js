import SMTP from 'simplesmtp';
import mailcomposer from 'mailcomposer';
import url from 'url';


// Internals
export function _validateSMTPUrl(smtpUrl) {
  if (smtpUrl) {
    const mailUrl = url.parse(smtpUrl);
    if (mailUrl.protocol !== 'smtp:') {
      throw new Error(`Given SMTP address ${smtpUrl} ` +
        `must have 'smtp:' protocol`);
    }
  }
}

/**
 * Send an email or print it out if SMTP_URL is not provided
 */
export default class EmailSender {
  constructor(smtpUrl) {
    _validateSMTPUrl(smtpUrl);
    this._smtpUrl = smtpUrl;
    this._devEmailId = 0;
  }

  send(email, letter) {
    const composedMail = mailcomposer(letter);
    if (this._smtpUrl) {
      this._doSendSMTP(composedMail);
    } else {
      this._doSendPrint(composedMail);
    }
  }

  _doSendSMTP(composedMail) {
    const pool = this._getSMTPPool();
    return new Promise((resolve, reject) => {
      pool.sendMail(composedMail, (err, res) => {
        if (!err) {
          resolve(res);
        } else {
          reject(err);
        }
      });
    });
  }

  _doSendPrint(composedMail) {
    return new Promise((resolve, reject) => {
      composedMail.build((err, message) => {
        this._devEmailId++;
        if (!err) {
          console.log(`====== BEGIN MAIL #${this._devEmailId} ======`);
          console.log(`(Mail is not sent; Provide "smtpUrl" option to MarsAccount config)`);
          console.log(message.toString());
          console.log(`====== END MAIL #${this._devEmailId} ======`);
          resolve();
        } else {
          reject(err);
        }
      });
    });
  }

  _getSMTPPool() {
    if (!this._smptPool) {
      const mailUrl = url.parse(this._smtpUrl);
      const port = +(mailUrl.port);

      let auth = false;
      if (mailUrl.auth) {
        const parts = mailUrl.auth.split(':', 2);
        auth = {
          user: parts[0] && decodeURIComponent(parts[0]),
          pass: parts[1] && decodeURIComponent(parts[1]),
        };
      }

      this._smptPool = SMTP.createClientPool(port, mailUrl.hostname, {
        secureConnection: (port === 465),
        auth: auth,
      });
    }
    return this._smptPool;
  }
}
