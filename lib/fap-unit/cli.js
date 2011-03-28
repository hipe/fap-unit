var     fs = require('fs'),
      Path = require('path'),
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
    p.on('--tree', 'Just show the tree of files and exit');

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
  if (Path.existsSync(Path.resolve(s))) {
    ctx.request.values.subcommand = 'run';
    var run = this._determineTerminalCommand(ctx.request, ctx);
    if (!run) return run; // probably help was invoked, on a filename!! cool
    return run._function.apply(ctx, run._buildFunctionParameters(ctx));
  } else {
    return this._handleSubcommandNotFound(s, ctx);
  }
};


// if we like this we might do something with it
testDirNames = ['test', 'tests', 'spec', 'specs'];
/**
 * Experimental syntax hack to allow the default behavior be just
 * simply to run all tests.  Search a hard-coded array of possible
 * test folders for existence, and if one is found in `cwd` assume
 * user simply wants to run all tests.
 * If this was invoked it was invoked on our root command object
 * which we can presumably means that no subcommand was provided.
 */
exports.command.handleMissingRequiredPositional = function(param, ctx) {
  var useDir, i;
  for (i = 0; i < testDirNames.length; i++) {
    var path = process.cwd() + '/' + testDirNames[i];
    if (Path.existsSync(path) && fs.statSync(path).isDirectory()) {
      useDir = testDirNames[i]; // careful!
      break;
    }
  }
  if (useDir) {
    ctx.request.values.subcommand = 'run';
    var run = this._determineTerminalCommand(ctx.request, ctx);
    if (!run) return run; // probably help was invoked
    // the `paths` element of the request (@spot1) will have been
    // populated with the default path. change that. careful!
    ctx.request.values.path = [useDir];
    return run._function.apply(ctx, run._buildFunctionParameters(ctx));
  } else {
    return this._handleMissingRequiredPositional(param, ctx);
  }
};
