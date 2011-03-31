/**
 * (see README.md in the root of the project for high-level overview)
 */

var assert = require('assert'),
       sys = require('sys'),
       optparse = require(require('./fap-unit/paths').optparse);

// util, used outside of this lib
exports.uncolorize = optparse.color.methods.uncolorize;
var color = optparse.color.methods.color;

// experimental. @todo try util.inherits instead
var extend = exports.extend = function (tgt) {
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

/**
 * experimental makes multiline strings easier to read
 */
function inspectString(str, left, right) {
  if (!(/\n/).test(str)) return '"' + str + '"';
  left  || (left  = '    ....');
  right || (right = '....');
  return str.replace(/^(.*)$/gm, function(inner){
    return left + inner + right;
  });
}


// c/p from node's util.js but abstract the stream
var _puts = function() {
  for (var i = 0, len = arguments.length; i < len; ++i) {
    this.__out.write(arguments[i] + '\n');
  }
};


/**
 * formatter that prints no output
 */
var SilentFormatterSingleton = {
  beforeRunAll     : function(){},
  testCaseLoaded   : function(){}, testCaseStarted : function(){},
  testCaseFinished : function(){}, okTick          : function(){},
  okTick           : function(){}, failTick        : function(){},
  errorTick        : function(){}, stopClock       : function(){},
  summary          : function(){}, assertionError  : function(){},
  exception        : function(){}
};

/**
 * print output like test-unit ruby
 */
var DefaultFormatter = exports.DefaultFormatter = function(out, opts) {
  this._formatterInit(out, opts);
};
DefaultFormatter.prototype = {
  beforeRunAll   : function() { },
  testCaseLoaded : function(tc) {
    this._puts("Loaded case "+(tc.name || '[no name]'));
    // @todo: in ruby test-unit this says "loaded suite". what does it mean?
  },
  testCaseStarted : function() {
    this._puts("Started");
  },
  testCaseFinished : function() {
    this.__out.write('\n');
  },
  okTick : function() {
    this.__out.write('.');
  },
  failTick : function() {
    this.__out.write('F');
  },
  errorTick : function() {
    this.__out.write('E');
  },
  stopClock : function(elapsedMs) {
    this._puts("Finished in "+(1000.0 * elapsedMs)+" seconds.");
  },
  summary : function(num, filters) {
    this._puts(num.tests+" tests, "+num.asserts+' assertions, '+
      num.fails+' failures, '+num.unexpectedExceptions+' errors'
    );
    if (0==num.tests && filters.any() && this.__opts.noticeOnEmptyMatch)
      this._puts( "(" + this.notice('notice:') +
        " found no "+filters.inspect()+'.)');
  },
  notice : function(str) { return color(str, 'yellow'); },
  assertionError : function(testcase, meth, e) {
    var msg = testcase.name + '."' + meth + '" assertion failed: ';
    msg += (e.message ? ('"'+e.message+'"') : e.toString());
    this._puts("\n"+msg);
    if (this.__opts.fullStackOnAssertFails) {
      this._puts(e.stack);
    } else {
      this._puts(this._relevantStackSlice(e.stack));
    }
  },
  exception : function(testcase, meth, e) {
    var msg = '' + testcase.name + "." + meth + ' threw exception: ' +
      e.toString();
    this._puts("\n"+msg);
    if (this.__opts.fullStackOnExceptions) {
      this._puts(e.stack);
    } else {
      this._puts(this._relevantStackSlice(e.stack));
    }
  },
  _relevantStackSlice : function(st) {
    // @fixme: we depend on a constant stack depth distance
    // from the client's test code to our code (#spot2)
    return st.split("\n").slice(2, 3).join("\n");
  },
  _puts : _puts,
  _formatterInit : function(out, opts) {
    this.__out = out;
    this.__opts = opts;
  }
};


function Assertions(counts, caseName, formatter) {
  this.num = counts;
  this.__cn = caseName;
  this.__formatter = formatter;
};

/**
 * @todo determine what order the two parameters should go in
 */
Assertions.prototype = {
  toString : function() { return 'fapunit Assertion for '+this.__cn; },
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
  },
  match : function(actual, regexp, message) {
    this.num.asserts ++;
    if (regexp.test(actual)) { this._okNotify(); return; }
    this._failNotify();
    message = enhanceMatchFailMessage(actual, regexp, message);
    // very strange: on a multiline error message, for some reason
    // the third line is printed out again.  we want it to be blank. @todo
    if (-1 != message.indexOf('\n')) message = '\n\n\n' + message;
    this._fail(actual, regexp, message, '=~');
  },
  _okNotify : function() {
    this.num.oks ++;
    this.__formatter.okTick();
  },
  _failNotify : function() {
    this.num.fails ++;
    this.__formatter.failTick();
  },
  _fail : function(actual, expected, message, operator, stackStartFunction) {
    // letting stackStartFunction be defined here is desirable for #spot2
    stackStartFunction || (stackStartFunction = Assertions.prototype._fail);
    throw new assert.AssertionError({
      message: message,
      actual: actual,
      expected: expected,
      operator: operator,
      stackStartFunction: stackStartFunction
    });
  }
};

/**
 * if we keep something like this, it probably won't stay here.
 */
function enhanceMatchFailMessage(actual, regexp, message) {
  var useNeed = color(inspectString(regexp.toString(), '  -', '$'),
    'red');
  var useHave = color(inspectString(actual           , '  +', '$'),
    'green');
  parts = [];
  parts.push(useNeed);
  parts.push(-1 == useNeed.indexOf('\n') ? ' ' : '\n' );
  parts.push("did not match");
  parts.push(-1 == useHave.indexOf('\n') ? ' ' : ':\n' );
  parts.push(useHave);
  if (message) {
    parts = [parts.join('')];
    parts.push(-1 == parts[0].indexOf('\n') ?
      (' -- "' + message +'"') : ('\n(' + message + ')'));
  }
  return parts.join('');
}

var Runner = exports.Runner = function(out) {
  this.__formatterOpts = { // one day.. command line opts maybe
    fullStackOnAssertFails : false,
    fullStackOnExceptions  : true,
    noticeOnEmptyMatch     : true
  };
  this.__out = out;
  this.__filters = new TestFilters();
  this.cases = [];
};
Runner.prototype = {
  toString : function() {
    return 'Runner ' + this.cases.size + ' cases.';
  },
  get filters()   { return this.__filters;   },
  get formatter() { return this.__formatter; },
  setOutputFormat : function(fmt) {
    var f;
    switch (fmt) {
      case 'tree' : f = require('./fap-unit/tree-formatter').Formatter; break;
      case 'orig' : f = DefaultFormatter; break;
      default     : throw new Error('invalid format "' + fmt +'"');
    }
    this.__formatter = new f(this.__out, this.__formatterOpts);
    return this;
  },
  disableAnnouncements : function() {
    this.__formatter = SilentFormatterSingleton;
    return this;
  },
  addCase : function(testcase) {
    this.cases.push(testcase);
    return this;
  },
  run : function() {
    if (!this._parseCommandLineOptions()) return false;
    return this._run();
  },
  _run : function() {
    this._beforeRunAll();
    for (var i = 0; i < this.cases.length; i++) {
      this._runCase(this.cases[i]);
    }
    this._afterRunAll();
    return this;
  },
  _runCase : function(tc, asChild) {
    this.testcase = tc;
    if (this.__filters.testTestCaseName(this.testcase.name)) {
      this._beforeRunCase(asChild);
      var testName;
      for (testName in this.testcase.tests) {
        if (!this.__filters.testTestName(testName)) continue;
        this._runTestWithCatch(testName);
        this.num.tests ++;
      }
      this._afterRunCase(asChild);
    }
    this.testcase = null;
    if (tc.__children) {
      for (var i = 0; i < tc.__children.length; i++) {
        this._runCase(tc.__children[i], true);
      }
    }
  },
  /**
   * part of the api (might be called by fapdoc, etc)
   */
  addLiteralTestFilter : function(storyName) {
    this.__filters.addLiteralTestFilter(storyName);
    return this;
  },
  _runTestWithCatch : function(testName) {
    if (this.__formatter.beforeTest)
      this.__formatter.beforeTest(testName);
    try {
      this.testcase._runTest(testName);
    } catch( e ) {
      if (e.name != 'AssertionError') {
        this.num.unexpectedExceptions ++;
        this.__formatter.errorTick();
      }
      this.exceptionRecords.push([this.testcase, testName, e]);
    }
    if (this.__formatter.afterTest) this.__formatter.afterTest();
  },
  numTestsRan : function() {
    return this.num.tests;
  },
  _beforeRunAll : function() {
    if (!this.__formatter)  this.setOutputFormat('orig');
    this.exceptionRecords = [];
    this.num = {
      oks : 0, tests : 0, fails : 0, asserts : 0, unexpectedExceptions: 0
    };
    this.__formatter.beforeRunAll(this.cases, this.num);
    this._startClock();
  },
  _beforeRunCase : function(asChild) {
    this.testcase.assert = new Assertions(
      this.num, this.testcase.name, this.__formatter);
    if (!asChild) { // @todo this will need revisiting #api-spot-chx
      this.__formatter.testCaseLoaded(this.testcase);
      this.__formatter.testCaseStarted();
    }
  },
  _afterRunCase : function(asChild) {
    if (!asChild) {
      this.__formatter.testCaseFinished();
    }
  },
  _afterRunAll : function() {
    this._stopClock();
    this.__formatter.summary(this.num, this.__filters);
    if (this.exceptionRecords.length > 0) this._displayExceptions();
  },
  _startClock : function() {
    this.t1 = new Date();
  },
  _stopClock : function() {
    this.elapsedMs = (new Date()).getTime() - this.t1.getTime();
    this.__formatter.stopClock(this.elapsedMs);
  },
  _displayExceptions : function() {
    for (var i = 0; i < this.exceptionRecords.length; i ++) {
      var arr = this.exceptionRecords[i];
      if ('AssertionError' == arr[2].name) {
        this.__formatter.assertionError.apply(this.__formatter, arr);
      } else {
        this.__formatter.exception.apply(this.__formatter, arr);
      }
    }
  },
  _parseCommandLineOptions : function() {
    var parser = optparse.build(require('./fap-unit/cli').common);
    var req = parser.parse(process.argv);
    if (undefined == req) return true; // no options were passed, keep going
    if (false == req) return false; // final output was put, exit
    return this.addFilters(req.values);
  },
  addFilters : function(reqValues) {
    var me = this;
    if (reqValues.name &&
      ! this.__filters.addTestFilters(reqValues.name, function(e) {
        me._puts(e);
      })) return false;
    if (reqValues.testcase &&
      !this.__filters.addTestCaseFilters(reqValues.testcase, function(e) {
        me._puts(e);
      })) return false;
    return this; // true-ish on success, also for chaining!! careful!!
  }
};

/**
 * Test filtering is encapulated in this prototype for ease of exporting
 * to other parts of the library that might use it (e.g. tree runner.)
 * zero or more filters (regex or literal) can exist for case names
 * and test names.
 */

var TestFilters = exports.TestFilters = function() {
  this.__filters = {};
};
TestFilters.prototype = {
  addTestFilters : function(strings, errFunc) {
    return this._addFilters('test', strings, errFunc);
  },
  addTestCaseFilters : function(strings, errFunc) {
    return this._addFilters('case', strings, errFunc);
  },
  addLiteralTestFilter : function(string) {
    this._addFilters('test', [storyName], null, true);
  },
  _addFilters : function(w, args, errFunc, isLiteral) { // w is 'test' or 'case'
    if (!this.__filters[w]) this.__filters[w] = {};
    var md, i, arg, errs;
    for ( i = 0; i < args.length; i++ ) {
      arg = args[i];
      if (!isLiteral && (md = (/^\/(.+)\/([a-z]*)$/).exec(arg))) {
        if (md[2].length && 'i' != md[2]) {
          errs || (errs = []);
          errs.push( "Can't make matcher with \"" + md[0] +
            "\": invalid flag(s) \"" + md[2] + "\".");
          errs.push("(The only regexp flag " +
            "that makes sense to in this context is 'i'.)");
        }
        if (!errs) {
          if (!this.__filters[w].regexps) this.__filters[w].regexps = [];
          this.__filters[w].regexps.push(new RegExp(md[1], md[2]));
        }
      } else {
        if (!this.__filters[w].literals) this.__filters[w].literals = [];
        this.__filters[w].literals.push(arg);
      }
    }
    if (errs) {
      errFunc(errs.join('  '));
      return false;
    } else {
      return true;
    }
  },
  any : function() {
    return !! (this.__filters['case'] || this.__filters.test);
  },
  inspect : function() {
    var toks = [];
    if (this.__filters['case'])
      toks.push('cases matching '+this._inspectFilter('case'));
    if (this.__filters['test'])
      toks.push('tests matching '+this._inspectFilter('test'));
    return toks.join(' with ');
  },
  _inspectFilter : function(w) {
    var r = this.__filters[w].regexps, l = this.__filters[w].literals, a = [];
    (r && a.push(optparse.oxfordComma(r, ' or ')));
    (l && a.push(optparse.oxfordComma(l,' or ', optparse.oxfordComma.quote)));
    return a.join(' or ');
  },
  testTestCaseName : function(str) {
    return this._testName('case', str);
  },
  hasTestCaseNameFilters : function() {
    return !! this.__filters['case'];
  },
  testTestName : function(str) {
    return this._testName('test', str);
  },
  hasTestNameFilters : function() {
    return !! this.__filters['test'];
  },
  _testName : function(w, str) {
    if (!this.__filters[w]) return true;
    var i;
    if (this.__filters[w].regexps) {
      for (i=this.__filters[w].regexps.length; i--;) {
        if (this.__filters[w].regexps[i].test(str)) return true;
      }
    }
    if (this.__filters[w].literals) {
      for (i=this.__filters[w].literals.length; i--;) {
        if (this.__filters[w].literals[i] == str) return true;
      }
    }
    return false;
  }
};


var __fapcaseOid = 0;
var FapCase = { }; // one day might become a constructor again


FapCase.__globalRunEnabled = true;

/**
 * certainly we could make higher level wrappers around what this is obviously
 * for -- loading test files without running them -- but this is terse enough
 * and elegant in its way, and makes what is going on a little bit clearer
 */
exports.suppressRun = function(f) {
  var prevVal = FapCase.__globalRunEnabled, res;
  FapCase.__globalRunEnabled = false;
  try { res = f(); } finally { FapCase.__globalRunEnabled = prevVal; }
  return res;
};

FapCase.proto = {
  _isFapCase : true,
  toString : function() {
    var s = 'FapCase: ' + (this.__caseName || '[no name]');
    if (this.__children) s += ', ' + (this.__children.length) + ' children';
    return s;
  },
  testCaseInit : function(tests, name) {
    this.__testCaseId = ++__fapcaseOid;
    if (name) this.__caseName = name;
    this.__tests = tests || {};
  },
  get id() { return this.__testCaseId; },
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
    if (FapCase.__globalRunEnabled) {
      return (new Runner(process.stdout)).addCase(this).run(); // #spot1
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
  /**
  * experimental hack that attempts to change the behavior
  * of process.stdout.write() (used by util.puts(), sys.puts() attotw)
  * so that it writes to a buffer instead of to the stdout stream.
  * It returns the string of what was written to stdout during the execution of
  * function `f`.
  * @return the string, also make it available as .lastOutput
  */
  captureOutput : function(f) {
    var out = process.stdout; // #spot1
    if (!out.__fuHacked) _enableOutputBuffering(out);
    out.push();
    try {
      f.call(this);
    } finally {
      this.__lastOutput = out.pop().toString();
    }
    return this.__lastOutput;
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
