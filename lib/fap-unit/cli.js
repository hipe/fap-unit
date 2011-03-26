var   path = require('path'),
     paths = require('./paths'),
  optparse = require(paths.optparse),
        fu = require('./../fap-unit');


/**
 * for now the runner prototype uses this for single module runs
 * and we use it here for tree runs
 */
exports.common = function(o) {
  o.on('-n NAME', '--name=NAME', 'Runs tests matching NAME.',
                                 '(/Patterns/ may be used.)', {list:1});
  o.on('-t TC', '--testcase=TESTCASE',
                          'Runs tests in TestCases matching TESTCASE.',
                          '(/Patterns/ may be used.)', {list:1});
};


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


  o.on('run', "Run the test module(s) in the file(s) or folder(s)",
                                                        function(p) {
    p.syntaxString('[run]'); // we hack the syntax below
    exports.common(p);

    p.arg('[path [path [...]]]',
           'files or folders of tests to run (default: {default})',
                               { 'default' : ['test/'] }
    );

    p.execute(function() {
      return require('./tree-runner').run(this.request.values, this.err);
    });
  });
});

/**
 * Experimentally we hack our syntax to allow the omission of the "run"
 * subcommand.  Syntactically this is not problematic because the "run"
 * subcommand can always be used explicitly to avoid name conflicts between
 * subcommands and folders.
 * Subcommand.
 */
exports.command.handleSubcommandNotFound = function(s, ctx) {
  if (path.existsSync(path.resolve(s))) {
    ctx.request.values.subcommand = 'run';
    var run = this._determineTerminalCommand(ctx.request, ctx);
    return run._function.apply(ctx, run._buildFunctionParameters(ctx));
  } else {
    return this._handleSubcommandNotFound(s, ctx);
  }
};
