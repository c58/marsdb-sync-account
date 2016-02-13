import UsersModel from '../models/Users.model';
import { publish } from 'marsdb-sync-server';


publish('loggedInUser', (ctx) => {
  console.log(ctx.data.userId);
  return UsersModel.find({_id: ctx.data.userId})
});
