var Host = require('./lib/Host');

/**
 * Create a new host for remote objects
 * @param {String} [id]   A unique id for this host. If not provided, a uuid
 *                        is generated and used as id.
 * @return {Host} host
 */
exports.host = function host (id) {
  return new Host(id);
};
