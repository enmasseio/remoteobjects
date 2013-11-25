var WebSocketServer = require('ws').Server,
    requestify = require('./requestify');

/**
 * A proxy server to pipe
 *
 * This proxy server will become redundant as soon as the hosts can connect
 * to each other directly using WebRTC.
 *
 * Clients connecting to the ProxyServer must requestify their socket, and
 * use request and onrequest to send and receive requests/responses
 *
 * Requests can be send to this server like:
 *
 *     {"type":"connect","id":"ID"}
 *     {"type":"disconnect","id":"ID"}
 *     {"type":"list"}
 *     {"type":"message","from":"ID_FROM","to":"ID_TO","message":"TEXT_MESSAGE"}
 *
 * @param {Object} options.     Available options:
 *                              {Number} [port]  3000 by default
 */
function ProxyServer (options) {
  this.port = (options && options.port) ? parseFloat(options.port) : 3000;
  this.server = null;
  this.peers = {};
}

/**
 * Open the proxy server, start listening
 */
ProxyServer.prototype.open = function open () {
  if (!this.server) {
    this.server = new WebSocketServer({port: this.port});

    var me = this;

    this.server.on('connection', function(client) {
      client = requestify(client);

      client.onrequest = function(envelope, callback) {
        switch (envelope.type) {
          case 'connect':
              // set the id for this client
              var id = envelope.id;
              if (!client.id) {
                client.id = id;
                me.peers[id] = client;
              }
              callback(null, 'connected');
            break;

          case 'disconnect':
              delete me.peers[client.id];
              callback(null, 'disconnected');
            break;

          // TODO: remove function list, instead create broadcast functionality
          case 'list':
              callback(null, me.list());
            break;

          case 'message':
            // send the message to the addressed peer
            var to = envelope.to;
            var peer = me.peers[to];
            if (peer) {
              peer.request(envelope.message, callback);
            }
            else {
              // peer not found
              callback('Peer not found. (id = "' + to + '")', null);
            }
            break;

          default:
            // whoops
            callback('Unknown message type "' + envelope.type + '"', null);
            break;
        }
      };

      client.on('close', function () {
        delete me.peers[client.id];
      });
    });
  }
};

/**
 * Close the proxy server, stop listening
 */
ProxyServer.prototype.close = function close () {
  if (this.server) {
    this.server.close();
    this.server = null;
  }
};

/**
 * List all clients connected to the server
 * @return {String[]} ids
 */
ProxyServer.prototype.list = function list () {
  return Object.keys(this.peers);
};

// module exports
module.exports = ProxyServer;
