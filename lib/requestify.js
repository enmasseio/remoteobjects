var uuid = require('node-uuid');

var TIMEOUT = 60000; // ms
// TODO: make timeout an option

/**
 * Wrap a socket in a request/response handling layer.
 * Requests are wrapped in an envelope with id and data, and responses
 * are packed in an envelope with this same id and response data.
 *
 * The socket is extended with functions:
 *     request(data, callback)
 *     onrequest(data, callback)
 *
 * @param {Socket} socket
 */
module.exports = function requestify (socket) {
  (function () {
    var queue = {};   // queue with requests in progress

    if ('request' in socket) {
      throw new Error('Socket already has a request property');
    }

    /**
     * Send a request
     * @param {JSON} data
     * @param {Function} callback
     */
    socket.request = function request (data, callback) {
      // put the data in an envelope with id
      var id = uuid.v4();
      var envelope = {
        id: id,
        data: data
      };

      // add the request to the list with requests in progress
      queue[id] = {
        callback: callback,
        timeout: setTimeout(function () {
          delete queue[id];
          callback('Timeout', null);
        }, TIMEOUT)
      };

      socket.send(JSON.stringify(envelope));
    };

    /**
     * Handle an incoming request.
     * @param {String} request
     * @param {Function} callback     Must be invoked as callback(error, response)
     */
    socket.onrequest = function onrequest (request, callback) {
      // this function must be implemented by the socket
      callback('No onrequest handler implemented', null);
    };

    /**
     * Event handler, handles incoming messages
     * @param {Object} event
     */
    socket.onmessage = function onmessage (event) {
      var data = event.data;
      if (data.charAt(0) == '{') {
        var envelope = JSON.parse(data);

        // match the request from the id in the response
        var request = queue[envelope.id];
        if (request) {
          // handle an incoming response
          clearTimeout(request.timeout);
          delete queue[envelope.id];

          // invoke the callback with the response data
          if (request.callback) {
            request.callback(envelope.error, envelope.data);
          }
        }
        else {
          // handle an incoming request
          socket.onrequest(envelope.data, function (error, data) {
            var response = {
              id: envelope.id,
              data: data,
              error: error
            };
            socket.send(JSON.stringify(response));
          });
        }
      }
    }
  })();
};
