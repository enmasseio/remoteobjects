var _ = require('underscore'),
    async = require('async'),
    uuid = require('node-uuid'),
    WebSocket = require('./WebSocket'),
    requestify = require('./requestify');

var PROXY_SERVER_URL = 'ws://remoteobjects.herokuapp.com/';

/**
 * Host
 * Can host local and remote objects
 * @param {Object} [options] Options for the host. Available:
 *                            {String} [id]
 *                                A unique id for this host. If not provided,
 *                                a uuid is generated and used as id.
 * @constructor
 */
function Host(options) {
  this.id = options && options.id || uuid.v4();

  // ProxyServer connection data
  this.proxyServer = {
    url: null,
    socket: null
  };

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
  // TODO: describe the socket interface of a Host
  socket.onrequest = function(message, callback) {
    var object;

    switch (message.type) {
      case 'exists':
          // test whether an object exists on this host
          object = me.objects[message.object];
          callback(null, object ? true : false);
        break;

      case 'methods':
          // TODO: make a more extensive way to describe functions, also describe their arguments
          // retrieve the methods of an object (if existing)
          object = me.objects[message.object];
          if (object) {
            // object found, return an array with the functions
            var methods = _getMethodNames(object);
            callback(null, methods);
          }
          else {
            // object not found
            callback(null, null);
          }
        break;

      case 'invoke':
          // invoke a method on an object
          object = me.objects[message.object];
          if (object) {
            _invoke(object, message.method, message.params, callback);
          }
          else {
            callback({code: 404, text: 'Object "' + message.object + '" not found'}, null);
          }
        break;
    }
  };

  // TODO: nicely handle problems with opening the socket
  socket.onopen = function() {
    // let the proxy server know my id
    socket.request({type: 'connect', id: me.id}, callback);
  };

  socket.onerror = function (err) {
    console.log(err);
  }
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
 * @param {String} [objectId]
 * @param {Object} object
 * @param {Function} [callback]   Called as callback(error: Object, objectId: String)
 */
Host.prototype.add = function add (objectId, object, callback) {
  if (arguments.length == 2 && typeof arguments[1] === 'function') {
    // add(object, callback)
    callback = object;
    object = objectId;
    objectId = uuid.v4(); // generate a new id
  }
  else {
    // add(objectId, object, callback)
  }

  // register object
  this.objects[objectId] = object;

  if (callback) {
    callback(null, objectId);
  }
};

/**
 * Create an object proxy. Returns an empty proxy when object is not found.
 * @param {String} objectId
 * @param {Function} callback   Called as callback(error: Object, proxy: Object}
 *
 */
Host.prototype.proxy = function proxy (objectId, callback) {
  var proxy, newProxy;

  try {
    proxy = this.proxies[objectId] || null;
    if (proxy) {
      // proxy already exists
      callback(null, proxy);
    }
    else {
      // create new proxy object
      proxy = {};
      this.proxies[objectId] = proxy;

      // locate the object
      var object = this.objects[objectId];
      if (object) {
        // create local proxy
        newProxy = this._createLocalProxy(object);
        newProxy.id = objectId;
        _replace(proxy, newProxy);

        callback(null, proxy);
      }
      else {
        // find all methods of this object
        var me = this;
        this.locate(objectId, function (err, hostId) {
          if (err) {
            callback(err, null);
          }
          else {
            if (hostId) {
              // retrieve methods of the object
              me.methods(objectId, function (err, methods) {
                if (err) {
                  callback(err);
                }
                else {
                  // create a remote proxy for the object
                  newProxy = me._createRemoteProxy(hostId, objectId, methods);
                  newProxy.id = objectId;
                  _replace(proxy, newProxy);

                  callback(null, proxy);
                }
              });
            }
            else {
              callback(null, proxy);
            }
          }
        });
      }
    }
  }
  catch (err) {
    callback({code: 500, text: err.toString()}, 0);
  }
};

/**
 * Locate the host of a local or remote object by the objects id
 * @param {String} objectId
 * @param {function} callback     Called as callback(err, hostId)
 */
Host.prototype.locate = function locate (objectId, callback) {
  var me = this;
  var err, hostId;

  if (objectId in this.objects) {
    // object exists locally
    err = null;
    hostId = this.id;
    callback(err, hostId);
  }
  else {
    // TODO: cache found locations of objects

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
              type: 'exists',
              object: objectId
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
 * Retrieve the methods of a remote object
 * @param {String} objectId
 * @param {function} callback     Called as callback(err: Object, methods: Array)
 */
Host.prototype.methods = function methods (objectId, callback) {
  var object = this.objects[objectId];
  if (object) {
    // local
    var methods = _getMethodNames(object);
    callback(null, methods);
  }
  else {
    // remote
    var socket = this.proxyServer.socket;
    if (socket) {
      this.locate(objectId, function (err, hostId) {
        if (hostId) {
          var envelope = {
            type: 'message',
            to: hostId,
            message: {
              type: 'methods',
              object: objectId
            }
          };

          socket.request(envelope, callback);
        }
        else if (err) {
          callback(err, null);
        }
        else {
          // object not found
          callback({code: 404, text: 'Object not found'}, null);
        }
      });
    }
  }
};

/**
 * Invoke a local or remote object
 * @param {String} objectId
 * @param {String} method
 * @param {Object | Array | null} params
 * @param {Function} callback     Called as callback(err, result)
 */
Host.prototype.invoke = function invoke (objectId, method, params, callback) {
  var object = this.objects[objectId];
  if (object) {
    _invoke(object, method, params, callback);
  }
  else {
    var socket = this.proxyServer.socket;
    if (socket) {
      this.locate(objectId, function (err, hostId) {
        if (hostId) {
          var envelope = {
            type: 'message',
            to: hostId,
            message: {
              type: 'invoke',
              object: objectId,
              method: method,
              params: params
            }
          };

          socket.request(envelope, callback);
        }
        else if (err) {
          callback(err, null);
        }
        else {
          // object not found
          callback({code: 404, text: 'Object not found'}, null);
        }
      });
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
 * @param {String[]} methods
 * @returns {Object} proxy
 * @private
 */
Host.prototype._createRemoteProxy = function _createRemoteProxy (hostId, objectId, methods) {
  var me = this;
  var proxy = {};

  _.each(methods, function (method) {
    proxy[method] = function () {
      var args = Array.prototype.slice.apply(arguments);
      var callback = args.pop();
      me.invoke(objectId, method, args, callback);
    }
  });

  return proxy;
};

/**
 * Remove an object from the host
 * @param {String} objectId
 * @param {Function} callback   Called as callback(error: Object)
 */
Host.prototype.remove = function remove (objectId, callback) {
  delete this.objects[objectId];

  var proxy = this.proxies[objectId];
  if (proxy) {
    _.each(proxy, function (value, key) {
      // replace all function with a function returning an object removed error
      if (typeof value === 'function') {
        proxy[key] = _fnRemoved;
      }
    });

    delete this.proxies[objectId];
  }

  callback(null);
};

/**
 * Invoke a method on an object
 * @param {Object} object
 * @param {String} method
 * @param {Object | Array | null} params   A map with named parameters,
 *                                         or array with unnamed parameters
 * @param {function} callback
 * @private
 */
function _invoke (object, method, params, callback) {
  // TODO: change to promise based callbacks
  var fn = object[method];
  if (fn) {
    // transform the object with named parameters into an array, matching the
    // functions arguments.
    var paramsArray;
    if (Array.isArray(params)) {
      // array with unnamed parameters
      paramsArray = params.concat(callback);
    }
    else if (params instanceof Object) {
      // object with named parameters
      paramsArray = _getParamNames(fn).map(function (name) {
        return params[name];
      });
      paramsArray[paramsArray.length - 1] = callback;
    }
    else {
      paramsArray = [callback];
    }

    // invoke the function on the object
    try {
      fn.apply(object, paramsArray);
    }
    catch (err) {
      callback ({code: 500, text: err.toString()}, null);
    }
  }
  else {
    callback({code: 404, text: 'Method "' + method + '" ' +
        'not found on object "' + object + '"'}, null);
  }
}

/**
 * Helper function, throws an error
 * @private
 */
function _fnRemoved () {
  throw {code: 410, text: 'Object is removed'};
}

/**
 * Retrieve the parameter names of a function
 * http://stackoverflow.com/a/9924463/1069529
 * @param {function} fn
 * @return {String[]} paramNames
 * @private
 */
function _getParamNames(fn) {
  var fnStr = fn.toString();
  return fnStr.slice(fnStr.indexOf('(')+1, fnStr.indexOf(')')).match(/([^\s,]+)/g);
}

/**
 * Get a list with the method names of an object
 * @param {Object} object
 * @returns {Array} methods
 * @private
 */
function _getMethodNames(object) {
  return Object.keys(object).filter(function (prop) {
    return typeof object[prop] === 'function';
  });
}

/**
 * Replace all properties of an object with new properties
 * @param {Object} object
 * @param {Object} newProperties
 * @private
 */
function _replace(object, newProperties) {
  _.each(object, function (prop) {
    delete object[prop];
  });
  _.extend(object, newProperties);
}

// module exports
module.exports = Host;
