var assert = require('assert'),
    async = require('async'),
    ws = require('ws'),
    WebSocket = require('../lib/WebSocket'),
    requestify = require('../lib/requestify');

describe('requestify', function() {

  it ('should turn a socket in a request/response channel', function (done) {
    var port = 4000;
    var server, client;

    async.series([
      function (callback) {
        server = new ws.Server({port: port});

        server.on('connection', function(client) {
          requestify(client);

          client.onrequest = function onrequest (request, callback) {
            callback(null, request);
          };
        });

        callback();
      },

      function (callback) {
        client = new WebSocket('ws://localhost:' + port);
        requestify(client);

        client.onopen = function () {
          callback();
        }
      },

      // send a string
      function (callback) {
        client.request('hello there!', function (err, data) {
          assert.equal(err, null);
          assert.equal(data, 'hello there!');
          callback();
        });
      },

      // send a JSON object
      function (callback) {
        client.request({message: 'hello there!', id: 123}, function (err, data) {
          assert.equal(err, null);
          assert.deepEqual(data, {message: 'hello there!', id: 123});
          callback();
        });
      },

      // done
      function () {
        done();
      }
    ]);

  });

});
