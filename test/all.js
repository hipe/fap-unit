#!/usr/bin/env node
;


var fu = require('../lib/fap-unit');
var all = fu.testCase('all');



all.test('basic usage', function() {

  require.paths.unshift(__dirname + '/../lib'); // make below prettier

  this.captureOutput(function(){

    // start story "basic usage"

    // here's some code you want to test
    function addTwo(a, b) { return a + b; }

    // require the module
    var fapunit = require('fap-unit');

    // make a test case object, choose a name
    var tc = fapunit.testCase('My Widget');

    // add a test function to the test case, give it a name
    tc.test('add should work', function(){

      var res = addTwo(1, 2);

      this.assert.equal(3, res, "result should be 3");

    });

    tc.run(); // for now we run this thing explicitly

    // end story

  });

  var tgt = 'Loaded case My Widget\n'+
    'Started\n'+
    '.\n'+
    'Finished in 0 seconds.\n'+
    'ohai in red\n1 tests, 1 assertions, 0 failures, 0 errors\n';
  var have = fu.uncolorize(this.lastOutput);
  this.assert.equal(tgt, have);
});


all.run();
