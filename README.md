# remoteobjects

Remote objects in a distributed peer-to-peer network.


## Status

Implemented:

- Registering/unregistering remote objects.
- Invoking local and remote objects via a proxy.
- Both browser and node.js supported.

Missing:

- peer-to-peer network, currently a central proxy server is used.
- auto-reconnect of socket connections.
- error handling.


## Install

Install remoteobjects via npm:

    npm install remoteobjects


## Use

Start a proxy server:

```js
var remoteobjects = require('remoteobjects');

var PORT = 3000;

// create a proxy server
var server = new remoteobjects.ProxyServer();
server.listen(PORT, function () {
  console.log('proxy server listening on port ' + PORT);
});
```

Create a remote object `object1` on `host1`:

```js
var remoteobjects = require('remoteobjects');

var PROXY_SERVER_URL = 'ws://localhost:3000';

// create a host
var host1 = new remoteobjects.Host({id: 'host1'});

// connect to the proxy server
host1.connect(PROXY_SERVER_URL, function (err) {
  if (err) {
    console.log(err);
  }
  else {
    // create a regular JavaScript object
    var object = {
      add: function (a, b, callback) {
        callback(null, a + b);
      }
    };

    // add the object to the host
    host1.add('object1', object);
  }
});
```

And to invoke remote object `object1` from `host2`:

```js
var remoteobjects = require('remoteobjects');

var PROXY_SERVER_URL = 'ws://localhost:3000';

// create a host
var host2 = new remoteobjects.Host({id: 'host2'});

// connect to the proxy server
host2.connect(PROXY_SERVER_URL, function (err) {
  if (err) {
    console.log(err);
  }
  else {
    // create a proxy to object1 located on host1
    host2.proxy('object1', function (err, proxy) {
      if (err) {
        console.log(err);
      }
      else {
        // invoke the remote object
        proxy.add(2, 3, function (err, result) {
        if (err) {
          console.log(err);
        }
        else {
          console.log('result:', result);
        }
      });
    });
  }
});
```


## Build

To build the library (for browser use), run:

    npm run build

(or run `grunt`).


## Test

To test the module, run:

    npm test

(or run `grunt test`).


## License

Copyright (C) 2013-2014 Almende B.V., http://almende.com

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
