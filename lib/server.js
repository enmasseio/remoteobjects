var ProxyServer = require('./ProxyServer');

// start a proxy server
var proxyServer = new ProxyServer({
  port: process.env.PORT || null
});
proxyServer.open();

console.log('proxy server listening on port ' + proxyServer.port);
