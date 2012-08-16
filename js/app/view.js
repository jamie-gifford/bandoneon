var Bandoneon = require('../bandoneon');

// View
// ----

// Renders the keyboard to our container DIV via Raphaël.
module.exports = Backbone.View.extend({

  paper: null,
  showOctaveColors: false,

  el: document.getElementById('container'),

  events: {
    'click #toggle-octavecolors': 'toggleOctaveColors'
  },

  // Initialie Raphaël and listen to changes
  initialize: function() {
    this.paper = Raphael(this.el, 800, 450);
    this.render();
    this.model.bind('change', this.render, this);
  },

  // Render button layout (with colored octaves)
  renderButtons: function(side, direction) {
    var layout = Bandoneon.layout[side][direction];

    for (var k in layout) {
      var label = k;
      var key = label[0];
      var labelDisplay = label[0];
      var octave = label[1];
      if (label[1] == '#') {
        octave = label[2];
        key += label[1];
      }
      if (octave == 0) labelDisplay = label[0].toUpperCase();
      if (label[1] == '#') labelDisplay += '♯';
      else if (label[1] == 'b') labelDisplay += '♭';
      if (octave == 1) labelDisplay += '';
      else if (octave == 2) labelDisplay += 'ʹ';
      else if (octave == 3) labelDisplay += 'ʹʹ';
      else if (octave == 4) labelDisplay += 'ʹʹʹ';

      var fill = (this.showOctaveColors ? octaveColors[octave % (octaveColors.length)] : 'white');

      this.paper.circle(layout[k][0] + 30, layout[k][1] + 30, 30)
        .attr({
          'stroke-width': 2, /* (label[0] === 'c') ? 3 : 1 */
          'fill': fill
        });

      this.paper.text(layout[k][0] + 30, layout[k][1] + 30, label /* labelDisplay */)
        .attr({
          'font-family': 'serif',
          'font-size': 21,
          'font-style': 'italic',
          'cursor': 'default'
        });
    }
  },

  // Render a specific scale
  renderScale: function(side, direction, scale, color) {
    var layout = Bandoneon.layout[side][direction];
    if (!layout) return;

    var pathString = '';
    for (var t in scale) {
      if (layout.hasOwnProperty(scale[t])) {
        pathString += (pathString === '')?'M':'L';
        pathString += layout[scale[t]][0] + 30;
        pathString += ',';
        pathString += layout[scale[t]][1] + 30;
      }
    }

    if (pathString === '') return;

    return this.paper.path(pathString)
      .attr({
        'stroke': color,
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        'stroke-width': 7,
        'stroke-opacity': 0.33
      });
  },

  // Render a chord (left side only)
  renderChord: function(side, direction, key, quality) {
    if (side !== 'left') return;

    var chord = Bandoneon.chords[quality][key];
    if (!chord) return;
    
    var layout = Bandoneon.layout[side][direction];
    if (!layout) return;

    for (var k in layout) {
      if (_.indexOf(chord, k) === -1) continue;
      var label = k;
      this.paper.circle(layout[k][0] + 30, layout[k][1] + 30, 30)
        .attr({
          'fill': '#f00',
          'opacity': (_.indexOf(chord, k) == 0) ? 0.4 : 0.2
        });
    }
  },

  // Render the whole layout with buttons, octaves and scale
  render: function() {
    var side = this.model.get('side');
    var direction = this.model.get('direction');

    if (!side || !direction) return;

    this.paper.clear();
    this.renderButtons(side, direction);

    $('#nav-sides a[href="#' + side + '-' + direction + '"]').tab('show');

    var key = this.model.get('key');
    var mode = this.model.get('mode');
    var quality = this.model.get('quality');

    if (!key || (!mode && !quality)) {
      appRouter.navigate('!/' + side + '/' + direction, {replace: true});
      return;
    }

    // dismiss introduction alert
    $("#intro-alert").alert('close');

    if (mode) {
      // render scale
      for (var o = 0; o < 5; o++) {
        var scale = Bandoneon.utils.scale(key, o, mode);
        scale.push(key + '' + (o + 1));
        this.renderScale(side, direction, scale, scaleColors[o]);
      }

      appRouter.navigate('!/' + side + '/' + direction + '/scale/' 
        + key + '/' + mode, {replace: true});
    } else if (quality) {
      // render chord
      this.renderChord(side, direction, key, quality);

      appRouter.navigate('!/' + side + '/' + direction + '/chord/' 
        + key + '/' + quality, {replace: true});
    }

    return this;
  },

  // Toggle colored octaves and re-render
  toggleOctaveColors: function() {
    this.showOctaveColors = !this.showOctaveColors;
    this.render();
  }

});
