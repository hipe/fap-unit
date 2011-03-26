var path = require('path'),
   paths = require('./paths'),
   fsTasks, metaParser, color;

exports.run = function(reqValues, stdout) {
  return (new Generator(reqValues, stdout)).run();
};

function Generator(req, out) {
  this.req = req; this.out = out;
}
Generator.prototype = {
  toString : function() { return 'Generator'; },
  run : function() {
    if (!this._loadLibs()) return false;
    var uow = fsTasks.unitOfWork(function(u) {
      u.copy('{src-dir}/test.js', '{tgt-test-dir}/test.js');
    });
    this.req['dry-run'] && uow.setDryRunOn();
    uow.setTemplateData('tgt-test-dir', (this.__od = this.req['out-dir']));
    uow.setTemplateData('src-dir', paths.template);
    uow.setTemplateData('fu-path', this._bent);
    uow.setManifest(metaParser.read(paths.template + '/README.txt'));
    if (!uow.run(this.out, this.req)) return false;
    return this._andThen();
  },
  _loadLibs : function() {
    fsTasks = require(paths.fapDoc + '/lib/fap-doc/filesystem-tasks');
    metaParser = require(paths.fapDoc + '/lib/fap-doc/meta-parser');
    color = require(paths.optparse).color.methods.color;
    return true;
  },
  _andThen : function() {
    this.out.puts('now try ' +
      color(this.req['out-dir'] + '/test.js', 'green'));
    return true;
  },
  get _bent() {
    return fsTasks.relativePath(path.resolve(this.__od+'/_'), __dirname);
  }
};