var _ = require('underscore'),
    ws = require('ws'),
    async = require('async'),
    uuid = require('node-uuid'),
    WebSocket = require('./WebSocket'),
    requestify = require('./requestify');

var PROXY_SERVER_URL = 'ws://localhost:3000';

/**
 * Host
 * Can host local and remote objects
 * @param {Object} [options] Options for the host. Available:
 *                            {String} [id]
 *                                A unique id for this host. If not provided,
 *                                a uuid is generated and used as id.
 *                            {String} [proxyServer]
 *                                Url for a custom proxy server.
 *                                client = new WebSocket('ws://localhost:' + port);
 * @constructor
 */
function Host(options) {
  this.id = options && options.id || uuid.v4();

  // ProxyServer connection data
  this.proxyServer = {
    url: null,
    socket: null
  };

  this.hosts = {};    // all known and connected hosts
  this.objects = {};  // all locally hosted objects
  this.proxies = {};  // all local and remote objects
}

/**
 * Connect to a proxy server
 *
 * Usage:
 *   connect(callback);
 *   connect(url, callback);
 *
 * Where:
 *   {String} [url]        Url of the proxy server,
 *                              'ws://localhost:3000' by default.
 *   {function} [callback] Called after the Host is connected, called as
 *                         callback(err, result)
 *
 * @param {...} args
 */
Host.prototype.connect = function connect(args) {
  var me = this;

  // parse arguments
  var url, callback;
  if (arguments.length < 2) {
    url = PROXY_SERVER_URL;
    callback = arguments[0];
  }
  else {
    url = arguments[0];
    callback = arguments[1];
  }

  // disconnect first
  this.disconnect();

  // open a new socket
  var socket = requestify(new WebSocket(url));
  this.proxyServer.url = url;
  this.proxyServer.socket = socket;

  // create a handler for incoming requests
  // rpc = {object: String, method: String, params: Object | null}
  socket.onrequest = function(message, callback) {
    var object;

    switch (message.type) {
      case 'locate':
          object = me.objects[message.object];
          callback(null, object ? true : false);
          /* TODO
          if (object) {
            // object found, return an array with the functions
            var methods = Object.keys(object).filter(function (prop) {
              return typeof prop === 'function';
            });
            callback(null, methods);
          }
          else {
            // object not found
            callback(null, null);
          }
          */
        break;

      case 'rpc':
          object = me.objects[message.object];
          if (object) {
            var fn = object[message.method];
            if (fn) {
              // TODO: change to promise based callbacks
              var params = getParamNames(fn).map(function (name) {
                return message.params[name];
              });
              params[params.length - 1] = callback;

              try {
                fn.apply(object, params);
              }
              catch (err) {
                callback (err.toString(), null);
              }
            }
            else {
              callback('Method "' + rpc.method + '" not found on object "' + rpc.object + '"', null);
            }
          }
          else {
            callback('Object "' + rpc.object + '" not found', null);
          }
        break;
    }

  };

  socket.onopen = function() {
    // let the proxy server know my id
    socket.request({type: 'connect', id: me.id}, callback);
  };

  // TODO: handle onerror
};

/**
 * Disconnect from the proxyServer
 * @param {function} [callback]
 */
Host.prototype.disconnect = function disconnect(callback) {
  var proxyServer = this.proxyServer;
  if (proxyServer.socket) {
    proxyServer.socket.request({type: 'disconnect', id: this.id}, function () {
      proxyServer.socket.close();

      proxyServer.url = null;
      proxyServer.socket = null;

      if (callback) callback();
    });
  }
  else {
    if (callback) callback();
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
Host.prototype.add = function add (object) {
  var id = uuid.v4(); // generate a new id

  // register object
  this.objects[id] = object;

  return id;
};

/**
 * Get an object proxy from the host. Returns null if not found
 * @param {String} id
 * @param {Function} callback   Called with two parameters:
 *                              {Object} error
 *                              {Object | null} proxy
 *
 */
Host.prototype.find = function find (id, callback) {
  var proxy = this.proxies[id] || null;

  try {
    if (proxy) {
      callback(null, proxy);
    }
    else {
      var object = this.objects[id];
      if (object) {
        // create local proxy
        proxy = this._createLocalProxy(object);
        proxy.id = id;
        this.proxies[id] = proxy;

        callback(null, proxy);
      }
      else {
        // search all remote peers for this object, if found, create a remote proxy
        var me = this;
        this.locate(id, function (err, hostId) {
          if (hostId) {
            // TODO: connect to the host if not yet connected

            // create a remote proxy for the object
            // TODO: create a real remote proxy
            proxy = me._createRemoteProxy(hostId, id);
            proxy.id = id;
            me.proxies[id] = proxy;

            callback(null, proxy);
          }
        });

        async.filter(Object.keys(this.hosts), function (hostId, callback) {
          host.find(id, function (err, proxy) {
            callback(proxy !== null);
          });
        }, function (results) {
          if (results.length) {
            // found: this remote host has the object we where looking for.
            var host = results[0];

            // create a remote proxy for the object
            // TODO: create a real remote proxy
            proxy = me._createLocalProxy(object);
            proxy.id = id;
            me.proxies[id] = proxy;

            callback(null, proxy);
          }
          else {
            callback(null, null);
          }
        });

        this.hosts.forEach(function (host) {
          host.find(id, function (err, proxy) {
            if (proxy) {
              // found: this remote host has the object we where looking for.

              // create a remote proxy for the object
              // TODO: create a real remote proxy
              proxy = me._createLocalProxy(object);
              proxy.id = id;
              me.proxies[id] = proxy;

              callback(null, proxy);
            }
          });
        });
      }
    }
  }
  catch (err) {
    callback(err, 0);
  }
};

/**
 * Locate the host of an object by the objects id
 * @param {String} id
 * @param {function} callback     Called as callback(err, hostId)
 */
Host.prototype.locate = function locate (id, callback) {
  var me = this;
  var err, hostId;

  if (id in this.objects) {
    // object exists locally
    err = null;
    hostId = this.id;
    callback(err, hostId);
  }
  else {
    // search other hosts for this object
    var socket = this.proxyServer.socket;
    if (socket) {
      var foundHost = null;

      function findObject(host, callback) {
        if (host !== me.id) {
          var envelope = {
            type: 'message',
            to: host,
            message: {
              type: 'locate',
              object: id
            }
          };

          socket.request(envelope, function (err, exists) {
            if (exists) {
              foundHost = host;
            }
            callback();
          });
        }
        else {
          callback();
        }
      }

      socket.request({type: 'list'}, function (err, hosts) {
        async.each(hosts, findObject, function () {
          callback(null, foundHost);
        });
      });
    }
    else {
      // not found
      callback(null, null);
    }
  }
};

/**
 * Create a proxy for a local object
 * @param {Object} object
 * @returns {Object} proxy
 * @private
 */
Host.prototype._createLocalProxy = function _createLocalProxy (object) {
  var proxy = {};

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

  return proxy;
};

/**
 * Create a proxy for a remote object
 * @param {String} hostId
 * @param {String} objectId
 * @returns {Object} proxy
 * @private
 */
Host.prototype._createRemoteProxy = function _createRemoteProxy (hostId, objectId) {
  var proxy = {};

  // TODO: implement remote proxy creation

  return proxy;
};

/**
 * Remove an object from the host
 * @param id
 */
Host.prototype.remove = function remove (id) {
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

/**
 * Retrieve the parameter names of a function
 * http://stackoverflow.com/a/9924463/1069529
 * @param {function} fn
 * @return {String[]} paramNames
 */
function getParamNames(fn) {
  var fnStr = fn.toString();
  return fnStr.slice(fnStr.indexOf('(')+1, fnStr.indexOf(')')).match(/([^\s,]+)/g);
}

// module exports
module.exports = Host;