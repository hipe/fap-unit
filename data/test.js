#!/usr/bin/env node
;

require(__dirname + "{fu-path}").testCase(exports, "my tests", {

  "one should equal one" : function() {
    // do some stuff
    var val = 1;
    this.assert.equal(val, 1, "result should be one");
  },

  "string must look good" : function() {
    // do some stuff
    var str = "a\nb\nc";
    this.assert.match(str, /^a\n.\nc$/, "str must be abc");
  }

}).run();
