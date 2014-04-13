/**
 * Module Dependencies
 */
var Connection = require('./lib/connection'),
  Errors = require('waterline-errors').adapter;

module.exports = (function () {
  var connections = {};

  var adapter = {
    identity: 'sails-nedb',
    syncable: true,
    migrate: 'alter',
    defaults: {
      schema: false,
      filePath: '.tmp',
    },

    // Register A Connection
    registerConnection: function (connection, collections, cb) {

      if (!connection.identity) return cb(Errors.IdentityMissing);
      if (connections[connection.identity]) return cb(Errors.IdentityDuplicate);

      try {
        connections[connection.identity] = new Connection(connection, collections);
        cb();
      } catch (err) {
        cb(err);
      }
    },

    /**
     *
     * This method runs when a model is initially registered
     * at server-start-time.  This is the only required method.
     *
     * @param  {[type]}   collection [description]
     * @param  {Function} cb         [description]
     * @return {[type]}              [description]
     */
    // registerCollection: function (collection, cb) {
    //   modelReferences[collection.identity] = collection;
    //   schemaStash[collection.identity] = collection.definition;
    //   cb();
    // },

    /**
     * Fired when a model is unregistered, typically when the server
     * is killed. Useful for tearing-down remaining open connections,
     * etc.
     *
     * @param  {Function} cb [description]
     * @return {[type]}      [description]
     */
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

    update: function (conn, coll, options, values, cb) {
      grabConnection(conn).update(coll, options, values, cb);
    },

    destroy: function (conn, coll, options, cb) {
      grabConnection(conn).destroy(coll, options, cb);
    }

    /**
     *
     * REQUIRED method if integrating with a schemaful
     * (SQL-ish) database.
     *
     * @param  {[type]}   connName       [description]
     * @param  {[type]}   collectionName [description]
     * @param  {[type]}   definition     [description]
     * @param  {Function} cb             [description]
     * @return {[type]}                  [description]
     */
    // define: function (connName, collectionName, definition, cb) {
    //   dbs[collectionName] = new Datastore({
    //     filename: path.join(this.config.filePath, collectionName + '.nedb'),
    //     autoload: true,
    //     onload: function (err) {
    //       if (err) {
    //         return cb(err);
    //       }

    //       var self = this,
    //         def = _.clone(definition);

    //       function processKey(key, cb) {
    //         if (def[key].autoIncrement) {
    //           delete def[key].autoIncrement;
    //         }

    //         if (def[key].unique || def[key].index) {
    //           return self.ensureIndex({
    //             fieldName: key,
    //             sparse: true,
    //             unique: def[key].unique
    //           }, function (err) {
    //             if (err) return cb(err);
    //             def[key].indexed = true;
    //             cb();
    //           });
    //         }

    //         cb();
    //       }

    //       var keys = _.keys(def);

    //       // Loop through the def and process attributes for each key
    //       async.each(keys, processKey, function (err) {
    //         if (err) return cb(err);
    //         modelReferences[collectionName].schema = def;
    //         cb(null, modelReferences[collectionName].schema);
    //       });
    //     }
    //   });
    // },

    /**
     *
     * REQUIRED method if integrating with a schemaful
     * (SQL-ish) database.
     *
     * @param  {[type]}   connName       [description]
     * @param  {[type]}   collectionName [description]
     * @param  {Function} cb             [description]
     * @return {[type]}                  [description]
     */
    // describe: function (connName, collectionName, cb) {
    //   console.dir(arguments);
    //   console.dir(modelReferences);
    //   var des = _.keys(modelReferences[collectionName].schema).length === 0 ?
    //     null : modelReferences[collectionName].schema;
    //   return cb(null, des);
    // },

    /**
     *
     *
     * REQUIRED method if integrating with a schemaful
     * (SQL-ish) database.
     *
     * @param  {[type]}   connName       [description]
     * @param  {[type]}   collectionName [description]
     * @param  {[type]}   relations      [description]
     * @param  {Function} cb             [description]
     * @return {[type]}                  [description]
     */
    // drop: function (connName, collectionName, relations, cb) {
    //   var self = this;
    //   dbs[collectionName].remove({}, {
    //     multi: true
    //   }, function (err, numRemoved) {
    //     delete dbs[collectionName];
    //     delete modelReferences[collectionName];
    //     delete schemaStash[collectionName];
    //     fs.unlink(self.filename, cb);
    //   });
    // },

    // OVERRIDES NOT CURRENTLY FULLY SUPPORTED FOR:
    //
    // alter: function (collectionName, changes, cb) {},
    // addAttribute: function(collectionName, attrName, attrDef, cb) {},
    // removeAttribute: function(collectionName, attrName, attrDef, cb) {},
    // alterAttribute: function(collectionName, attrName, attrDef, cb) {},
    // addIndex: function(indexName, options, cb) {},
    // removeIndex: function(indexName, options, cb) {},

    /**
     *
     * REQUIRED method if users expect to call Model.find(), Model.findOne(),
     * or related.
     *
     * You should implement this method to respond with an array of instances.
     * Waterline core will take care of supporting all the other different
     * find methods/usages.
     *
     * @param  {[type]}   collectionName [description]
     * @param  {[type]}   options        [description]
     * @param  {Function} cb             [description]
     * @return {[type]}                  [description]
     */
    // find: function (collectionName, options, cb) {
    //   // Options object is normalized for you:
    //   //
    //   // options.where
    //   // options.limit
    //   // options.skip
    //   // options.sort

    //   // Filter, paginate, and sort records from the datastore.
    //   // You should end up w/ an array of objects as a result.
    //   // If no matches were found, this will be an empty array.

    //   // Respond with an error, or the results.

    //   options = criteria.rewriteCriteria(options, schemaStash[collectionName]);

    //   var cursor = dbs[collectionName].find(options.where),
    //     groupVars = _(options).pick('groupBy', 'sum', 'average', 'min', 'max', function (el) {
    //       return _.isArray(el);
    //     });

    //   if (!groupVars.isEmpty()) {
    //     if (groupVars.omit('groupBy').isEmpty()) {
    //       return cb(new Error('Cannot groupBy without a calculation'));
    //     }

    //     var aggr = {
    //       sum: [],
    //       min: [],
    //       max: []
    //     },
    //       seed = {
    //         sum: 0,
    //         min: Number.NaN,
    //         max: Number.NaN
    //       },
    //       group = {
    //         initial: {
    //           count: {}
    //         },
    //         reduce: function (curr, result) {
    //           aggr.sum.forEach(function (field) {
    //             result[field] += curr[field];
    //           });
    //           aggr.min.forEach(function (field) {
    //             //JS always returns false for (a < b) when b is NaN.
    //             if ((curr[field] < result[field]) || _.isNaN(result[field])) {
    //               result[field] = curr[field];
    //             }
    //           });
    //           aggr.max.forEach(function (field) {
    //             //JS always returns false for (a > b) when b is NaN
    //             if ((curr[field] > result[field]) || _.isNaN(result[field])) {
    //               result[field] = curr[field];
    //             }
    //           });
    //           for (var field in result.count) {
    //             result[field] += curr[field];
    //             result.count[field]++;
    //           }
    //         },
    //         finalize: function (result) {
    //           for (var field in result.count) {
    //             result[field] /= result.count[field];
    //           }
    //           delete result.count;
    //         }
    //       };

    //     //Init group.key
    //     if (groupVars.has('groupBy')) {
    //       group.key = {};
    //       options.groupBy.forEach(function (key) {
    //         group.key[key] = 1;
    //       });
    //     }

    //     //Init group.initial
    //     groupVars.omit('groupBy').each(function (value, key) {
    //       value.forEach(function (field) {
    //         if (key === 'average') {
    //           initial.count[field] = 0;
    //           initial[field] = 0;
    //         } else {
    //           initial[field] = seed[key];
    //           aggr[key].push(field);
    //         }
    //       });
    //     });
    //   }
    //   if (options.sort) {
    //     //TODO: Handle sort
    //   }
    //   if (options.skip) {
    //     cursor.skip(options.skip);
    //   }
    //   if (options.limit) {
    //     cursor.skip(options.limit);
    //   }

    //   cursor.exec(function (err, docs) {
    //     cb(err, utils.rewriteIds(docs));
    //   });
    // },

    /**
     *
     * REQUIRED method if users expect to call Model.create() or any methods
     *
     * @param  {[type]}   collectionName [description]
     * @param  {[type]}   values         [description]
     * @param  {Function} cb             [description]
     * @return {[type]}                  [description]
     */
    // create: function (collectionName, data, cb) {
    //   delete data.id;
    //   delete data._id;

    //   dbs[collectionName].insert(data, function (err, result) {
    //     if (err) return cb(err);
    //     cb(err, result);
    //   });
    // },

    /**
     *
     *
     * REQUIRED method if users expect to call Model.update()
     *
     * @param  {[type]}   collectionName [description]
     * @param  {[type]}   options        [description]
     * @param  {[type]}   values         [description]
     * @param  {Function} cb             [description]
     * @return {[type]}                  [description]
     */
    // update: function (collectionName, options, values, cb) {

    //   // If you need to access your private data for this collection:
    //   var collection = _modelReferences[collectionName];

    //   // 1. Filter, paginate, and sort records from the datastore.
    //   //    You should end up w/ an array of objects as a result.
    //   //    If no matches were found, this will be an empty array.
    //   //
    //   // 2. Update all result records with `values`.
    //   //
    //   // (do both in a single query if you can-- it's faster)

    //   // Respond with error or an array of updated records.
    //   cb(null, []);
    // },

    /**
     *
     * REQUIRED method if users expect to call Model.destroy()
     *
     * @param  {[type]}   collectionName [description]
     * @param  {[type]}   options        [description]
     * @param  {Function} cb             [description]
     * @return {[type]}                  [description]
     */
    // destroy: function (collectionName, options, cb) {

    //   // If you need to access your private data for this collection:
    //   var collection = _modelReferences[collectionName];

    //   // 1. Filter, paginate, and sort records from the datastore.
    //   //    You should end up w/ an array of objects as a result.
    //   //    If no matches were found, this will be an empty array.
    //   //
    //   // 2. Destroy all result records.
    //   //
    //   // (do both in a single query if you can-- it's faster)

    //   // Return an error, otherwise it's declared a success.
    //   cb();
    // },

    /*
        **********************************************
        * Optional overrides
        **********************************************

        // Optional override of built-in batch create logic for increased efficiency
        // (since most databases include optimizations for pooled queries, at least intra-connection)
        // otherwise, Waterline core uses create()
        createEach: function (collectionName, arrayOfObjects, cb) { cb(); },

        // Optional override of built-in findOrCreate logic for increased efficiency
        // (since most databases include optimizations for pooled queries, at least intra-connection)
        // otherwise, uses find() and create()
        findOrCreate: function (collectionName, arrayOfAttributeNamesWeCareAbout, newAttributesObj, cb) { cb(); },
      */

    // createEach: function (collectionName, data, cb) {
    //   data.forEach(function (val) {
    //     delete val.id;
    //     delete val._id;
    //   });

    //   dbs[collectionName].insert(data, function (err, result) {
    //     if (err) return cb(err);
    //     cb(err, result);
    //   });
    // },

    /*
        **********************************************
        * Custom methods
        **********************************************

        ////////////////////////////////////////////////////////////////////////////////////////////////////
        //
        // > NOTE:  There are a few gotchas here you should be aware of.
        //
        //    + The collectionName argument is always prepended as the first argument.
        //      This is so you can know which model is requesting the adapter.
        //
        //    + All adapter functions are asynchronous, even the completely custom ones,
        //      and they must always include a callback as the final argument.
        //      The first argument of callbacks is always an error object.
        //      For core CRUD methods, Waterline will add support for .done()/promise usage.
        //
        //    + The function signature for all CUSTOM adapter methods below must be:
        //      `function (collectionName, options, cb) { ... }`
        //
        ////////////////////////////////////////////////////////////////////////////////////////////////////


        // Custom methods defined here will be available on all models
        // which are hooked up to this adapter:
        //
        // e.g.:
        //
        foo: function (collectionName, options, cb) {
          return cb(null,"ok");
        },
        bar: function (collectionName, options, cb) {
          if (!options.jello) return cb("Failure!");
          else return cb();
        }

        // So if you have three models:
        // Tiger, Sparrow, and User
        // 2 of which (Tiger and Sparrow) implement this custom adapter,
        // then you'll be able to access:
        //
        // Tiger.foo(...)
        // Tiger.bar(...)
        // Sparrow.foo(...)
        // Sparrow.bar(...)


        // Example success usage:
        //
        // (notice how the first argument goes away:)
        Tiger.foo({}, function (err, result) {
          if (err) return console.error(err);
          else console.log(result);

          // outputs: ok
        });

        // Example error usage:
        //
        // (notice how the first argument goes away:)
        Sparrow.bar({test: 'yes'}, function (err, result){
          if (err) console.error(err);
          else console.log(result);

          // outputs: Failure!
        })




    */

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