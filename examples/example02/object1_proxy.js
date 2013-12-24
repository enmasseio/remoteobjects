// this script creates a proxy to a remote object 'object1' and uses it.
// The object 'object1' runs on web page object1.html which should be opened first.
// This script can be run both via node.js or in a browser.
var remoteobjects = remoteobjects || require('../../index');

// constants
var PROXY_SERVER_URL = 'ws://localhost:3000',
    OBJECT_ID = 'object1';

// create a host
var host = new remoteobjects.Host();

// connect to a proxy server
host.connect(PROXY_SERVER_URL, function (err, result) {
  if (err) {
    console.log('Error', err);
    return;
  }

  console.log('Connected to proxy server');

  // create a proxy linked with object1
  host.proxy(OBJECT_ID, function (err, proxy) {
    if (err) {
      console.log(err);
    }
    else {
      console.log('Proxy created for object ' + OBJECT_ID);

      // ok now test it
      console.log('Invoking the function `add` of object ' + OBJECT_ID + ', add(2, 4.5)');
      proxy.add(2, 4.5, function(err, result) {
        console.log('result:', result, 'err:', err);

        host.disconnect(function () {
          console.log('Disconnected from proxy server')
        });
      });
    }
  });
});
