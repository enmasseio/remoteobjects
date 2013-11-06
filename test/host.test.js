var assert = require('assert'),
    remoteobjects = require('../index'),
    Host = require('../lib/Host');

describe('host', function() {

  it ('should create a new host', function () {
    var host = remoteobjects.host();
    assert.ok(host instanceof Host);
    assert.ok(isUuid(host.id));
  });

  it ('should create a new host with custom id', function () {
    var id = 'customId';
    var host = remoteobjects.host(id);
    assert.ok(host instanceof Host);
    assert.equal(host.id, id);
  });


  describe('network', function () {
    // TODO
  });

  describe('local objects', function () {
    var host, object, id, proxy;

    before(function () {
      // create a host
      host = remoteobjects.host();

      // create an object
      object = {
        add: function (a, b, callback) {
          callback(null, a + b);
        }
      };

      // add the object to the host
      id = host.add(object);

      // get a proxy to the object
      proxy = host.get(id);
    });

    it ('should create a new host', function () {
      assert.ok(host instanceof Host);
    });

    it ('should add an object to the host', function () {
      assert.ok(isUuid(proxy.id));
      assert.ok(typeof proxy.add === 'function');
    });

    it ('should get a proxy by its id', function () {
      var proxy2 = host.get(id);

      assert.strictEqual(proxy2.id, id);
      assert.ok(typeof proxy2.add === 'function');
    });

    it ('should execute a function via a proxy', function () {
      proxy.add(2, 3, function (err, result) {
        assert.strictEqual(err, null);
        assert.strictEqual(result, 5);
      });
    });

  });

  describe('remote objects', function () {
    // TODO: test remote objects
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
