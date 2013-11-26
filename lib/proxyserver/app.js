var http = require('http'),
    express = require('express'),
    ProxyServer = require('./ProxyServer');

var port = process.env.PORT || 3000;

// create an express app
var app = express();
app.use(express.static(__dirname + '/public'));

// create an http server
var server = http.createServer(app);

// create a proxy server
var proxyServer = new ProxyServer({
  server: server,
  logging: true
});

// start the server
server.listen(port);
console.log('proxy server listening on port ' + port);
