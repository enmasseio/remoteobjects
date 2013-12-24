To run the example:

1. Start a proxy server. The proxy server will listen on localhost at port 3000.

      node proxyserver.js

2. Open the web page object1.html in a browser. This will create an object
   and register it at the proxy server with id `object1`.

3. Run the script object1_proxy.js. This will create a proxy to the remote
   object 'object1', and invoke a method `add` on this object.

      node object1_proxy.js

4. Open the web page object1_proxy.html in a browser. This runs the script
   object1_proxy.js executed in (3) from the browser.
