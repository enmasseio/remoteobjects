var WebSocketServer = require('ws').Server;

/**
 * A proxy server to pipe
 *
 * This proxy server will become redundant as soon as the hosts can connect
 * to each other directly using WebRTC.
 *
 * Messages can be send to this server like:
 *
 *     {"type":"id","id":"ID"}
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
      client.on('message', function(data) {
        var envelope = JSON.parse(data);

        switch (envelope.type) {
          case 'id':
            // set the id for this client
              var id = envelope.id;
              if (!client.id) {
                client.id = id;
                me.peers[id] = client;
              }
            break;

          case 'message':
            // send a message to an other client
            var to = envelope.to;
            var peer = me.peers[to];
            if (peer) {
              peer.send(envelope.message);
            }
            else {
              // peer not found
              client.send('Peer not found. (id = "' + to + '")');
            }
            break;

          default:
            // whoops
            client.send('Unknown message type "' + envelope.type + '"');
            break;
        }
      });

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
  var ids = [];

  if (this.server) {
    this.server.clients.forEach(function (client) {
      ids.push(client.id);
    });
  }

  return ids;
};

// module exports
module.exports = ProxyServer;
