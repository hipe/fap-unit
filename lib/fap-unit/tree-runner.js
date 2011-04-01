var   fs = require('fs'),
      fu = require('./../fap-unit'),
    Path = require('path'),
   paths = require('./paths.js'),
optparse = require(paths.optparse),
   color = optparse.color.methods.color,
   table = optparse.table;

exports.color = color; // centralize the coupling to these
exports.table = table;

exports.run = function() {
  var tr = new TreeRunner();
  return tr.run.apply(tr, arguments);
};

function TreeRunner(){ }
TreeRunner.prototype = {
  toString : function(){ return 'TreeRunner'; },
  run : function(request, out) {
    this._beforeRun(request, out);
    var runner = (new fu.Runner(out)).
      setOutputFormat(request.format).
      addFilters(request);
    if (!runner) return false; // @todo (this is for when you pass bad filters);
    var usePaths = this._cleanPaths(request.path);
    var list = this._buildListForTree(usePaths, 'test', runner.filters);
    //_inspectList(list);
    var tree = new TestTree(list);
    if (request.tree) {
      tree.render(this.__out, request.tree);
      return null; // never keep going, for now
    }
    for (var i = 0; i < list.length; ++i) {
      if ('file' == list[i].nodeType) {
        runner.addCase(list[i].module);
      }
    }
    runner.formatter.setTree && runner.formatter.setTree(tree);
    runner.run();
    return null; // there is a hiccup if you return true-ish @todo
  },
  _beforeRun : function(request, out) {
    this.__out = out;
    this._didPath = {}; // if you get same path multiple times from different
                        // surface paths for some strange reason, don't repeat.
  },
  _cleanPaths : function(paths) {
    var usePaths = [];
    for (var i = 0; i < paths.length; i++) {
      if (! Path.existsSync(paths[i])) {
        this._warn("path not found: "+paths[i]);
        continue;
      }
      usePaths.push(paths[i]);
    }
    return usePaths;
  },
  _buildListForTree : function(paths, level, filters) {
    var list = [], me = this;
    fu.suppressRun(function(){
      for (i = 0; i < paths.length; i++) {
        me._flatten(paths[i], paths[i], list, null, level, filters);
      }
    });
    return list;
  },
  _flatten : function(path, basename, list, pix, level, filters) {
    var full = Path.resolve(path);
    if (this._didPath[full]) return; this._didPath[full] = true;
    var mod, node = {
      absPath     : full,
      prettyPath  : path,
      basename    : basename,
      parentIndex : pix
    };
    if (fs.statSync(full).isDirectory()) {
      node.nodeType = 'dir';
      this._flattenDir(node, list, level, filters);
    } else if ((/\.js$/).test(full) && (mod = require(full))._isFapCase) {
      node.nodeType = 'file';
      node.module = mod;
      this._flattenCase(node, list, level, filters);
    }
  },
  _flattenDir : function(node, list, level, filters) {
    node.prettyPath = _trailingSlash(node.prettyPath);
    node.basename   = _trailingSlash(node.basename);
    var myIdx = list.length;  list.push(node);
    var paths = fs.readdirSync(node.absPath);
    for (var i = 0; i < paths.length; i++) {
      this._flatten(
        Path.join(node.prettyPath, paths[i]),
        paths[i], list, myIdx, level, filters
      );
    }
  },
  _flattenCase : function(node, list, level, filters) {
    var mod = node.module, cx;
    var myIdx = list.length; list.push(node);
    if (level == 'test' && filters.testTestCaseName(mod.name)){
      for (testName in mod.tests) {
        if (!filters.testTestName(testName)) continue;
        list.push({
          nodeType    : 'test',
          parentIndex : myIdx,
          testName    : testName,
          basename    : '',
          module      : mod
        });
      }
    }
    if (('case'==level || 'test'==level) && (cx = mod.childCases())) {
      for (var i = 0; i < cx.length; i++) {
        var child = {
          nodeType    : 'childCase',
          parentIndex : myIdx,
          basename    : '[case]',
          testName    : cx[i].name,
          module      : cx[i]
        };
        this._flattenCase(child, list, level, filters);
      }
    }
  },
  _warn : function(msg) {
    // @todo push up, we need a single ui wrapper object that handles
    // colors and gives an out and an err handle that each have puts and write
    process.stderr.write(color('warning: ', 'yellow') +msg + "\n");
  }
};


// debuggin
function _inspectList(list, out) {
  if (!out) out = process.stdout;
  list.forEach(function(f, idx){
    out.write(''+idx+': '+(f.prettyPath||f.basename) +
      ' (pidx: ' + f.parentIndex + ')\n');
  });
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
var tRight          = '\u2523';
var pipeVertical    = '\u2503';


function _renderTree(list, chx, childs, style, lineCallback) {
  var pre       = arguments[5]; // secret param just for recursive calls
  var isNotRoot = arguments[6]; // ditto above
  if (!style || !style.__parsed) {
    (undefined == pre) && (pre = '');
    (undefined == style) && (style = {});
    style = {
      __parsed : true,
       blank  :  undefined == style.blank    ? ' '   : style.blank,
       pipe   :  undefined == style.pipe     ? '| '  : style.pipe,
       inner  :  undefined == style.inner    ? "|-"  : style.inner,
       inner0 :  undefined == style.inner0   ? ''    : style.inner0,
       last   :  undefined == style.last     ? "\\-" : style.last,
       last0  :  undefined == style.last0    ? ''    : style.last0
    };
  }
  for (var i = 0, last = childs.length - 1; i <= last; i++) {
    var idx = childs[i], ch = list[idx];
    var prefix = (pre + (i == last ?
      style[isNotRoot ? 'last' :  'last0'] :
      style[isNotRoot ? 'inner' : 'inner0']
    ));
    lineCallback(prefix, ch);
    chx[idx] && _renderTree(list, chx, chx[idx], style, lineCallback,
      (pre + style[i == last ? 'blank' : 'pipe']), true
    );
  }
}

function TestTree(list) {
  this.__children = _buildChildrenMap(this.__list = list);
  this.tableFormat = [{align:'left'},{align:'left', padLeft:' '}];
}
TestTree.prototype = {
  render : function(out, tree) {
    var rows = this.buildRows('green', tree);
    table.methods.render(rows, this.tableFormat, out);
  },
  buildRows : function(useColor, level) {
    (undefined == useColor) && (useColor = 'none');
    var rows = [];
    var chx = this.__children[this.__children.length - 1], me = this;
    _renderTree(this.__list, this.__children, chx,
      { // comment the below 3 lines out to see the default ascii box drawing
        inner : '' + tRight + ' ',
        last  : '' + curveTopToRight + ' ',
        pipe  : '' + pipeVertical + ' '
      },
      function(prefix, node){
        var basename, title;
        basename = prefix + node.basename;
        var doNode = true;
        switch (node.nodeType) {
          case 'childCase' :
            if ('file' == level) {
              doNode = false;
              break;
            } // else fall through!!
          case 'file' :
            title = node.module.name ?
              color('"' + node.module.name + '"', useColor) : '';
            break;
          case 'test' :
            if ('test' == level) {
              title = color('"' + node.testName +'"', useColor);
            } else {
              doNode = false;
            }
            break;
          default:
            title = '';
        }
        if (doNode) {
          var row = [null, basename, title];
          row.testNode = node;
          rows.push(row);
        }
      }
    );
    return rows;
  }
};
