exports.run = function() {
  var tr = new TreeRunner();
  return tr.run.apply(tr, arguments);
};

function TreeRunner(){}
TreeRunner.prototype = {
  toString: function(){ return 'TreeRunner'; },
  run : function(request, out) {
    this.__paths = request.path;
    this.__out = out;
    this.__out.puts("@todo: run tests for paths: "+request.path.join(', '));
  }
};
