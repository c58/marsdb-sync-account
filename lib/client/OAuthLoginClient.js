import { Random } from 'marsdb';
import * as MarsSync from 'marsdb-sync-client';
import BasicLoginClient from './BasicLoginClient';


// Internals
const _urlPrefix = '/auth/oauth';
const _isCordova = typeof window !== 'undefined' && !!window.cordova;
const _haveLocalStorage = typeof localStorage !== 'undefined';
const _credentialSecrets = {};
if (typeof window !== 'undefined') {
  window.__handleCredentialSecret = function(token, secret) {
    _credentialSecrets[token] = secret;
  };
}


/**
 * Basic OAuth login strategy implementation
 */
class BasicOAuthLoginClient extends BasicLoginClient {
  /**
   * Login with OAuth by openning popup with form for
   * given service.
   * @return {Promise}
   */
  login(serviceName) {
    const credentialToken = Random.default().id();
    const serviceUrl = `${_urlPrefix}/popup/${serviceName}/${credentialToken}`;

    return new Promise((resolve, reject) => {
      this._showPopup(serviceUrl, () => {
        const secret = (
          _credentialSecrets[credentialToken] ||
          (_haveLocalStorage && localStorage.getItem(credentialToken))
        );
        if (!secret) {
          reject(new Error('No secret for given credential token'));
        } else {
          delete _credentialSecrets[credentialToken];
          if (_haveLocalStorage) {
            localStorage.removeItem(credentialToken);
          }
          MarsSync.call(`${_urlPrefix}/secret/login`, credentialToken, secret)
            .then(this._handleLoginResponse, reject).then(resolve);
        }
      });
    }).then(null, this._handleLoginError);
  }

  /**
   * Login with given accessToken from some login source,
   * like native mobile social SDKs.
   * @return {Promise}
   */
  loginWithToken(serviceName, accessToken) {
    return MarsSync.call(`${_urlPrefix}/token/login`, serviceName, accessToken)
      .then(this._handleLoginResponse, this._handleLoginError);
  }

  _handleCredentialSecret(credentialToken, secret) {
    _credentialSecrets[credentialToken] = secret;
  }

  _showPopup(url, callback) {
    throw new Error('Not implemented');
  }
}

/**
 * Abstract Implementation of an OAuth service
 * for Browser
 */
class AOAuth_Browser extends BasicOAuthLoginClient {

  _showPopup(url, callback, dimensions) {
    // default dimensions that worked well for facebook and google
    const popup = this._openCenteredPopup(
      url,
      (dimensions && dimensions.width) || 650,
      (dimensions && dimensions.height) || 331
    );

    const receiveMessage = (event) => {
      const [credentialToken, credentialSecret] = event.data.split(':');
      if (credentialToken && credentialSecret) {
        this._handleCredentialSecret(credentialToken, credentialSecret);
      }
    };

    const checkPopupOpen = setInterval(() => {
      let popupClosed;
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

  _openCenteredPopup(url, width, height) {
    var screenX = typeof window.screenX !== 'undefined'
          ? window.screenX : window.screenLeft;
    var screenY = typeof window.screenY !== 'undefined'
          ? window.screenY : window.screenTop;
    var outerWidth = typeof window.outerWidth !== 'undefined'
          ? window.outerWidth : document.body.clientWidth;
    var outerHeight = typeof window.outerHeight !== 'undefined'
          ? window.outerHeight : (document.body.clientHeight - 22);

    // Use `outerWidth - width` and `outerHeight - height` for help in
    // positioning the popup centered relative to the current window
    var left = screenX + (outerWidth - width) / 2;
    var top = screenY + (outerHeight - height) / 2;
    var features = ('width=' + width + ',height=' + height +
      ',left=' + left + ',top=' + top + ',scrollbars=yes');

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
}

/**
 * Abstract Implementation of an OAuth service
 * for Cordova
 */
class AOAuth_Cordova extends BasicOAuthLoginClient {

  /**
   * Open a popup window, centered on the screen, and call a callback when it
   * closes.
   * @param url {String} url to show
   * @param callback {Function} Callback function to call on completion. Takes no
   *                            arguments.
   * @param dimensions {optional Object(width, height)} The dimensions of
   *                             the popup. If not passed defaults to something sane.
   */
  _showPopup(url, callback, dimensions) {
    var fail = (err) => {
      callback(new Error('Error from OAuth popup: ' + JSON.stringify(err)));
    };

    // When running on an android device, we sometimes see the
    // `pageLoaded` callback fire twice for the final page in the OAuth
    // popup, even though the page only loads once. This is maybe an
    // Android bug or maybe something intentional about how onPageFinished
    // works that we don't understand and isn't well-documented.
    var oauthFinished = false;

    var pageLoaded = (event) => {
      if (oauthFinished) {
        return;
      }

      if (event.url.indexOf('_oauth') >= 0) {
        var splitUrl = event.url.split('#');
        var hashFragment = splitUrl[1];

        if (! hashFragment) {
          setTimeout(pageLoaded, 100);
          return;
        }

        var credentials = JSON.parse(decodeURIComponent(hashFragment));
        this._handleCredentialSecret(credentials.credentialToken,
                                     credentials.credentialSecret);

        oauthFinished = true;

        // On iOS, this seems to prevent 'Warning: Attempt to dismiss from
        // view controller <MainViewController: ...> while a presentation
        // or dismiss is in progress'. My guess is that the last
        // navigation of the OAuth popup is still in progress while we try
        // to close the popup. See
        // https://issues.apache.org/jira/browse/CB-2285.
        //
        // XXX Can we make this timeout smaller?
        setTimeout(function() {
          popup.close();
          callback();
        }, 100);
      }
    };

    var onExit = function() {
      popup.removeEventListener('loadstop', pageLoaded);
      popup.removeEventListener('loaderror', fail);
      popup.removeEventListener('exit', onExit);
      if (!oauthFinished) {
        callback(new Error('Login canceled'));
      }
    };

    var popup = window.open(url, '_blank',
      'location=yes,hidden=yes,' +
      'clearcache=yes,' +
      'clearsessioncache=yes'
    );
    popup.addEventListener('loadstop', pageLoaded);
    popup.addEventListener('loaderror', fail);
    popup.addEventListener('exit', onExit);
    popup.show();
  }
}

// Platform specific export
export default (_isCordova) ? AOAuth_Cordova : AOAuth_Browser;
