var keys = require('./keys')
  , modes = require('./modes');

// Helper functions
// ----------------

var utils = module.exports = {};

utils.scale = function(key, octave, mode) {
  var pos = keys.indexOf(key);
  if (pos === -1) return [];

  var intervals = modes[mode];
  if (typeof intervals === 'undefined') return [];

  var scale = [];
  for (var s in intervals) {
    scale.push(keys[pos] + '' + octave);
    pos += intervals[s];
    if (pos >= keys.length) {
      octave++;
    }
    pos %= keys.length;
  }

  return scale;
};
