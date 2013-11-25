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

    beforeEach(function (done) {
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

      // get a proxy to the object
      host.find(id, function (err, res) {
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

    it ('should find a proxy by its id', function (done) {
      host.find(id, function (err, proxy2) {
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
              callback(null, a + b);
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

    it ('should locate a remote object', function (done) {
      host2.locate(addId, function (err, host) {
        assert.equal(err, null);
        assert.equal(host, 'host1');
        done();
      });
    });

    it ('should not find a non-existing remote object', function (done) {
      var nonExistingId = 'xyz';
      host2.locate(nonExistingId, function (err, host) {
        assert.equal(err, null);
        assert.equal(host, null);
        done();
      });
    });

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
