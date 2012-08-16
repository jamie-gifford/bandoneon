(function(){var require = function (file, cwd) {
    var resolved = require.resolve(file, cwd || '/');
    var mod = require.modules[resolved];
    if (!mod) throw new Error(
        'Failed to resolve module ' + file + ', tried ' + resolved
    );
    var cached = require.cache[resolved];
    var res = cached? cached.exports : mod();
    return res;
};

require.paths = [];
require.modules = {};
require.cache = {};
require.extensions = [".js",".coffee"];

require._core = {
    'assert': true,
    'events': true,
    'fs': true,
    'path': true,
    'vm': true
};

require.resolve = (function () {
    return function (x, cwd) {
        if (!cwd) cwd = '/';
        
        if (require._core[x]) return x;
        var path = require.modules.path();
        cwd = path.resolve('/', cwd);
        var y = cwd || '/';
        
        if (x.match(/^(?:\.\.?\/|\/)/)) {
            var m = loadAsFileSync(path.resolve(y, x))
                || loadAsDirectorySync(path.resolve(y, x));
            if (m) return m;
        }
        
        var n = loadNodeModulesSync(x, y);
        if (n) return n;
        
        throw new Error("Cannot find module '" + x + "'");
        
        function loadAsFileSync (x) {
            x = path.normalize(x);
            if (require.modules[x]) {
                return x;
            }
            
            for (var i = 0; i < require.extensions.length; i++) {
                var ext = require.extensions[i];
                if (require.modules[x + ext]) return x + ext;
            }
        }
        
        function loadAsDirectorySync (x) {
            x = x.replace(/\/+$/, '');
            var pkgfile = path.normalize(x + '/package.json');
            if (require.modules[pkgfile]) {
                var pkg = require.modules[pkgfile]();
                var b = pkg.browserify;
                if (typeof b === 'object' && b.main) {
                    var m = loadAsFileSync(path.resolve(x, b.main));
                    if (m) return m;
                }
                else if (typeof b === 'string') {
                    var m = loadAsFileSync(path.resolve(x, b));
                    if (m) return m;
                }
                else if (pkg.main) {
                    var m = loadAsFileSync(path.resolve(x, pkg.main));
                    if (m) return m;
                }
            }
            
            return loadAsFileSync(x + '/index');
        }
        
        function loadNodeModulesSync (x, start) {
            var dirs = nodeModulesPathsSync(start);
            for (var i = 0; i < dirs.length; i++) {
                var dir = dirs[i];
                var m = loadAsFileSync(dir + '/' + x);
                if (m) return m;
                var n = loadAsDirectorySync(dir + '/' + x);
                if (n) return n;
            }
            
            var m = loadAsFileSync(x);
            if (m) return m;
        }
        
        function nodeModulesPathsSync (start) {
            var parts;
            if (start === '/') parts = [ '' ];
            else parts = path.normalize(start).split('/');
            
            var dirs = [];
            for (var i = parts.length - 1; i >= 0; i--) {
                if (parts[i] === 'node_modules') continue;
                var dir = parts.slice(0, i + 1).join('/') + '/node_modules';
                dirs.push(dir);
            }
            
            return dirs;
        }
    };
})();

require.alias = function (from, to) {
    var path = require.modules.path();
    var res = null;
    try {
        res = require.resolve(from + '/package.json', '/');
    }
    catch (err) {
        res = require.resolve(from, '/');
    }
    var basedir = path.dirname(res);
    
    var keys = (Object.keys || function (obj) {
        var res = [];
        for (var key in obj) res.push(key);
        return res;
    })(require.modules);
    
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (key.slice(0, basedir.length + 1) === basedir + '/') {
            var f = key.slice(basedir.length);
            require.modules[to + f] = require.modules[basedir + f];
        }
        else if (key === basedir) {
            require.modules[to] = require.modules[basedir];
        }
    }
};

(function () {
    var process = {};
    
    require.define = function (filename, fn) {
        if (require.modules.__browserify_process) {
            process = require.modules.__browserify_process();
        }
        
        var dirname = require._core[filename]
            ? ''
            : require.modules.path().dirname(filename)
        ;
        
        var require_ = function (file) {
            var requiredModule = require(file, dirname);
            var cached = require.cache[require.resolve(file, dirname)];

            if (cached && cached.parent === null) {
                cached.parent = module_;
            }

            return requiredModule;
        };
        require_.resolve = function (name) {
            return require.resolve(name, dirname);
        };
        require_.modules = require.modules;
        require_.define = require.define;
        require_.cache = require.cache;
        var module_ = {
            id : filename,
            filename: filename,
            exports : {},
            loaded : false,
            parent: null
        };
        
        require.modules[filename] = function () {
            require.cache[filename] = module_;
            fn.call(
                module_.exports,
                require_,
                module_,
                module_.exports,
                dirname,
                filename,
                process
            );
            module_.loaded = true;
            return module_.exports;
        };
    };
})();


require.define("path",function(require,module,exports,__dirname,__filename,process){function filter (xs, fn) {
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (fn(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length; i >= 0; i--) {
    var last = parts[i];
    if (last == '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Regex to split a filename into [*, dir, basename, ext]
// posix version
var splitPathRe = /^(.+\/(?!$)|\/)?((?:.+?)?(\.[^.]*)?)$/;

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
var resolvedPath = '',
    resolvedAbsolute = false;

for (var i = arguments.length; i >= -1 && !resolvedAbsolute; i--) {
  var path = (i >= 0)
      ? arguments[i]
      : process.cwd();

  // Skip empty and invalid entries
  if (typeof path !== 'string' || !path) {
    continue;
  }

  resolvedPath = path + '/' + resolvedPath;
  resolvedAbsolute = path.charAt(0) === '/';
}

// At this point the path should be resolved to a full absolute path, but
// handle relative paths to be safe (might happen when process.cwd() fails)

// Normalize the path
resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
var isAbsolute = path.charAt(0) === '/',
    trailingSlash = path.slice(-1) === '/';

// Normalize the path
path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }
  
  return (isAbsolute ? '/' : '') + path;
};


// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    return p && typeof p === 'string';
  }).join('/'));
};


exports.dirname = function(path) {
  var dir = splitPathRe.exec(path)[1] || '';
  var isWindows = false;
  if (!dir) {
    // No dirname
    return '.';
  } else if (dir.length === 1 ||
      (isWindows && dir.length <= 3 && dir.charAt(1) === ':')) {
    // It is just a slash or a drive letter with a slash
    return dir;
  } else {
    // It is a full dirname, strip trailing slash
    return dir.substring(0, dir.length - 1);
  }
};


exports.basename = function(path, ext) {
  var f = splitPathRe.exec(path)[2] || '';
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPathRe.exec(path)[3] || '';
};
});

require.define("__browserify_process",function(require,module,exports,__dirname,__filename,process){var process = module.exports = {};

process.nextTick = (function () {
    var queue = [];
    var canPost = typeof window !== 'undefined'
        && window.postMessage && window.addEventListener
    ;
    
    if (canPost) {
        window.addEventListener('message', function (ev) {
            if (ev.source === window && ev.data === 'browserify-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);
    }
    
    return function (fn) {
        if (canPost) {
            queue.push(fn);
            window.postMessage('browserify-tick', '*');
        }
        else setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    if (name === 'evals') return (require)('vm')
    else throw new Error('No such module. (Possibly not yet loaded)')
};

(function () {
    var cwd = '/';
    var path;
    process.cwd = function () { return cwd };
    process.chdir = function (dir) {
        if (!path) path = require('path');
        cwd = path.resolve(dir, cwd);
    };
})();
});

require.define("vm",function(require,module,exports,__dirname,__filename,process){module.exports = require("vm-browserify")});

require.define("/node_modules/vm-browserify/package.json",function(require,module,exports,__dirname,__filename,process){module.exports = {"main":"index.js"}});

require.define("/node_modules/vm-browserify/index.js",function(require,module,exports,__dirname,__filename,process){var Object_keys = function (obj) {
    if (Object.keys) return Object.keys(obj)
    else {
        var res = [];
        for (var key in obj) res.push(key)
        return res;
    }
};

var forEach = function (xs, fn) {
    if (xs.forEach) return xs.forEach(fn)
    else for (var i = 0; i < xs.length; i++) {
        fn(xs[i], i, xs);
    }
};

var Script = exports.Script = function NodeScript (code) {
    if (!(this instanceof Script)) return new Script(code);
    this.code = code;
};

Script.prototype.runInNewContext = function (context) {
    if (!context) context = {};
    
    var iframe = document.createElement('iframe');
    if (!iframe.style) iframe.style = {};
    iframe.style.display = 'none';
    
    document.body.appendChild(iframe);
    
    var win = iframe.contentWindow;
    
    forEach(Object_keys(context), function (key) {
        win[key] = context[key];
    });
     
    if (!win.eval && win.execScript) {
        // win.eval() magically appears when this is called in IE:
        win.execScript('null');
    }
    
    var res = win.eval(this.code);
    
    forEach(Object_keys(win), function (key) {
        context[key] = win[key];
    });
    
    document.body.removeChild(iframe);
    
    return res;
};

Script.prototype.runInThisContext = function () {
    return eval(this.code); // maybe...
};

Script.prototype.runInContext = function (context) {
    // seems to be just runInNewContext on magical context objects which are
    // otherwise indistinguishable from objects except plain old objects
    // for the parameter segfaults node
    return this.runInNewContext(context);
};

forEach(Object_keys(Script.prototype), function (name) {
    exports[name] = Script[name] = function (code) {
        var s = Script(code);
        return s[name].apply(s, [].slice.call(arguments, 1));
    };
});

exports.createScript = function (code) {
    return exports.Script(code);
};

exports.createContext = Script.createContext = function (context) {
    // not really sure what this one does
    // seems to just make a shallow copy
    var copy = {};
    if(typeof context === 'object') {
        forEach(Object_keys(context), function (key) {
            copy[key] = context[key];
        });
    }
    return copy;
};
});

require.define("/bandoneon/index.js",function(require,module,exports,__dirname,__filename,process){// Bandoneon
// ---------

var Bandoneon = module.exports = {

  chords : require('./chords'),
  keys   : require('./keys'),
  layout : require('./layout'),
  modes  : require('./modes')

};
});

require.define("/bandoneon/chords.js",function(require,module,exports,__dirname,__filename,process){// Chords
// ------

module.exports = {

  'major': {
    
    'c': ['c1', 'e2', 'g1'],
    'd': ['d1', 'a1', 'f#1'],
    'e': ['e0', 'g#1', 'b1'],
    'f': ['f0', 'a1', 'c2'],
    'g': ['g0', 'b1', 'd2'],
    'a': ['a0', 'e2', 'c#2'],
    'b': ['b0', 'd#2', 'f#1'],

    'c#': ['c#1', 'f1', 'g#1'], // c# e#, g#
    'd#': ['d#1', 'g1', 'a#1'], // d#, f##, a#
    'f#': ['f#0', 'a#1', 'c#2'],
    'a#': ['a#0', 'd2', 'f1'], // #a, c## e#
    'g#': ['g#0', 'c2', 'd#2'], // g#, h#, d#

  }

  // ...

};
});

require.define("/bandoneon/keys.js",function(require,module,exports,__dirname,__filename,process){// Key names
// ---------

module.exports = [ 
  
  'c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b'

];
});

require.define("/bandoneon/layout.js",function(require,module,exports,__dirname,__filename,process){// Keyboard layout
// ---------------

module.exports = {

  'right': {

    'pull': {

      'b4': [207, 39],
      'g#4': [312, 34],
      'g4': [429, 34],
      'f4': [538, 42],
      'c#2': [160, 96],
      'a4': [256, 87],
      'f#4': [361, 87],
      'e4': [480, 87],
      'd#4': [571, 102],
      'c2': [118, 153],
      'd2': [210, 141],
      'g2': [309, 132],
      'a#3': [415, 136],
      'c4': [516, 147],
      'd4': [615, 162],
      'b1': [70, 222],
      'e2': [163, 205],
      'c#3': [264, 195],
      'f#2': [360, 190],
      'a2': [457, 195],
      'c3': [559, 205],
      'e3': [651, 225],
      'a1': [33, 288],
      'f2': [123, 268],
      'a#2': [213, 258],
      'g#2': [306, 249],
      'b2': [396, 246],
      'd3': [499, 250],
      'g#3': [591, 267],
      'b3': [690, 289],
      'a#1': [81, 342],
      'd#2': [171, 321],
      'f3': [262, 307],
      'd#3': [352, 301],
      'f#3': [447, 303],
      'a3': [538, 312],
      'c#4': [628, 327],
      'g3': [714, 357]
    },

    'push': {

      'a4': [207, 39],
      'g#4': [312, 34],
      'f#4': [429, 34],
      'f4': [538, 42],
      'c2': [160, 96],
      'g4': [256, 87],
      'a#3': [361, 87],
      'c4': [480, 87],
      'd#4': [571, 102],
      'd2': [118, 153],
      'c#2': [210, 141],
      'g#2': [309, 132],
      'a#2': [415, 136],
      'c3': [516, 147],
      'd4': [615, 162],
      'b1': [70, 222],
      'f#2': [163, 205],
      'f#3': [264, 195],
      'g2': [360, 190],
      'b2': [457, 195],
      'd3': [559, 205],
      'g3': [651, 225],
      'a1': [33, 288],
      'f2': [123, 268],
      'e2': [213, 258],
      'a2': [306, 249],
      'c#3': [396, 246],
      'b2 ': [499, 250],
      'a3': [591, 267],
      'c#4': [690, 289],
      'a#1': [81, 342],
      'd#2': [171, 321],
      'f3': [262, 307],
      'e3': [352, 301],
      'g#3': [447, 303],
      'b3': [538, 312],
      'e4': [628, 327],
      'd#3': [714, 357]
    }
  
  },

  'left': {

    'pull': {

      'g#0': [198, 52],
      'a#0': [295, 37],
      'c#1': [405, 36],
      'f1': [520, 37],
      'g#2': [621, 46],
      'e0': [67, 130],
      'a0': [153, 117],
      'g1': [252, 99],
      'd#1': [357, 91],
      'f2': [462, 87],
      'a#1': [568, 99],
      'f0': [666, 108],
      'd1': [115, 190],
      'a1': [208, 171],
      'c2': [313, 163],
      'e2': [414, 150],
      'c1': [513, 153],
      'g0': [615, 160],
      'e1': [73, 259],
      'g#1': [169, 241],
      'b1': [270, 228],
      'd2': [366, 216],
      'f#2': [465, 216],
      'c#2': [565, 223],
      'f#0': [660, 229],
      'd0': [39, 342],
      'b0': [133, 316],
      'g2': [228, 297],
      'a2': [324, 277],
      'd#2': [420, 277],
      'f#1': [519, 283],
      'd#0': [612, 291],
      'c0': [706, 303]
    },

    'push': {

      'g#0': [198, 52],
      'a#0': [295, 37],
      'd#1': [405, 36],
      'd#2': [520, 37],
      'g2': [621, 46],
      'd0': [67, 130],
      'd1': [153, 117],
      'a#1': [252, 99],
      'c2': [357, 91],
      'c#1': [462, 87],
      'c1': [568, 99],
      'f#0': [666, 108],
      'g0': [115, 190],
      'g1': [208, 171],
      'b1': [313, 163],
      'd2': [414, 150],
      'f2': [513, 153],
      'f#1': [615, 160],
      'a0': [73, 259],
      'e1': [169, 241],
      'a1': [270, 228],
      'c#2': [366, 216],
      'e2': [465, 216],
      'g#1': [565, 223],
      'b0': [660, 229],
      'e0': [39, 342],
      'e1 ': [133, 316],
      'f#2': [228, 297],
      'g#2': [324, 277],
      'b2': [420, 277],
      'f1': [519, 283],
      'c#0': [612, 291],
      'f0': [706, 303]
    }

  }

};
});

require.define("/bandoneon/modes.js",function(require,module,exports,__dirname,__filename,process){// Available modes
// ---------------

module.exports = {

  'major': [ 2, 2, 1, 2, 2, 2, 1 ],
  'minor': [ 2, 1, 2, 2, 1, 2, 2 ],
  'chromatic': [ 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1 ]

};
});

require.define("/app/model.js",function(require,module,exports,__dirname,__filename,process){var modes = require('../bandoneon/modes')
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
});

require.define("/app/router.js",function(require,module,exports,__dirname,__filename,process){// Router
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
});

require.define("/app/core.js",function(require,module,exports,__dirname,__filename,process){var Bandoneon = require('../bandoneon')
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
});
require("/app/core.js");
})();
