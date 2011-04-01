/**
 * This is part of #api-1.0!  only add to this, don't take away.
 */
exports.backtrace = function(str) {
  return new _Backtrace(str);
};

function _Backtrace(str) {
  this.i = 0;
  this.lines = str.split('\n');
}
_Backtrace.prototype = {
  // if we want it, we could: (but there's no break; so it's annoying)
  // foreEach : function(f) {
  //   var curr;
  //   while ((curr = this.next())) { f(curr, this.i-1); }
  // },
  next : function(f) {
    var curr = this.current();
    curr && ++this.i;
    return curr;
  },
  current : function() {
    return this.at(this.i);
  },
  at : function(idx) {
    if (idx >= this.lines.length) return null;
    var md, str = this.lines[idx];
    md = (
    /^    at ([^\.]+)\.([^ ]+) \(([^:]+):([0-9]+):([0-9]+)\)$/).exec(str);
    return md ? { object : md[1] , method : md[2], path : md[3], string : md[0],
      line : parseInt(md[4], 10), column : parseInt(md[5], 10),
      toString : function() { return this.string; }
    } : str;
  }
};
