var   fs = require('fs'),
      fu = require('./../fap-unit'),
    Path = require('path'),
   paths = require('./paths.js'),
optparse = require(paths.optparse);


exports.run = function() {
  var tr = new TreeRunner();
  return tr.run.apply(tr, arguments);
};

function TreeRunner(){}
TreeRunner.prototype = {
  toString: function(){ return 'TreeRunner'; },
  run : function(request, out) {
    this.__out = out;
    var paths = request.path;
    var usePaths = [];
    for (var i = 0; i < paths.length; i++) {
      if (Path.existsSync(paths[i])) {
        usePaths.push(paths[i]);
      } else {
        this._warn("path not found: "+paths[i]);
      }
    }
    var list = [], me = this;
    this._didPath = {}; // if you get same path multiple times from different
                        // surface paths for some strange reason
    fu.suppressRun(function(){
      for (i = 0; i < usePaths.length; i++) {
        me._flatten(paths[i], paths[i], list, null);
      }
    });
    //_inspectList(list);
    if (request.tree || 1) {
      renderFiletree(list, this.__out);
    }
  },
  _flatten : function(path, basename, list, pix) {
    var full = Path.resolve(path), mod;
    if (this._didPath[full]) return; this._didPath[full] = true;
    if (fs.statSync(full).isDirectory()) {
      var myIdx = list.length;
      path = _trailingSlash(path);
      basename = _trailingSlash(basename);
      list.push({ parentIndex : pix, fullPath : full, prettyPath : path,
        basename : basename });
      var paths = fs.readdirSync(path);
      for (var i = 0; i < paths.length; i++) {
        this._flatten(Path.join(path, paths[i]), paths[i], list, myIdx);
      }
    } else if ((/\.js$/).test(full) && (mod = require(full))._isFapCase) {
      list.push({ module : mod, parentIndex : pix,
        fullPath : full, prettyPath : path, basename : basename });
    }
  },
  _warn : function(msg) {
    // @todo push up, we need a single ui wrapper object that handles
    // colors and gives an out and an err handle that each have puts and write
    process.stderr.write(
      optparse.color.methods.color('warning: ', 'yellow') +
      msg + "\n"
    );
  }
};


// debuggin
function _inspectList(list, out) {
  if (!out) out = process.stdout;
  list.forEach(function(f, idx){
    out.write(''+idx+': '+f.fullPath+' (pidx: ' + f.parentIndex + ')\n');
  });
};


var renderFiletree = exports.renderFiletree = function(list, out) {
  (new Filetree(list)).render(out);
};

function _trailingSlash(path) {
  return '/' == path.substr(path.length - 1) ? path : (path + '/');
}
/**
 * given a flat `list` of elements each of whom may have a `parentIndex`,
 * @return a 2-dimensional array of the same length as `list` plus one,
 * each of whose elements except the last element is null if the `list`
 * item at the same index has no children, and if not null is an array of the
 * indexes of the children the item has.  The last item of the return array
 * is a list of all the indexes of the nodes with no parent element.
 */
function _buildChildrenMap(list) {
  var children = new Array(list.length + 1), root;
  children[children.length - 1] = (root = []);
  for (var idx = 0; idx < list.length; idx ++) {
    if (!children[idx]) children[idx] = null; // just aesthetics
    var pidx = list[idx].parentIndex;
    if (! pidx && 0 != pidx) {
      root.push(idx);
    } else {
      if (!children[pidx]) children[pidx] = [];
      children[pidx].push(idx);
    }
  }
  return children;
};


// from http://en.wikipedia.org/wiki/Box-drawing_characters
var curveTopToRight = '\u2570';
var tRight          = '\u251D';
var pipeVertical    = '\u2502';


function _renderTree(list, chx, childs, out, style, pre, isNotRoot) {
  if (!pre) pre = '';
  if (!style) style = {};
  var fin = style[isNotRoot ? 'last' : 'lastRoot' ] || style.last ||
    (isNotRoot ? "\\_" : '');
  var mid = style[isNotRoot ? 'inner': 'innerRoot'] || style.inner ||
    (isNotRoot ? '|-' : '');
  for (var i = 0, last = childs.length - 1; i <= last; i++) {
    var idx = childs[i], ch = list[idx];
    out.puts(pre + (i==last ? fin : mid) + ch.basename);
    if (chx[idx]) {
      var chPre = pre + (i==last ? (style.blank || ' ') : (style.pipe || '| '));
      _renderTree(list, chx, chx[idx], out, style, chPre, true);
    }
  }
}


function Filetree(list) {
  this.__children = _buildChildrenMap(this.__list = list);
}
Filetree.prototype = {
  render : function(out) {
    var chx = this.__children[this.__children.length - 1];
    _renderTree(this.__list, this.__children, chx, out);
  }
};
