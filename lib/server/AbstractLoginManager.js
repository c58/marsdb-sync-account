import * as MarsAccount from './index';


export default class AbstractLoginManager {
  constructor(eventBus, middlewareApp, rootUrl) {
    this._rootUrl = rootUrl;
    this._eventBus = eventBus;
  }

  _handleUserLoggedIn(ctx, userId, token) {
    ctx.connection.data.userId = userId;
    ctx.connection.subManager.updateSubscriptions();
    this._eventBus.emit('user:loggedIn', userId);
    //return MarsAccount.users().findOne()
  }

  _handleUserCreated(user) {
    this._eventBus.emit('user:created', user);
  }
}
