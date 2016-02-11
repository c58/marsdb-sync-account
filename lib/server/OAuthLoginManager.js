import _bind from 'fast.js/function/bind';
import fs from 'fs';
import { method } from 'marsdb-sync-server';
import { EJSON, Base64, Random } from 'marsdb';
import passport from 'passport';
import MarsAccount from './index';
import AbstractLoginManager from './AbstractLoginManager';


// Internals
const _urlPrefix = '/auth/oauth';
const _popupResponseTemplate = fs.readFileSync(
  './resources/end_of_popup_response.html');

/**
 * Listen to OAuth login methods
 */
export default class OAuthLoginManager extends AbstractLoginManager {
  constructor(eventBus, middlewareApp, rootUrl) {
    super(eventBus, middlewareApp, rootUrl);
    this._credentials = {};
    this._providerOpts = {};

    method(`${_urlPrefix}/secret/login`, this._handleSecretLogin);
    method(`${_urlPrefix}/token/login`, this._handleTokenLogin);
    middlewareApp.get(`${_urlPrefix}/popup/:provider/callback`,
      this._handleGETPopupCallback);
    middlewareApp.get(`${_urlPrefix}/popup/:provider/:credentialToken`,
      this._handleGETPopup);
  }

  addStrategy(provider, strategyCreatorFn, options = {}) {
    this._providerOpts[provider] = options;
    const cbUrlPrefix = `${this._rootUrl}${_urlPrefix}`;
    const callbackUrl = `${cbUrlPrefix}/popup/${provider}/callback`;
    const callback = _bind(this._handleOAuthLogin, this, provider);
    const strategy = strategyCreatorFn(callbackUrl, callback);
    passport.use(provider, strategy);
  }

  _handleSecretLogin = (ctx, credentialToken, secret) => {
    const savedCred = this._credentials[credentialToken];
    delete this._credentials[credentialToken];

    if (savedCred && savedCred.credentialSecret === secret) {
      return this._handleUserLoggedIn(ctx, savedCred.userId);
    } else {
      throw new Error('No credential found with given token');
    }
  };

  _handleTokenLogin = (ctx, provider, accessToken) => {
    const reqMock = {query: {access_token: accessToken}};
    return new Promise((resolve, reject) => {
      passport.authenticate(provider, (err, user, info) => {
        if (!err && user) {
          resolve(this._handleUserLoggedIn(ctx, user._id));
        } else {
          reject(err);
        }
      })(reqMock, {});
    });
  };

  _handleOAuthLogin = (provider, accessToken, refreshToken, profile, done) => {
    MarsAccount.users().update(
      {[`service.${provider}.id`]: profile.id}
      {$setOnInsert: {service: {[provider]: profile}}},
      {upsert: true}
    ).then(({original, updated}) => {
      const user = updated[0];
      if (original[0] === null) {
        this._handleUserCreated(user);
      }
      done(null, user);
    }, done);
  };

  _handleGETPopup = (req, res, next) => {
    const { provider, credentialToken } = req.params;
    invariant(
      this._providerOpts[provider],
      'Provider %s is not supported',
      provider
    );

    const options = {
      ...this._providerOpts[provider],
      session: false,
      state: Base64.encode(EJSON.stringify({ credentialToken })),
    };

    passport.authenticate(provider, options)(req, res, next);
  };

  _handleGETPopupCallback = (req, res, next) => {
    const provider = req.params.provider;
    const { credentialToken } = EJSON.parse(Base64.decode(req.query.state));

    passport.authenticate(provider, (err, user, info) => {
      // Configure response for logged in user
      let config = {};
      if (!err && user) {
        const userId = user._id;
        const credentialSecret = Random.default().id(20);
        config.setCredentialToken = true;
        config.credentialSecret = credentialSecret;
        config.credentialToken = credentialToken;

        // Set token for authentication and delete it after 5sec
        this._credentials[credentialToken] = { credentialSecret, userId };
        setTimeout(() => delete this._credentials[credentialToken], 5000);
      }

      // Create HTML response with created config
      const tplWithConfig = _popupResponseTemplate.replace(
        '##CONFIG##', JSON.stringify(config)
      );

      res.writeHead(200, {'Content-Type': 'text/html'});
      res.write(tplWithConfig);
      res.end();
    })(req, res, next);
  };
}
