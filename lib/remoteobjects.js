var ProxyServer = require('./proxyserver/ProxyServer'),
    Host = require('./Host');

/**
 * Add an object to the default host. The object can be called from a remote peer.
 * An id of the added object is returned. The object can be accessed via its
 * proxy, which can be retrieved using the function host.get(id)
 *
 * Usage:
 *   add(object, callback)
 *   add(objectId, object, callback)
 *
 * @param {String} [objectId]
 * @param {Object} object
 * @param {Function} callback   Called as callback(error: Object objectId: String)
 */
exports.add = function add (objectId, object, callback) {
  var args = arguments;
  _getGlobalHost(function (host) {
    host.add.apply(host, args);
  });
};

/**
 * Remove an object from the default host
 * @param {Object} objectId
 * @param {Function} callback    Called as callback(error: Object)
 */
exports.remove = function remove (objectId, callback) {
  _getGlobalHost(function (host) {
    host.remove(objectId, callback);
  });
};

/**
 * Create an object proxy. Returns an empty proxy when object is not found.
 * @param {String} objectId
 * @param {Function} callback   Called as callback(error: Object, proxy: Object}
 *
 */
exports.proxy = function proxy (objectId, callback) {
  _getGlobalHost(function (host) {
    host.proxy(objectId, callback)
  });
};


exports.ProxyServer = ProxyServer;
exports.Host = Host;


/**
 * Create a global host
 * @param {Function} callback   Invoked as callback(host: Host)
 * @private
 */
function _getGlobalHost (callback) {
  if (!globalHost) {
    globalHost = new Host();
    globalHost.connect(function () {
      callback(globalHost)
    });
  }
  else {
    callback(globalHost);
  }
}

var globalHost = null;
