var assert = require('assert'),
    async = require('async'),
    ProxyServer = require('../lib/ProxyServer'),
    Host = require('../lib/Host');

describe('host', function() {
  var proxyServer = null;

  // start a proxy server
  before(function () {
    proxyServer = new ProxyServer();
    proxyServer.open();
  });

  // stop a proxy server
  after(function () {
    proxyServer.close();
  });

  it ('should create a new host', function () {
    var host = new Host();
    assert.ok(isUuid(host.id));
  });

  it ('should create a new host with custom id', function () {
    var id = 'customId';
    var host = new Host({id: id});
    assert.equal(host.id, id);
  });

  it ('should connect and disconnect a host with proxy server', function (done) {
    var host = new Host();
    host.connect(function () {
      assert.deepEqual(proxyServer.list(), [host.id]);

      host.disconnect(function (err, result) {
        assert.deepEqual(proxyServer.list(), []);

        done();
      });
    });
  });

  it ('should connect and disconnect two hosts with proxy server', function (done) {
    var host1, host2;

    async.series([
      function (callback) {
        host1 = new Host();
        host1.connect(function () {
          assert.deepEqual(proxyServer.list(), [host1.id]);
          callback();
        });
      },

      function (callback) {
        host2 = new Host();
        host2.connect(function () {
          assert.deepEqual(proxyServer.list(), [host1.id, host2.id]);
          callback();
        });
      },

      function (callback) {
        host1.disconnect(callback);
      },

      function (callback) {
        host2.disconnect(callback);
      },

      function (callback) {
        assert.deepEqual(proxyServer.list(), []);
        callback();
      }
    ], done);

  });


  // TODO: test with custom proxy server

  describe('local objects', function () {
    var host, object, id, proxy;

    before(function (done) {
      // create a host
      host = new Host();

      // create an object
      object = {
        add: function (a, b, callback) {
          callback(null, a + b);
        }
      };

      // add the object to the host
      id = host.add(object);

      // create a proxy to the object
      host.proxy(id, function (err, res) {
        proxy = res;

        done();
      });
    });

    it ('should create a new host', function () {
      assert.ok(host instanceof Host);
    });

    it ('should add an object to the host', function () {
      assert.ok(isUuid(proxy.id));
      assert.ok(typeof proxy.add === 'function');
    });

    it ('should create a proxy from an object id', function (done) {
      host.proxy(id, function (err, proxy2) {
        assert.strictEqual(proxy2.id, id);
        assert.ok(typeof proxy2.add === 'function');

        done();
      });
    });

    it ('should execute a function via a proxy', function () {
      proxy.add(2, 3, function (err, result) {
        assert.strictEqual(err, null);
        assert.strictEqual(result, 5);
      });
    });

    // TODO: test removing a local object (with existing proxies)

  });

  describe('remote objects', function () {
    var host1, host2, object, addId;

    before(function (done) {
      async.series([
        function (callback) {
          host1 = new Host({id: 'host1'});
          host1.connect(callback);

          // create an object
          object = {
            add: function (a, b, callback) {
              if (a === undefined) {
                callback({code: 400, text: 'Parameter a undefined'}, null);
              }
              else if (b === undefined) {
                callback({code: 400, text: 'Parameter b undefined'}, null);
              }
              else {
                callback(null, a + b);
              }
            }
          };

          // add the object to the host
          addId = host1.add(object);
        },

        function (callback) {
          host2 = new Host({id: 'host2'});
          host2.connect(callback);
        }
      ], done);
    });

    after(function (callback) {
      async.parallel([
        function (callback) {
          host1.disconnect(callback);
        },
        function (callback) {
          host2.disconnect(callback);
        }
      ], callback);
    });

    it ('should locate a local object', function (done) {
      host1.locate(addId, function (err, host) {
        assert.equal(err, null);
        assert.equal(host, 'host1');
        done();
      });
    });

    it ('should locate a remote object', function (done) {
      host2.locate(addId, function (err, host) {
        assert.equal(err, null);
        assert.equal(host, 'host1');
        done();
      });
    });

    it ('should not find a non-existing object', function (done) {
      var nonExistingId = 'xyz';
      host2.locate(nonExistingId, function (err, host) {
        assert.equal(err, null);
        assert.equal(host, null);
        done();
      });
    });

    it ('should get the methods of a local object', function (done) {
      host1.methods(addId, function (err, methods) {
        assert.equal(err, null);
        assert.deepEqual(methods, ['add']);
        done();
      });
    });

    it ('should get the methods of a remote object', function (done) {
      host2.methods(addId, function (err, methods) {
        assert.equal(err, null);
        assert.deepEqual(methods, ['add']);
        done();
      });
    });

    it ('should invoke a local object with named parameters', function (done) {
      host1.invoke(addId, 'add', {a: 2, b: 4}, function (err, result) {
        assert.equal(err, null);
        assert.equal(result, 6);
        done();
      });
    });

    it ('should invoke a local object with unnamed parameters', function (done) {
      host1.invoke(addId, 'add', [2, 4], function (err, result) {
        assert.equal(err, null);
        assert.equal(result, 6);
        done();
      });
    });

    it ('should invoke a remote object with named parameters', function (done) {
      host2.invoke(addId, 'add', {a: 2, b: 4}, function (err, result) {
        assert.equal(err, null);
        assert.equal(result, 6);
        done();
      });
    });

    it ('should invoke a remote object with unnamed parameters', function (done) {
      host2.invoke(addId, 'add', [2, 4], function (err, result) {
        assert.equal(err, null);
        assert.equal(result, 6);
        done();
      });
    });

    it ('should throw an error when invoking a non-existing object', function (done) {
      host2.invoke('xyz', 'add', {a: 2, b: 4}, function (err, result) {
        assert.deepEqual(err, {code: 404, text: 'Object not found'});
        assert.equal(result, null);
        done();
      });
    });

    it ('should create a local proxy', function (done) {
      host1.proxy(addId, function (err, proxy) {
        assert.equal(err, null);
        assert.equal(typeof proxy.add, 'function');
        done();
      });
    });

    it ('should create a remote proxy', function (done) {
      host2.proxy(addId, function (err, proxy) {
        assert.equal(err, null);
        assert.equal(typeof proxy.add, 'function');
        done();
      });
    });

    it ('should invoke an object via a local proxy', function (done) {
      host1.proxy(addId, function (err, proxy) {
        proxy.add(2, 4, function (err, result) {
          assert.equal(err, null);
          assert.equal(result, 6);
          done();
        });
      });
    });

    it ('should invoke an object via a remote proxy', function (done) {
      host2.proxy(addId, function (err, proxy) {
        proxy.add(2, 4, function (err, result) {
          assert.equal(err, null);
          assert.equal(result, 6);
          done();
        });
      });
    });

    // TODO: test creating a remote proxy

    it ('should throw an error on invalid invocation', function (done) {
      async.parallel([
          function (callback) {
            // forget to define a
            host2.invoke(addId, 'add', {b: 4}, function (err, result) {
              assert.deepEqual(err, {code: 400, text: 'Parameter a undefined'});
              assert.equal(result, null);
              callback();
            });
          },

          function (callback) {
            // forget to define b
            host2.invoke(addId, 'add', {a: 2}, function (err, result) {
              assert.deepEqual(err, {code: 400, text: 'Parameter b undefined'});
              assert.equal(result, null);
              callback();
            });
          }
      ], done);
    });

    // TODO: test removing a remote object (with existing proxies to this object)

    // TODO: test removing a remote host (with existing proxies to this host)

  });

  /**
   * Test whether a value contains a uuid
   * helper function
   * @param {String} value
   * @returns {boolean}
   */
  var isUuid = function (value) {
    return /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/.test(value);
  }
});
