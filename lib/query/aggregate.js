/**
 * Module dependencies
 */

var Errors = require('waterline-errors').adapter,
  _ = require('lodash');

/**
 * Aggregate Constructor
 *
 * Generates aggregation objects for use with the Mongo Aggregation pipeline.
 *
 * @param {Object} options
 * @api private
 */

var Aggregate = module.exports = function Aggregate(options) {

  // Hold the criteria
  this.group = {};

  // Build the group phase for an aggregation
  this.build(options);

  return this.group;
};

/**
 * Build
 *
 * Builds up an aggregate query criteria object from a
 * Waterline criteria object.
 *
 * @param {Object} options
 * @api private
 */

Aggregate.prototype.build = function build(options) {
  var groupVars = _(options).pick('groupBy', 'sum', 'average', 'min', 'max', function (el) {
    return _.isArray(el);
  });

  if (!groupVars.isEmpty()) {
    if (groupVars.omit('groupBy').isEmpty()) {
      throw Errors.InvalidGroupBy;
    }

    var aggr = {
      sum: [],
      min: [],
      max: []
    },
      seed = {
        sum: 0,
        min: Number.NaN,
        max: Number.NaN
      },
      group = {
        initial: {
          count: {}
        },
        reduce: function (curr, result) {
          aggr.sum.forEach(function (field) {
            result[field] += curr[field];
          });
          aggr.min.forEach(function (field) {
            //JS always returns false for (a < b) when b is NaN.
            if ((curr[field] < result[field]) || _.isNaN(result[field])) {
              result[field] = curr[field];
            }
          });
          aggr.max.forEach(function (field) {
            //JS always returns false for (a > b) when b is NaN
            if ((curr[field] > result[field]) || _.isNaN(result[field])) {
              result[field] = curr[field];
            }
          });
          for (var field in result.count) {
            result[field] += curr[field];
            result.count[field]++;
          }
        },
        finalize: function (result) {
          for (var field in result.count) {
            result[field] /= result.count[field];
          }
          delete result.count;
        }
      };

    //Init group.key
    if (groupVars.has('groupBy')) {
      group.key = {};
      options.groupBy.forEach(function (key) {
        group.key[key] = 1;
      });
    }

    //Init group.initial
    groupVars.omit('groupBy').each(function (value, key) {
      value.forEach(function (field) {
        if (key === 'average') {
          group.initial.count[field] = 0;
          group.initial[field] = 0;
        } else {
          group.initial[field] = seed[key];
          aggr[key].push(field);
        }
      });
    });
  }

  this.group = group;
};