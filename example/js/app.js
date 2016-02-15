import 'babel-polyfill';
import React from 'react';
import ReactDOM from 'react-dom';
import Collection from 'marsdb';
import DDPTestComponent from './components/DDPTestComponent';
import * as MarsClient from 'marsdb-sync-client';
import * as MarsAccount from 'marsdb-sync-account/dist/client';

// Configure Mars stack
console.log('321');
MarsAccount.configure();
MarsClient.configure({ url: 'ws://localhost:3000' });
Collection.defaultStorageManager(require('marsdb-localforage'));

// Start app
ReactDOM.render(
  <DDPTestComponent />,
  document.getElementById('root')
);
