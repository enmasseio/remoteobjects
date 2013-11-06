var _ = require('underscore'),
    uuid = require('node-uuid');

/**
 * Host
 * Can host local and remote objects
 * @param {String} [id]   A unique id for this host. If not provided, a uuid
 *                        is generated and used as id.
 * @constructor
 */
function Host(id) {
  this.id = id || uuid.v4();

  this.hosts = {};    // all known and connected hosts
  this.objects = {};  // all locally hosted objects
  this.proxies = {};  // all local and remote objects
}

/**
 * Connect to an other host in the peer to peer network.
 * @param {String} id   Id of the host to connect to
 */
Host.prototype.connect = function connect (id) {
  var host = this.hosts[id];
  if (!host) {
    host = {
      id: id
    };

    this.hosts[id] = host;
  }

  if (!host.connected) {
    // TODO: connect.
    // use some websocket solution
    // https://github.com/einaros/ws
    // https://github.com/Worlize/WebSocket-Node
  }
};

/**
 * Disconnect from a host.
 * @param {String} id   Id of the host to disconnect from
 */
Host.prototype.disconnect = function disconnect (id) {
  var host = this.hosts[id];
  if (host && host.connected) {
    // TODO: disconnect
  }
};

/**
 * Add an object to the host. The object can be called from a remote peer.
 * An id of the added object is returned. The object can be accessed via its
 * proxy, which can be retrieved using the function host.get(id)
 *
 * @param {Object} object
 * @return {String} id
 */
Host.prototype.add = function put (object) {
  var id = uuid.v4(); // generate a new id

  // register object
  this.objects[id] = object;

  return id;
};

/**
 * Get an object proxy from the host. Returns null if not found
 * @param id
 * @return {Object | null} proxy
 */
Host.prototype.get = function get (id) {
  var proxy = this.proxies[id] || null;

  if (!proxy) {
    var object = this.objects[id];
    if (object) {
      // create local proxy
      proxy = {
        id: id
      };
      this.proxies[id] = proxy;

      // create proxy methods to local object
      _.each(object, function (value, key) {
        // test reserved keys
        if (key === 'id') {
          throw new Error('Function name "id" not allowed on remote objects');
        }

        if (typeof value === 'function') {
          proxy[key] = value.bind(object);
        }
      });
    }
    else {
      // TODO: search all remote peers for this object, if found, create a remote proxy
    }
  }

  return proxy;
};

/**
 * Remove an object from the host
 * @param id
 */
Host.prototype.remove = function get (id) {
  delete this.objects[id];

  var proxy = this.proxies[id];
  if (proxy) {
    _.each(proxy, function (value, key) {
      // replace all function with a function returning an object removed error
      if (typeof value === 'function') {
        proxy[key] = fnRemoved;
      }
    });

    delete this.proxies[id];
  }
};

// helper function
function fnRemoved () {
  throw new Error('Object is removed');
}

// module exports
module.exports = Host;