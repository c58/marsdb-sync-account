'use strict';

module.exports = {
  src: 'lib/**/*.js',
  dist: 'dist',
  build: 'build',

  browser: {
    bundleName: 'marsdb.sync.js',
    bundleMinName: 'marsdb.sync.min.js',
    entry: 'index.js',
    entryTests: 'browser_tests.js',
  }
};
