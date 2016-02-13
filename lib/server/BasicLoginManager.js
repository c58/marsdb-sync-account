import bcrypt from 'bcryptjs';
import { method } from 'marsdb-sync-server';


export default class BasicLoginManager {
  constructor(accManager, middlewareApp, rootUrl) {
    this._accManager = accManager;
    this._rootUrl = rootUrl;

    method('/auth/basic/login', this._handleBasicLogin);
    method('/auth/basic/register', this._handleBasicRegister);
    method('/auth/basic/logout', this._handleBasicLogout);
    method('/auth/token/login', this._handleTokenLogin);
  }

  _handleBasicLogin = (ctx, email, pass) => {
    invariant(
      pass && pass.algorithm === 'sha-256' && pass.digest,
      'Wrong password object format'
    );
    return this._accManager.getUserByEmail(email).then(user => {
      invariant(user, 'Wrong email');
      const userPass = user.password.bcrypt;
      return new Promise(resolve => {
        bcrypt.compare(userPass, pass.digest, function(err, res) {
          invariant(res, 'Wrong password');
          const authPromise = this._accManager.authConnection(
            ctx.connection, user._id);
          resolve(authPromise);
        });
      });
    })
  };

  _handleBasicRegister = (ctx, email, password) => {

  };

  _handleBasicLogout = (ctx) => {

  };

  _handleTokenLogin = (ctx, token) => {

  };
}
