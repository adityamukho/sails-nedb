/**
 * Module Dependencies
 */
var Connection = require('./connection'),
  Errors = require('waterline-errors').adapter;

module.exports = (function () {
  var connections = {};

  var adapter = {
    identity: 'sails-nedb',
    pkFormat: 'string',
    syncable: true,
    migrate: 'alter',
    defaults: {
      schema: false,
      filePath: '.tmp',
    },

    registerConnection: function (connection, collections, cb) {

      if (!connection.identity) return cb(Errors.IdentityMissing);
      if (connections[connection.identity]) return cb(Errors.IdentityDuplicate);

      connections[connection.identity] = new Connection(connection, collections);
      connections[connection.identity].initConn(cb);
    },

    teardown: function (conn, cb) {
      if (typeof conn == 'function') {
        cb = conn;
        conn = null;
      }
      if (conn == null) {
        connections = {};
        return cb();
      }
      if (!connections[conn]) return cb();
      delete connections[conn];
      cb();
    },

    describe: function (conn, coll, cb) {
      grabConnection(conn).describe(coll, cb);
    },

    define: function (conn, coll, definition, cb) {
      grabConnection(conn).createCollection(coll, definition, cb);
    },

    drop: function (conn, coll, relations, cb) {
      grabConnection(conn).dropCollection(coll, relations, cb);
    },

    find: function (conn, coll, options, cb) {
      grabConnection(conn).select(coll, options, cb);
    },

    create: function (conn, coll, values, cb) {
      grabConnection(conn).insert(coll, values, cb);
    },

    createEach: function (conn, coll, values, cb) {
      grabConnection(conn).insertEach(coll, values, cb);
    },

    update: function (conn, coll, options, values, cb) {
      grabConnection(conn).update(coll, options, values, cb);
    },

    destroy: function (conn, coll, options, cb) {
      grabConnection(conn).destroy(coll, options, cb);
    }
  };

  /**
   * Grab the connection object for a connection name
   *
   * @param {String} connectionName
   * @return {Object}
   * @api private
   */
  function grabConnection(connectionName) {
    return connections[connectionName];
  }

  // Expose adapter definition
  return adapter;

})();