// this script creates a proxy to a remote object 'object1' and uses it.
// The object 'object1' runs on web page object1.html which should be opened first.
// This script can be run both via node.js or in a browser.
var remoteobjects = remoteobjects || require('../index');

// create a proxy linked with object1
var objectProxy = null;
var objectId = 'object1';
remoteobjects.proxy(objectId, function (err, proxy) {
  if (err) {
    console.log(err);
  }
  else {
    objectProxy = proxy;
    console.log('proxy created for object ' + objectId);

    // ok now test it
    invoke();
  }
});

// invoke a remote method via the proxy
function invoke () {
  console.log('invoking the function `add` of object ' + objectId + ', add(2, 4.5)');

  objectProxy.add(2, 4.5, function(err, result) {
    console.log('result:', result, 'err:', err);
  });
}
