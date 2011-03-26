var paths = require('./paths');
var optparse = require(paths.optparse);

exports.command = optparse.build(function(o) {
  o.desc('(note this is not for running tests!)');

  o.on('generate-example', "Generate an example test folder and file",
                                                        function(p) {
    p.on('-n', '--dry-run', "Don't actually write the files.");
    p.arg('[out-dir]', 'where to put them (default: "{default}")',
      {'default':'./test'}
    );
    p.execute(function() {
      return (new Generator(this.request.values, this.err)).run();
    });
  });
});

var path = require('path'),
   fsTasks, metaParser, color;

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
