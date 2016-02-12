'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var AbstractLoginManager = function () {
  function AbstractLoginManager(eventBus, middlewareApp, rootUrl) {
    _classCallCheck(this, AbstractLoginManager);

    this._rootUrl = rootUrl;
    this._eventBus = eventBus;
  }

  _createClass(AbstractLoginManager, [{
    key: '_handleUserLoggedIn',
    value: function _handleUserLoggedIn(ctx, userId) {
      ctx.connection.data.userId = userId;
      ctx.connection.subManager.updateSubscriptions();
      this._eventBus.emit('user:loggedIn', userId);
    }
  }, {
    key: '_handleUserCreated',
    value: function _handleUserCreated(user) {
      this._eventBus.emit('user:created', user);
    }
  }]);

  return AbstractLoginManager;
}();

exports.default = AbstractLoginManager;