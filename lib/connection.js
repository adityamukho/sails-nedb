var base = require('base-framework'),
  _ = require('lodash'),
  Datastore = require('nedb')
  path = require('path'),
  fs = require('fs'),
  async = require('async'),
  mkdirp = require('mkdirp'),
  Query = require('./query'),
  utils = require('./utils'),
  hasOwnProperty = utils.object.hasOwnProperty,
  Errors = require('waterline-errors').adapter;

module.exports = base.createChild().addInstanceMethods({
  init: function (config, collections) {
    var self = this;

    self.config = config || {};
    self.dbRoot = path.join(self.config.filePath, self.config.identity);

    mkdirp(self.dbRoot, function (err) {
      if (err) {
        throw err;
      }

      self.collections = collections || {};
      self.dbs = {};

      async.each(_.keys(self.collections), function (key, nextCollection) {
        self.registerCollection(self.collections[key], nextCollection);
      }, function (err) {
        if (err) {
          throw err;
        }
      });
    });
  },

  registerCollection: function (collection, cb) {
    this.collections[collection.identity] = collection;
    this.loadDB(collection.identity, cb);
  },

  loadDB: function (collectionID, cb) {
    var self = this,
      collection = self.collections[collectionID];

    if (!self.dbs[collectionID]) {
      self.dbs[collectionID] = new Datastore({
        filename: path.join(self.dbRoot, collectionID + '.nedb')
      });
      self.dbs[collectionID].loadDatabase(_.bind(function (err) {
        if (err) {
          return cb(err);
        }

        var dbself = this,
          def = _.clone(collection.definition);

        function processKey(key, cb) {
          if (def[key].autoIncrement) {
            delete def[key].autoIncrement;
          }

          if (def[key].unique || def[key].index) {
            return dbself.ensureIndex({
              fieldName: key,
              sparse: true,
              unique: def[key].unique
            }, function (err) {
              if (err) return cb(err);
              def[key].indexed = true;
              cb();
            });
          }

          cb();
        }

        var keys = _.keys(def);

        // Loop through the def and process attributes for each key
        async.each(keys, processKey, function (err) {
          if (err) return cb(err);
          self.collections[collectionID].schema = def;
          cb(null, def);
        });
      }, self.dbs[collectionID]));
    }
  },

  describe: function (coll, cb) {
    var des = null;
    if (!_.isEmpty(this.collections) && !_.isEmpty(this.collections[coll]) && !_.isEmpty(this.collections[coll].schema)) {
      des = this.collections[coll].schema;
    }
    return cb(null, des);
  },

  createCollection: function (coll, definition, cb) {
    cb();
  },

  dropCollection: function (coll, relations, cb) {
    var self = this;
    if (self.dbs) {
      db = self.dbs[coll];
      db.remove({}, {
        multi: true
      }, function (err, numRemoved) {
        if (err) {
          return cb(err);
        }
        delete self.dbs[coll];
        delete self.collections[coll];
        fs.unlink(db.filename, cb);
      });
    }
    else {
      cb();
    }
  },

  select: function (coll, criteria, cb) {
    var query;

    // Catch errors from building query and return to the callback
    try {
      query = new Query(criteria);
    } catch (err) {
      return cb(err);
    }

    var where = query.criteria.where || {};
    var queryOptions = _.omit(query.criteria, 'where'); // ?

    // Run Normal Query on collection
    var cursor = this.dbs[coll].find(where);

    // var cursor = this.dbs[coll].find(options.where),
    //   groupVars = _(options).pick('groupBy', 'sum', 'average', 'min', 'max', function (el) {
    //     return _.isArray(el);
    //   });

    // if (!groupVars.isEmpty()) {
    //   if (groupVars.omit('groupBy').isEmpty()) {
    //     return cb(new Error('Cannot groupBy without a calculation'));
    //   }

    //   var aggr = {
    //     sum: [],
    //     min: [],
    //     max: []
    //   },
    //     seed = {
    //       sum: 0,
    //       min: Number.NaN,
    //       max: Number.NaN
    //     },
    //     group = {
    //       initial: {
    //         count: {}
    //       },
    //       reduce: function (curr, result) {
    //         aggr.sum.forEach(function (field) {
    //           result[field] += curr[field];
    //         });
    //         aggr.min.forEach(function (field) {
    //           //JS always returns false for (a < b) when b is NaN.
    //           if ((curr[field] < result[field]) || _.isNaN(result[field])) {
    //             result[field] = curr[field];
    //           }
    //         });
    //         aggr.max.forEach(function (field) {
    //           //JS always returns false for (a > b) when b is NaN
    //           if ((curr[field] > result[field]) || _.isNaN(result[field])) {
    //             result[field] = curr[field];
    //           }
    //         });
    //         for (var field in result.count) {
    //           result[field] += curr[field];
    //           result.count[field]++;
    //         }
    //       },
    //       finalize: function (result) {
    //         for (var field in result.count) {
    //           result[field] /= result.count[field];
    //         }
    //         delete result.count;
    //       }
    //     };

    //   //Init group.key
    //   if (groupVars.has('groupBy')) {
    //     group.key = {};
    //     options.groupBy.forEach(function (key) {
    //       group.key[key] = 1;
    //     });
    //   }

    //   //Init group.initial
    //   groupVars.omit('groupBy').each(function (value, key) {
    //     value.forEach(function (field) {
    //       if (key === 'average') {
    //         initial.count[field] = 0;
    //         initial[field] = 0;
    //       } else {
    //         initial[field] = seed[key];
    //         aggr[key].push(field);
    //       }
    //     });
    //   });
    // }
    if (queryOptions.sort) {
      cursor.sort(queryOptions.sort);
    }
    if (queryOptions.skip) {
      cursor.skip(queryOptions.skip);
    }
    if (queryOptions.limit) {
      cursor.limit(queryOptions.limit);
    }

    cursor.exec(function (err, docs) {
      cb(err, utils.rewriteIds(docs));
    });

  },

  insert: function (coll, data, cb) {
    var db = this.dbs[coll];

    delete data.id;
    delete data._id;

    db.insert(data, function (err, result) {
      if (err) return cb(err);

      result.id = result._id;
      delete result._id;
      cb(err, result);
    });
  },

  insertEach: function (coll, values, cb) {
    var db = this.dbs[coll];

    _.each(values, function (data) {
      delete data.id;
      delete data._id;
    });

    db.insert(values, function (err, result) {
      if (err) return cb(err);

      cb(err, utils.rewriteIds(result));
    });
  },

  update: function (coll, criteria, values, cb) {
    var self = this,
      query;

    // Catch errors build query and return to the callback
    try {
      query = new Query(criteria);
    } catch (err) {
      return cb(err);
    }

    // NEDB doesn't allow ID's to be updated
    if (values.id) delete values.id;
    if (values._id) delete values._id;

    // Lookup records being updated and grab their ID's
    // Useful for later looking up the record after an insert
    // Required because options may not contain an ID
    this.dbs[coll].find(query.criteria.where, function (err, records) {
      if (err) return cb(err);
      if (!records) return cb(Errors.NotFound);

      // Build an array of records
      var updatedRecords = [];

      records.forEach(function (record) {
        updatedRecords.push(record._id);
      });

      // Update the records
      self.dbs[coll].update(query.criteria.where, {
        '$set': values
      }, {
        multi: true
      }, function (err, result) {
        if (err) return cb(err);

        // Look up newly inserted records to return the results of the update
        self.dbs[coll].find({
          _id: {
            '$in': updatedRecords
          }
        }, function (err, records) {
          if (err) return cb(err);
          cb(null, utils.rewriteIds(records));
        });
      });
    });
  },

  destroy: function (coll, criteria, cb) {
    var self = this,
      query;

    // Catch errors build query and return to the callback
    try {
      query = new Query(criteria);
    } catch (err) {
      return cb(err);
    }

    self.dbs[coll].remove(query.criteria.where, function (err, results) {
      if (err) return cb(err);

      // Force to array to meet Waterline API
      var resultsArray = [];

      // If result is not an array return an array
      if (!Array.isArray(results)) {
        resultsArray.push({
          id: results
        });
        return cb(null, resultsArray);
      }

      // Create a valid array of IDs
      results.forEach(function (result) {
        resultsArray.push({
          id: result
        });
      });

      cb(null, utils.rewriteIds(resultArray));
    });

  }
});