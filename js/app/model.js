var modes = require('../bandoneon/modes')
  , keys = require('../bandoneon/keys');

// Model
// -----

// Represents the bandoneon keyboard that can(!) have a
// direction (push/pull), a side (right/left) and key + mode
module.exports = Backbone.Model.extend({

  defaults: {
    direction: 'pull',
    side: 'right',
    key: null,
    mode: null
  },

  validate: function(attrs) {
    // side: left, right
    if (attrs.side && _.indexOf(['left', 'right'], attrs.side) === -1) {
      return 'invalid side';
    }

    // direction: push, pull
    if (attrs.direction && _.indexOf(['push', 'pull'], attrs.direction) === -1) {
      return 'invalid direction';
    }

    // key: from Bandoneon.keys
    if (attrs.key && _.indexOf(keys, attrs.key) === -1) {
      return 'invalid key';
    }

    // mode: from Bandoneon.modes
    if (attrs.mode && !modes.hasOwnProperty(attrs.mode)) {
      return 'invalid mode';
    }

    return;
  }

});
