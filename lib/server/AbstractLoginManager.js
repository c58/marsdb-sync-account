export default class AbstractLoginManager {
  constructor(eventBus, middlewareApp, rootUrl) {
    this._rootUrl = rootUrl;
    this._eventBus = eventBus;
  }

  _handleUserLoggedIn(ctx, userId) {
    ctx.connection.data.userId = userId;
    ctx.connection.subManager.updateSubscriptions();
    this._eventBus.emit('user:loggedIn', userId);
  }

  _handleUserCreated(user) {
    this._eventBus.emit('user:created', user);
  }
}
