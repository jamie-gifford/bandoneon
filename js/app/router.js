// Router
// ------

// Configure URL routes for scale selection
module.exports = Backbone.Router.extend({

  routes: {
    '!/:side/:direction/scale/:key/:mode': 'selectScale',
    '!/:side/:direction/chord/:key/:quality': 'selectChord',
    '!/:side/:direction': 'selectLayout',
  },

  selectLayout: function(side, direction) {
    appModel.set({ 
      'side': side,
      'direction': direction
    });
  },

  selectScale: function(side, direction, key, mode) {
    appModel.set({
      'side': side,
      'direction': direction,
      'key': key,
      'mode': mode,
      'quality': null
    });
  },

  selectChord: function(side, direction, key, quality) {
    appModel.set({
      'side': 'left', // chords only on left side
      'direction': direction,
      'key': key,
      'mode': null,
      'quality': quality
    });
  }

});
