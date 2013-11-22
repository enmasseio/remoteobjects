var assert = require('assert'),
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
    var server = new ProxyServer();
    server.open();

    var client1 = requestify(new WebSocket('ws://localhost:3000'));
    client1.onopen = function() {
      client1.request({ type: 'id', id: 'client1' });
    };

    // TODO: replace this timeout for a reliable test
    setTimeout(function () {
      assert.deepEqual(server.list(), ['client1']);

      server.close();
      done();
    }, 100);

  });

  it ('should send a request from one peer to another', function (done) {
    var MESSAGE = 'Hello Client1.';
    var server = new ProxyServer();
    server.open();

    var client1 = requestify(new WebSocket('ws://localhost:3000'));
    client1.onopen = function() {
      client1.request({type: 'id', id: 'client1'});
    };

    var client2 = requestify(new WebSocket('ws://localhost:3000'));
    client2.onopen = function() {
      client2.request({type: 'id', id: 'client2'});

      client2.onrequest = function (message) {
        assert.deepEqual(message, MESSAGE);

        server.close();
        done();
      }
    };

    // TODO: replace this timeout for a reliable test
    setTimeout(function () {
      client1.request({
        type:'message',
        from: 'client1',
        to: 'client2',
        message: MESSAGE
      });
    }, 100);
  });

});
