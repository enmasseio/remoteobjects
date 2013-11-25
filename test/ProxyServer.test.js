var assert = require('assert'),
    async = require('async'),
    WebSocket = require('ws'),
    ProxyServer = require('../lib/ProxyServer'),
    requestify = require('../lib/requestify');

describe('proxyserver', function() {

  it ('should create and open a proxy server', function (done) {
    var server = new ProxyServer();
    server.open();

    var client = new WebSocket('ws://localhost:3000');
    client.onopen = function() {
      server.close();
      done();
    };
  });

  it ('should set the id for a peer', function (done) {
    var server, client1;

    async.series([
        // start a proxy server
        function (callback) {
          server = new ProxyServer();
          server.open();
          callback();
        },

        // register a client
        function (callback) {
          client1 = requestify(new WebSocket('ws://localhost:3000'));
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
    var server, client1, client2;

    async.series([
      // start a proxy server
      function (callback) {
        server = new ProxyServer();
        server.open();
        callback();
      },

      // connect client1
      function (callback) {
        client1 = requestify(new WebSocket('ws://localhost:3000'));
        client1.onopen = function() {
          client1.request({type: 'connect', id: 'client1'}, callback);
        };
      },

      // connect client2
      function (callback) {
        client2 = requestify(new WebSocket('ws://localhost:3000'));
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
