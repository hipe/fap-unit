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

    // here's some code you want to test (usually in another module)
    function addTwo(a, b) { return a + b; }


    // To create a testCase object (the shorthand way):
    // [if we turn `exports` into the test case, we can
    //   export it as a module to the test suite]
    // [give a meaningful name for more useful reports]
    // [pass it some tests]

    require("fap-unit").testCase(exports, "My Widget", {

      // name your test function something meaningful to you
      "addThese() should work" : function() {

        // do some setup and run your stuff
        var res = addTwo(1,2);

        // use the familiar assert functions
        this.assert.equal(3, res, "result should be 3");

      }
    }).run();

    // (experimental: run() must be called at the end of your file
    // if you want to be able to run the file directly from the
    // command line (or you would otherwise like to run the
    // tests explicitly.)

    // run() is deactiviated when this file is pulled in
    // as a module)

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
