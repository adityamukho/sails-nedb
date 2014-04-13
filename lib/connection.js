var base = require('base-framework'),
  _ = require('lodash'),
  Datastore = require('nedb')
  path = require('path'),
  fs = require('fs'),
  async = require('async'),
  mkdirp = require('mkdirp');

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
        self.registerCollection(collection, nextCollection);
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
        filename: path.join(self.dbRoot, collectionID + '.nedb'),
        autoload: true,
        onload: function (err) {
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
        }
      });
    }
  },

  describe: function (coll, cb) {
    cb();
  },

  createCollection: function (coll, definition, cb) {
    cb();
  },
  dropCollection: function (coll, relations, cb) {
    cb();
  },
  select: function (coll, options, cb) {
    cb();
  },
  insert: function (coll, values, cb) {
    cb();
  },
  update: function (coll, options, values, cb) {
    cb();
  },
  destroy: function (coll, options, cb) {
    cb();
  }
});