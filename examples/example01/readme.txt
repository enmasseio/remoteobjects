To run the example:

1. Start a proxy server. The proxy server will listen on localhost at port 3000.

      node proxyserver.js

2. Open the web page host1.html in a browser. This will create a host with id
   `host1`, connect the host to hte proxy server, create an object, and
   register the object at the host with id `object1`.

3. Open the web page host2.html in a browser. This will create a host with id
   `host2`, connect the host to hte proxy server, create a proxy to the remote
   object 'object1', and invoke a method `add` on this object.
