/**
 * (see README.md in the root of the project for high-level overview)
 */

var assert = require('assert'),
       sys = require('sys'),
       optparse = require('../vendor/fuckparse/lib/fuckparse');

// utils
exports.uncolorize = optparse.Color.methods.uncolorize;

// experimental
extend = function (tgt) {
  var i,j; for (i = 1; i < arguments.length; i++) {
    var src = arguments[i], p;
    for (j in src) {
      if ((p = src.__lookupGetter__(j))) {
        tgt.__defineGetter__(j, p);
      } else if ((p = src.__lookupSetter__(j))) {
        tgt.__defineSetter__(j, p);
      } else {
        tgt[j] = src[j];
      }
    }
  }
  return tgt;
};

// Name Conventions: Prototoype publicMethod _privateMethod __privateDataMember

var Assertions = function(counts, caseName) {
  this.num = counts;
  this.caseName = caseName;
};

Assertions.prototype = {
  toString : function() { return 'fapunit Assertion for '+this.caseName; },
  _dot : function() {
    sys.print('.');
  },
  _F : function() {
    sys.print('F');
  },
  _E : function() {
    sys.print('E');
  },
  _okNotify : function() {
    this.num.oks ++;
    this._dot && this._dot();
  },
  _failNotify : function() {
    this.num.fails ++;
    this._F && this._F();
  },
  ok : function(value, message) {
    this.num.asserts ++;
    if (!!value) { this._okNotify(); return; }
    this._failNotify();
    assert.ok(value, message);
  },
  equal : function(actual, expected, message) {
    this.num.asserts ++;
    if (actual == expected) { this._okNotify(); return; }
    this._failNotify();
    assert.equal(actual, expected, message);
  }
};
var FapCasesRunner = function(){
  this._fullStackOnAssertFails = false; // one day.. command line opts
  this._fullStackOnExceptions = true;
  this._noticeOnEmptyMatch = true;
  this._matchers = {};
  this.cases = [];
};
FapCasesRunner.prototype = {
  color : optparse.Color.methods.color,
  notice : function(str) { return this.color(str, 'yellow'); },
  toString : function() {
    return 'FapCasesRunner ' + this.cases.size + ' cases.';
  },
  addCase : function(testcase) {
    this.cases.push(testcase);
    return this;
  },
  run : function() {
    if (!this._beforeRunAll()) return; // should have printed errors
    for (var i = 0; i < this.cases.length; i++)
      this._runCase(this.cases[i]);
    this._afterRunAll();
  },
  _runCase : function(tc, asChild) {
    this.testcase = tc;
    if (!this._matchers['case'] ||
      this._match('case', this.testcase.name)
    ) {
      this._beforeRunCase(asChild);
      var testName;
      for (testName in this.testcase.tests) {
        if (this._matchers.test && ! this._match('test', testName)) continue;
        this._runCaseWithCatch(testName);
        this.num.tests ++;
      }
    }
    this.testcase = null;
    if (tc.__children) {
      for (var i = 0; i < tc.__children.length; i++) {
        this._runCase(tc.__children[i], true);
      }
    }
  },
  _match : function(w, str) {
    var i;
    if (this._matchers[w].regexps) {
      for (i=this._matchers[w].regexps.length; i--;) {
        if (this._matchers[w].regexps[i].test(str)) return true;
      }
    }
    if (this._matchers[w].literals) {
      for (i=this._matchers[w].literals.length; i--;) {
        if (this._matchers[w].literals[i] == str) return true;
      }
    }
    return false;
  },
  puts : sys.puts,
  _makeMatchers : function(w, args) { // w is 'test' or 'case'
    if (!this._matchers[w]) this._matchers[w] = {};
    var md, i, arg;
    for (i=0; i<args.length; i++) {
      arg = args[i];
      if ((md = (/^\/(.+)\/([a-z]*)$/).exec(arg))) {
        if (md[2].length && 'i' != md[2]) {
          this.puts(
          "Can't make matcher with \""+md[0]+
          "\": invalid flag(s) \""+md[2]+"\".");
          this.puts("(The only regexp flag "+
          "that makes sense to in this context is 'i'.)");
          return false;
        }
        if (!this._matchers[w].regexps) this._matchers[w].regexps = [];
        this._matchers[w].regexps.push(new RegExp(md[1], md[2]));
      } else {
        if (!this._matchers[w].literals) this._matchers[w].literals = [];
        this._matchers[w].literals.push(arg);
      }
    }
    return true;
  },
  _inspectMatchers : function() {
    var toks = [];
    if (this._matchers['case'])
      toks.push('cases matching '+this._inspectMatcher('case'));
    if (this._matchers['test'])
      toks.push('tests matching '+this._inspectMatcher('test'));
    return toks.join(' with ');
  },
  _inspectMatcher : function(w) {
    var r = this._matchers[w].regexps, l = this._matchers[w].literals, a = [];
    (r && a.push(optparse.oxfordComma(r, ' or ')));
    (l && a.push(optparse.oxfordComma(l,' or ', optparse.oxfordComma.quote)));
    return a.join(' or ');
  },
  _runCaseWithCatch : function(testName) {
    try {
      this.testcase._runTest(testName);
    } catch( e ) {
      if (e.name != 'AssertionError') {
        this.testcase.assert._E(); // @fixme
        this.num.unexpectedExceptions ++;
      }
      this.exceptionRecords.push([this.testcase, testName, e]);
    }
  },
  _beforeRunAll : function() {
    this.exceptionRecords = [];
    this.num = {
      oks : 0, tests : 0, fails : 0, asserts : 0, unexpectedExceptions: 0
    };
    if (!this._parseCommandLineOptions()) return false;
    this._startClock();
    return true;
  },
  _beforeRunCase : function(asChild) {
    this.testcase.assert = new Assertions(this.num,
      this.testcase.name);
    if (!asChild) {
      this._announceCase && this._announceCase();
      this._announceStarted && this._announceStarted();
    }
  },
  _announceCase : function() {
    this.puts("Loaded case "+(this.testcase.name || '[no name]'));
    // @todo: in ruby test-unit this says "loaded suite". what does it mean?
  },
  _announceStarted : function() {
    this.puts("Started");
  },
  _afterRunAll : function() {
    this._stopClock();
    this._announceSummary && this._announceSummary();
    if (this.exceptionRecords.length > 0) this._displayExceptions();
  },
  _startClock : function() {
    this.t1 = new Date();
  },
  _stopClock : function() {
    this.elapsedMs = (new Date()).getTime() - this.t1.getTime();
    this.puts("\nFinished in "+(1000.0 * this.elapsedMs)+" seconds.");
  },
  _announceSummary : function() {
    this.puts(this.num.tests+" tests, "+this.num.asserts+' assertions, '+
      this.num.fails+' failures, '+this.num.unexpectedExceptions+' errors'
    );
    if (0==this.num.tests && (this._matchers['case']||this._matchers.test) &&
      this._noticeOnEmptyMatch) this.puts(
        "("+this.notice('notice:')+" found no "+this._inspectMatchers()+'.)');
  },
  _displayExceptions : function() {
    for (var i = 0; i < this.exceptionRecords.length; i ++) {
      var arr = this.exceptionRecords[i];
      if ('AssertionError' == arr[2].name) {
        this._onAssertionError.apply(this, arr);
      } else {
        this._onException.apply(this, arr);
      }
    }
  },
  _onAssertionError : function(testcase, meth, e) {
    var msg = testcase.name + "." + meth + ' assertion failed: ';
    msg += (e.message ? ('"'+e.message+'"') : e.toString());
    this.puts("\n"+msg);
    if (this._fullStackOnAssertFails) {
      this.puts(e.stack);
    } else {
      this.puts(this._sillyStackSlice(e.stack));
    }
  },
  _onException : function(testcase, meth, e) {
    var msg = '' + testcase.caseName + "." + meth + ' threw exception: ' +
      e.toString();
    this.puts("\n"+msg);
    if (this._fullStackOnExceptions) {
      this.puts(e.stack);
    } else {
      this.puts(this._sillyStackSlice(e.stack));
    }
  },
  _sillyStackSlice : function(st) {
    return st.split("\n").slice(2,3).join("\n");
  },
  _parseCommandLineOptions : function() {
    // @todo loosen this up one day when we figure out what we are doing
    var parser = optparse.build(function(o){
      o.on('-n NAME', '--name=NAME', 'Runs tests matching NAME.',
                                     '(/Patterns/ may be used.)', {list:1});
      o.on('-t TC', '--testcase=TESTCASE',
                              'Runs tests in TestCases matching TESTCASE.',
                              '(/Patterns/ may be used.)', {list:1});
    });
    var req = parser.parse(process.argv);
    if (undefined == req) return true; // no options were passed, keep going
    if (false == req) return false; // final output was put, exit
    if (req.values.name &&
      !this._makeMatchers('test', req.values.name)) return false;
    if (req.values.testcase &&
      !this._makeMatchers('case', req.values.testcase)) return false;
    return true; // we prepared the things, now please run the tests.
  }
};

var FapCase = {}; // one day might become a constructor again

FapCase.globalRunEnabled = true;

FapCase.proto = {
  _isFapCase : true,
  toString : function() {
    var s = 'FapCase: ' + (this.caseName || '[no name]');
    if (this.__children) s += ', ' + (this.__children.length) + ' children';
    return s;
  },
  testCaseInit : function(tests, name) {
    if (name) this.__caseName = name;
    this.__tests = tests || {};
  },
  get name() {
    return this.__caseName;
  },
  get tests() {
    // we used to use /^test(?=[ _A-Z0-9])[ _]?(.+)$/
    return this.__tests;
  },
  /**
   * this is the run method that clients call in their test files
   * to run test cases directly.  not to be used internally in this API
   */
  run : function() {
    if (FapCase.globalRunEnabled) {
      var run = (new FapCasesRunner()).addCase(this);
      run.run();
    }
  },
  /**
   * create a child testcase of this testcase.  experimental.
   * provide between zero and two arguments,
   * as zero or one string and zero or one object,
   * the string being the name of the testcase and the object
   * being the tests.
   */
  childCase : function() {
    var args = [{}]; // allocate the memory for the case
    for (var i = 0; i < arguments.length; i++) args.push(arguments[i]);
    var childCase = exports.testCase.apply(exports, args);
    if (!this.__children) this.__children = [];
    this.__children.push(childCase);
    return childCase;
  },
  /**
  * experimental test case adder, after the fact.
  */
  test : function(name, f) {
    this.__tests[name] = f;
  },
  captureOutput : function(f) {
    var out = process.stdout;
    if (!out.__fuHacked) _enableOutputBuffering(out);
    out.push();
    try {
      f.call(this);
    } finally {
      this.__lastOutput = out.pop().toString();
    }
    return this.__lastOutput.length; // not sure what
  },
  get lastOutput() {
    return this.__lastOutput;
  },
  // to be called only from runner
  _runTest : function(testName) {
    this.__tests[testName].apply(this);
  }
};
/**
 * experimental and risky hack :
 * allow things like sys.puts() (process.stdout.write())
 * to write to a buffer (array)
 * instead of writing to stdout.  kinda like output buffering.
 */
function _enableOutputBuffering(out) {
  if (out.__fuHacked) return false;
  out.__fuHacked = true;
  out.__fuStack = [];
  out.__fuCurrent = out;
  out.push = function() {
    this.__fuStack.push(this.__fuCurrent);
    this.__fuCurrent = new StringBuffer();
  };
  out.pop = function() {
    var ret = this.__fuCurrent;
    // never overwrite __fuCurrent with null! make sure that
    // out.puts() always does something.
    if (this.__fuStack.length) {
      this.__fuCurrent = this.__fuStack.pop();
    }
    return ret;
  };
  out.__fuOrigWrite = out.write;
  out.write = function(str) {
    return this.__fuCurrent[
      this.__fuCurrent.__fuOrigWrite ? '__fuOrigWrite' : 'write'
    ](str);
  };
  return true;
};

/**
 * mock the look of sys, part of _enableOutputBuffering. experimental.
 */
function StringBuffer(){
  this.__dataArr = [];
}
StringBuffer.prototype = {
  toString : function() { return 'StringBuffer('+this.__dataArr.length+')'; },
  write : function(data) {
    this.__dataArr.push(data);
  },
  toString : function() {
    return this.__dataArr.join('');
  }
};

exports.testCase = function() {
  var name, objs = [];
  for (var i = 0; i < arguments.length; i++) {
    switch(typeof arguments[i]) {
      case 'string' :
        if (name) throw new TypeError("mutliple names?");
        name = arguments[i];
        break;
      case 'object' :
        objs.push(arguments[i]);
        break;
      default:
        throw new TypeError(
          "invalid type for construction: "+typeof(arguments[i]));
    }
  }
  if (2 < objs.length) {
    throw new TypeError(
      "cannot pass more than 2 objects to testCase constructor");
  }
  var tc = objs.shift() || {};
  var tests = objs.shift();
  extend(tc, FapCase.proto);
  tc.testCaseInit(tests, name);
  return tc;
};
