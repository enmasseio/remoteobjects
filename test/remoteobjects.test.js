var assert = require('assert'),
    async = require('async'),
    remoteobjects = require('../lib/remoteobjects'),
    ProxyServer = require('../lib/proxyserver/ProxyServer'),
    Host = require('../lib/Host');

describe('remoteobjects', function() {

  it('should add, proxy, and remove an object', function (done) {
    var objectId = 'object1';

    async.series([
      // add
      function (callback) {
        var object = {
          add: function (a, b, callback) {
            callback(null, a + b);
          }
        };

        remoteobjects.add(objectId, object, function (err, id) {
          assert.equal(err, null);
          assert.equal(id, objectId);
          callback();
        });
      },

      // proxy
      function (callback) {
        remoteobjects.proxy(objectId, function(err, proxy) {
          assert.equal(err, null);
          assert.equal(typeof proxy.add, 'function');

          proxy.add(2, 4, function (err, result) {
            assert.equal(err, null);
            assert.strictEqual(result, 6);

            callback();
          });
        });
      },

      // remove
      function (callback) {
        remoteobjects.remove(objectId, function(err) {
          assert.equal(err, null);

          remoteobjects.proxy(objectId, function(err, proxy) {
            assert.equal(err, null);
            assert.equal(typeof proxy.add, 'undefined');
            callback();
          });
        });
      }
    ], done);

  });

  it('should export Host', function () {
    assert.strictEqual(remoteobjects.Host, Host);
  });

  it('should export ProxyServer', function () {
    assert.strictEqual(remoteobjects.ProxyServer, ProxyServer);
  });

});

