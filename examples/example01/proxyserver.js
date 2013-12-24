var remoteobjects = require('../../index');

var PORT = 3000;

var server = new remoteobjects.ProxyServer();

server.listen(PORT, function () {
  console.log('proxy server listening on port ' + PORT);
});
