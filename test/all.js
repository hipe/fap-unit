#!/usr/bin/env node
;

require.paths.unshift(__dirname + '/../lib'); // make below prettier
                                              // @fixme read up on it
var fu = require('fap-unit');
fu.testCase(exports, 'all', {

  /**
   * this is a regression test for when the next test isn't working
   */
  "basic usage content" : function() {
    function addTwo(a, b) { return a + b; }
    var res = addTwo(1, 2);
    this.assert.equal(3, res, "result should be 3");
  },

  "basic usage" : function () {
    this.assert.match(
      fu.uncolorize(this.captureOutput(function(){
        // (don't actually use the real exports in the story below!)
        var exports = {};

        // start story "basic usage"

        // Let's say you wrote this code you want to test.
        // (Often this is in another module that you pull in, but
        // maybe not for single file distributions with in-file tests.
        function addTwo(a, b) { return a + b; }


        // To create a testCase object (the shorthand way):
        // [if we turn `exports` into the test case, we can
        //   export it as a module to the test suite]
        // [give a meaningful name for more useful reports]
        // [pass it some tests]

        require("fap-unit").testCase(exports, "My Widget", {

          // name your test function something meaningful to you
          "addTwo() should work" : function() {

            // do some setup and run your stuff
            var res = addTwo(1,2);

            // use the familiar assert functions
            this.equal(res, 3, "result should be 3");

          }
        }).run();

        // For now, run() must be called at the end of your file
        // if you want to be able to run the file directly from the
        // command line (or you would otherwise like to run the
        // tests explicitly.)
        
        // when the fapdoc test runner loads the file as part
        // of a test sweet, run() is effectivey deactivated.

        // end story
      })),
      new RegExp('^Loaded case My Widget\n'+
        'Started\n'+
        '\\.\n'+
        'Finished in \\d+ seconds\\.\n'+
        '1 tests, 1 assertions, 0 failures, 0 errors\n$', 'm'
      )
    );
  }
}).run();
