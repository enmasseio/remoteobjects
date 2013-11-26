var assert = require('assert'),
    http = require('http'),
    async = require('async'),
    express = require('express'),
    portscanner = require('portscanner'),
    WebSocket = require('ws'),
    ProxyServer = require('../lib/proxyserver/ProxyServer'),
    requestify = require('../lib/requestify');

var PORT_MIN = 3000,
    PORT_MAX = 3100;

describe('proxyserver', function() {

  it ('should create a proxy server on given port', function (done) {
    portscanner.findAPortNotInUse(PORT_MIN, PORT_MAX, 'localhost', function(err, port) {
      if (err) {
        throw new Error('Could not find a free port');
      }
      else {
        var server = new ProxyServer();
        server.listen(port, function () {
          var client = new WebSocket('ws://localhost:' + port);
          client.onopen = function() {
            server.close();
            done();
          };
        });
      }
    });
  });

  // TODO: test logging

  it ('should throw an exception when creating a proxy server without configuration', function () {
    assert.throws(function () {
      var server = new ProxyServer();
      server.listen(); // misses both port and server config
    });
  });

  it ('should set the id for a peer', function (done) {
    var server, client1, port;

    async.series([
        // find a free port
        function (callback) {
          portscanner.findAPortNotInUse(PORT_MIN, PORT_MAX, 'localhost', function(err, freePort) {
            if (err) {
              throw new Error('Could not find a free port');
            }
            else {
              port = freePort;
              callback();
            }
          });
        },

        // start a proxy server
        function (callback) {
          server = new ProxyServer();
          server.listen(port, callback);
        },

        // register a client
        function (callback) {
          client1 = requestify(new WebSocket('ws://localhost:' + port));
          client1.onopen = function() {
            client1.request({ type: 'connect', id: 'client1' }, callback);
          };
        },

        // verify the servers list with clients
        function (callback) {
          assert.deepEqual(server.list(), ['client1']);
          callback();
        },

        // done
        function (callback) {
          server.close();
          callback();
        }
    ], done);
  });

  it ('should send a request from one peer to another', function (done) {
    var MESSAGE = 'Hello Client1.';
    var port, server, client1, client2;

    async.series([
      // find a free port
      function (callback) {
        portscanner.findAPortNotInUse(PORT_MIN, PORT_MAX, 'localhost', function(err, freePort) {
          if (err) {
            throw new Error('Could not find a free port');
          }
          else {
            port = freePort;
            callback();
          }
        });
      },

      // start a proxy server
      function (callback) {
        server = new ProxyServer();
        server.listen(port, callback);
      },

      // connect client1
      function (callback) {
        client1 = requestify(new WebSocket('ws://localhost:' + port));
        client1.onopen = function() {
          client1.request({type: 'connect', id: 'client1'}, callback);
        };
      },

      // connect client2
      function (callback) {
        client2 = requestify(new WebSocket('ws://localhost:' + port));
        client2.onopen = function() {
          client2.request({type: 'connect', id: 'client2'}, callback);
        };

      },

      // send a message from client1 to client2
      function (callback) {
        client2.onrequest = function (message) {
          assert.deepEqual(message, MESSAGE);
          callback();
        };

        client1.request({
          type:'message',
          from: 'client1',
          to: 'client2',
          message: MESSAGE
        });
      },

      // done
      function (callback) {
        server.close();
        callback();
      }
    ], done);
  });

  it ('should create a proxyserver hosted via an express.js app', function (done) {
    var MESSAGE = 'Hello Client1.';
    var port, app, server, client1, client2;

    async.series([
      // find a free port
      function (callback) {
        portscanner.findAPortNotInUse(PORT_MIN, PORT_MAX, 'localhost', function(err, freePort) {
          if (err) {
            throw new Error('Could not find a free port');
          }
          else {
            port = freePort;
            callback();
          }
        });
      },

      // start an express server and add a proxy server
      function (callback) {
      // create an express server
        app = express();
        server = http.createServer(app);

        var proxyServer = new ProxyServer({server: server});

        // start the server
        server.listen(port, callback);
      },

      // connect client1
      function (callback) {
        client1 = requestify(new WebSocket('ws://localhost:' + port));
        client1.onopen = function() {
          client1.request({type: 'connect', id: 'client1'}, callback);
        };
      },

      // connect client2
      function (callback) {
        client2 = requestify(new WebSocket('ws://localhost:' + port));
        client2.onopen = function() {
          client2.request({type: 'connect', id: 'client2'}, callback);
        };

      },

      // send a message from client1 to client2
      function (callback) {
        client2.onrequest = function (message) {
          assert.deepEqual(message, MESSAGE);
          callback();
        };

        client1.request({
          type:'message',
          from: 'client1',
          to: 'client2',
          message: MESSAGE
        });
      },

      // done
      function (callback) {
        server.close();
        callback();
      }
    ], done);
  });

});
