var Bandoneon = require('../bandoneon')
  , AppModel = require('./model')
  , AppRouter = require('./router')
  , AppView = require/('./view');

$(function() {

  // Color codes for coloring the scale lines
  var scaleColors = ['blue', 'red', 'green', 'orange', 'blue'];

  // Color codes for coloring the octaves
  var octaveColors = ['#bcf', '#fdc', '#cfc', '#fea'];  

  var appModel = new AppModel();
  var appRouter = new AppRouter();
  var appView = new AppView({ model: appModel, router: appRouter });

  Backbone.history.start();

  // don't submit the form
  $('#scale-form').submit(function() {
    return false;
  });

  // octave color toggle
  $('#toggle-octavecolors').click(function() { 
    appView.toggleOctaveColors();
    $('#toggle-octavecolors').button('toggle');
  });

  // side / direction navigation
  $('#nav-sides a[data-toggle="tab"]').on('shown', function(e) {
    switch (e.target.hash) {
      case '#left-pull':
        appModel.set({ 'side': 'left', 'direction': 'pull' });
        break;
      case '#left-push':
        appModel.set({ 'side': 'left', 'direction': 'push' });
        break;
      case '#right-pull':
        appModel.set({ 'side': 'right', 'direction': 'pull' });
        break;
      case '#right-push':
        appModel.set({ 'side': 'right', 'direction': 'push' });
        break;
    }
  });

  // key select
  $('#select-key').change(function() {
    $('#select-key option:selected').each(function() {
      appModel.set('key', $(this).val());
    });
  });

  // mode select
  $('#select-mode').change(function() {
    $('#select-mode option:selected').each(function() {
      appModel.set('mode', $(this).val());
    });
  });


  // DEBUG

  window.appView = appView;

});
