import http from 'http';
import express from 'express';
import path from 'path';
import webpack from 'webpack';
import webpackDevMiddleware from 'webpack-dev-middleware';
import MarsSync from 'marsdb-sync-server';
import * as MarsAccounts from 'marsdb-sync-account/dist/server'
import requireDir from 'require-dir';
import { Strategy as VKontakteStrategy } from 'passport-vkontakte';
import UsersModel from './js/models/Users.model';


// Config
const APP_PORT = 3000;

// Configure webpack compiler
const compiler = webpack({
  entry: path.resolve(__dirname, 'js', 'app.js'),
  resolve: {
    alias: {
      'marsdb': path.resolve('./node_modules/marsdb'),
      'marsdb-sync-server': path.resolve('./node_modules/marsdb-sync-server'),
      'marsdb-sync-client': path.resolve('./node_modules/marsdb-sync-client'),
    },
  },
  module: {
    loaders: [
      {
        exclude: /node_modules/,
        loader: 'babel',
        test: /\.js$/,
        query: {
          presets: ['es2015', 'stage-0', 'react']
        }
      },
    ],
  },
  output: {filename: 'app.js', path: '/'},
});

// Configure express application
const app = express();
const server = http.createServer(app);
app.use('/', express.static(path.resolve(__dirname, 'public')));
app.use(webpackDevMiddleware(compiler, {
  contentBase: '/public/',
  publicPath: '/js/',
  stats: {colors: true},
}));

// Configure marsdb-sync-server
MarsSync.configure({ server });
MarsAccounts.configure({
  usersColl: UsersModel,
  secretKey: 'myownsecret',
  middlewareApp: app,
  rootUrl: 'http://localhost:3000'
});
MarsAccounts.addOAuthStrategy('vkontakte', (cbUrl, cb) =>
  new VKontakteStrategy({
    clientID: '3509560',
    clientSecret: '2sZYlQTvpKJMqv6Ph8l7',
    callbackURL: cbUrl
  }, cb)
);

requireDir('./js/models');
requireDir('./js/publishers');
requireDir('./js/methods');

// Start the server
server.listen(APP_PORT, () => {
  console.log(`App is now running on http://localhost:${APP_PORT}`);
});
