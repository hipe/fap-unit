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
      return require('./generator').run(this.request.values, this.err);
    });
  });
});

