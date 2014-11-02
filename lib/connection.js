var base = require('base-framework'),
  _ = require('lodash'),
  Datastore = require('nedb'),
  path = require('path'),
  rimraf = require('rimraf'),
  async = require('async'),
  mkdirp = require('mkdirp'),
  Query = require('./query'),
  Document = require('./document'),
  utils = require('./utils'),
  Errors = require('waterline-errors').adapter;

module.exports = base.createChild().addInstanceMethods({
  init: function (config, collections) {
    this.config = config || {};
    this.dbRoot = path.join(this.config.filePath, this.config.identity);
    this.collections = collections || {};
    this.dbs = {};

    return this;
  },

  initConn: function (cb) {
    var self = this;
    mkdirp(self.dbRoot, function (err) {
      if (err) {
        return cb(err);
      }
      async.each(_.keys(self.collections), function (key, next) {
        self.loadDB(key, next);
      }, cb);
    });
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

        async.waterfall([

          function (next) {
            // Loop through the def and process attributes for each key
            var keys = _.keys(def);
            async.each(keys, _processKey, next);

            function _processKey(key, cb) {
              if (key == 'id') {
                return cb();
              }

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
          },
          function (next) {
            dbself.ensureIndex({
              fieldName: '__ctr',
              unique: true
            }, next);
          },
          function (next) {
            var group = {
              reduce: function (curr, result) {
                if (curr.__ctr > result.ctr) {
                  result.ctr = curr.__ctr;
                }
              },
              initial: {
                ctr: 0
              }
            };
            dbself.find({}).group(group).exec(next);
          },
          function (res, next) {
            dbself.ctr = res[0].ctr;
            self.collections[collectionID].schema = def;
            next(null, def);
          }
        ], cb);
      }, self.dbs[collectionID]));
    }
  },

  describe: function (coll, cb) {
    var des = null;
    if (!_.isEmpty(this.collections[coll]) && !_.isEmpty(this.collections[coll].schema)) {
      des = this.collections[coll].schema;
    }

    return cb(null, des);
  },

  createCollection: function (coll, definition, cb) {
    this.collections[coll] = {
      definition: definition,
      identity: coll
    };

    this.loadDB(coll, cb);
  },

  dropCollection: function (coll, relations, cb) {
    var self = this;
    db = self.dbs[coll];
    db.remove({}, {
      multi: true
    }, function (err, numRemoved) {
      if (err) {
        return cb(err);
      }
      delete self.dbs[coll];
      delete self.collections[coll];
      rimraf(db.filename, cb);
    });
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
    var queryOptions = _.omit(query.criteria, 'where');

    // Run Normal Query on collection
    var cursor = this.dbs[coll].find(where);

    if (query.aggregate) {
      cursor.group(query.aggregateGroup);
    }

    if (queryOptions.sort) {
      cursor.sort(queryOptions.sort);
    } else {
      cursor.sort({
        __ctr: 1
      });
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
    data.__ctr = ++db.ctr;

    db.insert(data, function (err, result) {
      if (err) return cb(err);

      result.id = result._id;
      delete result._id;
      delete result.__ctr;
      cb(err, result);
    });
  },

  insertEach: function (coll, values, cb) {
    var db = this.dbs[coll];

    _.each(values, function (data) {
      delete data.id;
      delete data._id;
      data.__ctr = ++db.ctr;
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

    values = new Document(values, this.collections[coll].schema).values;

    // NEDB doesn't allow ID's to be updated
    if (values.id) delete values.id;
    if (values._id) delete values._id;

    var updatedRecords = [];
    async.waterfall([
      // Lookup records being updated and grab their ID's
      // Useful for later looking up the record after an insert
      // Required because options may not contain an ID
      function (next) {
        self.dbs[coll].find(query.criteria.where, next);
      },
      function (records, next) {
        if (!records) return next(Errors.NotFound);
        next(null, records);
      },
      function (records, next) {
        records.forEach(function (record) {
          updatedRecords.push(record._id);
        });

        // Update the records
        self.dbs[coll].update(query.criteria.where, {
          '$set': values
        }, {
          multi: true
        }, next);
      },
      function (numReplaced, next) {
        if (numReplaced != updatedRecords.length) {
          return next(new Error('Could not update all records matching criteria.'));
        }

        self.dbs[coll].find({
          _id: {
            '$in': updatedRecords
          }
        }).sort({
          __ctr: 1
        }).exec(next);
      }
    ], function (err, records) {
      if (err) return cb(err);
      cb(null, utils.rewriteIds(records));
    });
  },

  destroy: function (coll, criteria, cb) {
    var self = this,
      query, deletedRecords;

    // Catch errors build query and return to the callback
    try {
      query = new Query(criteria);
    } catch (err) {
      return cb(err);
    }

    //Find ids of all documents matching delete criteria
    self.dbs[coll].find(query.criteria.where, function (err, records) {
      if (err) return cb(err);

      deletedRecords = records;
    });

    self.dbs[coll].remove(query.criteria.where, {
      multi: true
    }, function (err, numRemoved) {
      if (err) return cb(err);

      if (numRemoved == deletedRecords.length) {
        cb(null, utils.rewriteIds(deletedRecords));
      } else {
        cb(new Error('Could not delete all records matching criteria.'));
      }
    });
  },

  count: function (coll, criteria, cb) {
    var self = this,
      query;

    // Catch errors build query and return to the callback
    try {
      query = new Query(criteria);
    } catch (err) {
      return cb(err);
    }

    self.dbs[coll].count(query.criteria.where, cb);
  }
});