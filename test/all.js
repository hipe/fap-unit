#!/usr/bin/env node
;

require.paths.unshift(__dirname + '/../lib'); // make below prettier
                                              // @fixme read up on it
var fu = require('fap-unit');
fu.testCase(exports, 'all', {
"basic usage" : function () {
  this.captureOutput(function(){
    // (don't actually use the real exports in the story below!)
    var exports = {};

    // start story "basic usage"

    // require the module (usually at the top of your test file)
    var fapunit = require("fap-unit");

    // here's some code you want to test (usually in another module)
    function addTwo(a, b) { return a + b; }


    // super shorthand way to create a testcase object, give it a name
    // and assign it some tests.  we usually want to turn the module
    // (`exports`) into the testcase so we can run it in a suite.

    require("fap-unit").testCase(exports, "My Widget", {

      // name your test function something meaningful to you
      "add should work" : function() {

        this.assert.equal(3, addTwo(1,2), "result should be 3");

      }
    }).run();

    // experimental: run() must be called at the end of your file
    // if you want to be able to run the file directly from the command line
    // (or you would otherwise like to run the tests explicitly.)

    // (when this file is pulled in as a module, the run is deactivated.)

    // end story
  });

  var tgt = new RegExp('^Loaded case My Widget\n'+
    'Started\n'+
    '\\.\n'+
    'Finished in \\d+ seconds\\.\n'+
    '1 tests, 1 assertions, 0 failures, 0 errors\n$', 'm');
  var have = fu.uncolorize(this.lastOutput);

  this.assert.ok(tgt.test(have), 'derpie derpie');

}}).run();
