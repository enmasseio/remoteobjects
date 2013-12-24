var assert = require('assert'),
    async = require('async'),
    remoteobjects = require('../lib/remoteobjects'),
    ProxyServer = require('../lib/proxyserver/ProxyServer'),
    Host = require('../lib/Host');

describe('remoteobjects', function() {

  it('should export Host', function () {
    assert.strictEqual(remoteobjects.Host, Host);
  });

  it('should export ProxyServer', function () {
    assert.strictEqual(remoteobjects.ProxyServer, ProxyServer);
  });

});

