var _ = require('lodash'),
  utils = require('./utils');

module.exports = {

  parseFindOptions: function (options) {
    return [options.where, _.omit(options, 'where')];
  },

  rewriteCriteria: function (options, schema) {
    if (options.hasOwnProperty('where')) {

      // Fix an issue with broken queries when where is null
      if (options.where === null) {
        options.where = {};
        return options;
      }

      if (options.where.id && !options.where._id) {
        options.where['_id'] = _.clone(options.where.id);
        delete options.where.id;
      }

      options.where = this.parseTypes(options.where, schema);
      options = this.normalizeCriteria(options);
    }

    return options;
  },

  // Rewrite values when used with Atomic operators
  rewriteValues: function (values) {
    var _values = {};
    var _$set = {};

    _.each(values, function (e, i) {
      if (!_.isNaN(i) && i.indexOf("$") === 0) {
        _values[i] = e;
      } else {
        _$set[i] = e;
      }
    });

    if (!_.isEmpty(_$set)) {
      _values["$set"] = _$set;
    }

    return _values;
  },

  parseTypes: function (obj, schema) {
    var self = this;
    _.each(obj, function (val, key) {
      if (schema && schema[key] && schema[key].type === 'datetime') {
        if (!_.isNaN(Date.parse(val))) {
          obj[key] = new Date(val);
        }
      } else if (val === "false")
        obj[key] = false;
      else if (val === "true")
        obj[key] = true;
      else if (val === "null")
        obj[key] = null;
      else if (_.isNumber(val))
        obj[key] = obj[key];
      else if (key == 'or') {
        obj['$or'] = val;
        delete obj[key];
      } else if (_.isArray(val))
        obj[key] = {
          '$in': val
        };
      else if (_.isObject(val))
        obj[key] = self.parseTypes(val, schema && schema[key]); // Nested objects...
    });

    return obj;
  },

  /**
   * Transforms a Waterline Query into a query that can be used
   * with MongoDB. For example it sets '>' to $gt, etc.
   *
   * @param {Object} a waterline criteria query
   * @return {Object} a mongodb criteria query
   */

  normalizeCriteria: function (query) {
    for (var key in query) {
      var value = query[key];

      var recursiveParse2 = function (obj) {
        for (var key in obj) {

          if (_.isObject(obj)) {
            if (_.isObject(obj[key]) && !(obj[key] instanceof Date)) {
              obj[key] = recursiveParse2(obj[key]);
            }

            // Handle Sorting Order with binary or -1/1 values
            if (key === 'sort') {
              obj[key] = ([0, -1].indexOf(obj[key]) > -1) ? -1 : 1;
            }

            if (key === 'contains') {
              obj = '.*' + utils.caseInsensitive(obj[key]) + '.*';
              obj = new RegExp('^' + obj + '$', 'ig');
            }

            if (key === 'like') {
              if (_.isObject(obj[key])) {}
              // Handle non-objects
              obj = obj[key];
            }

            if (key === 'startsWith') {
              obj[key] = utils.caseInsensitive(obj[key]);
              obj = obj[key] + '.*';
              obj = new RegExp('^' + obj + '$', 'i');
            }

            if (key === 'endsWith') {
              obj[key] = utils.caseInsensitive(obj[key]);
              obj = '.*' + obj[key];
              obj = new RegExp('^' + obj + '$', 'i');
            }

            if (key === 'lessThan' || key === '<') {
              obj['$lt'] = obj[key];
              delete obj[key];
            }

            if (key === 'lessThanOrEqual' || key === '<=') {
              obj['$lte'] = obj[key];
              delete obj[key];
            }

            if (key === 'greaterThan' || key === '>') {
              obj['$gt'] = obj[key];
              delete obj[key];
            }

            if (key === 'greaterThanOrEqual' || key === '>=') {
              obj['$gte'] = obj[key];
              delete obj[key];
            }

            if (key.toLowerCase() === 'not' || key === '!') {
              obj = {
                '$ne': obj[key]
              };
            }

            if (['_id', 'id'].indexOf(key) == -1) {
              // Replace Percent Signs
              if (typeof obj[key] === 'string') {
                obj[key] = utils.caseInsensitive(obj[key]);
                obj[key] = obj[key].replace(/%/g, '.*');
                obj[key] = new RegExp('^' + obj[key] + '$', 'ig');
              }
            }

          }
        }
        return obj;
      };

      query[key] = recursiveParse2(query[key])
    }

    return query;
  }

};