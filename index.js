var Host = require('./lib/Host');

/**
 * Create a new host for remote objects
 * @param {Object} [options] Options for the host. Available:
 *                            {String} id:
 *                                A unique id for this host. If not provided,
 *                                a uuid is generated and used as id.
 * @return {Host} host
 */
exports.host = function host (options) {
  return new Host(options);
};
