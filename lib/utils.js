/**
 * Utility Functions
 */

var _ = require('lodash');

module.exports = {

  /**
   * Case Insensitive
   *
   * Wrap a value in a case insensitive regex
   * /^foobar$/i
   *
   * NOTE: this is really bad for production currently,
   * when you use a regex in the query it won't hit any
   * indexes. We need to fix this ASAP but for now it passes
   * all the waterline tests.
   */
  caseInsensitive: function (val) {
    if (!_.isString(val)) return val;
    return val.replace(/[-[\]{}()+?*.\/,\\^$|#]/g, "\\$&");
  },

  /**
   * Rewrite ID's
   *
   * Normalizes Mongo's _id to id
   */

  rewriteIds: function (models) {
    return _.map(models, function (model) {
      if (model._id) {

        // change id to string only if it's necessary
        if (typeof model._id === 'object')
          model.id = model._id.toString();
        else
          model.id = model._id;

        delete model._id;
      }
      return model;
    });
  }
};