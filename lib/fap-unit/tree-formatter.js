var fu = require('./../fap-unit'),
    tr = require('./tree-runner');

/**
 * This is treeFormatter.Formatter, crowning achievement of mankind.
 *
 * The nature of this beast is this: we somehow got a tree of testNodes
 * that we turned into rows.  Durning the run of tests, we get signals from the
 * test runner that a certain test case *will* run or test (method) *has* run.
 * We must make sure that these are executed by the runner in the same order
 * that we have them here.  Render the (sub) tree progressively, as tests are
 * run, showing which tests are failing or have errors.
 *
 * What we end up with is a two-column display, with the "test tree"
 * (filesystem and below) tree on the left and a narrative linear
 * story on the right, with the lines corresponding.  it's so fucking brilliant.
 *
 * This has the multifaceted benefits of: a) showing the narrative storyline
 * of the tests.  b) showing how the narrative storyline of the tests, and each
 * test, fits into the context of the test files in the filesystem.
 * c) showing visually and relating to the above which tests are failing
 * d) indicating visually which tests may be taking a long time to execute.
 *
 */

exports.Formatter = function(out, opts) {
  this._formatterInit(out, opts);
  this.myNum = {};
};
exports.Formatter.prototype = fu.extend({}, fu.DefaultFormatter.prototype, {
  setTree : function(tree) {
    this.__nextRow = 0;
    this.__tree = tree;
    this.__rows = this.__tree.buildRows(true, 'none'); // include tests, color
    this.__table = new tr.table.Table(this.__rows, this.__tree.tableFormat);
    this.__trows = this.__table.buildPrerenderedRows();
  },
  testCaseLoaded : function(tc) {
    var stop = tc.id;
    this._printRowsUpTo('green', function(row) {
      return row.testNode.module && row.testNode.module.id == stop;
    });
  },
  testCaseStarted : function() { },
  testCaseFinished : function() { },
  beforeRunAll : function(cases, num) {
    this.num = num;
  },
  beforeTest : function(testName) {
    this.myNum.fails = this.num.fails;
    this.myNum.unexpectedExceptions = this.num.unexpectedExceptions;
    this.currTestName = testName;
  },
  afterTest : function() {
    var anyFails = this.num.fails - this.myNum.fails;
    var anyError = this.num.unexpectedExceptions -
      this.myNum.unexpectedExceptions;
    var currTestName = this.currTestName;
    var useColor = (anyFails || anyError) ? 'red' : ['bright', 'green'];
    // the row on deck should be the only once to print but w/e
    this._printRowsUpTo(useColor, function(row) {
      return (row.testNode.testName == currTestName);
    });
  },
  okTick : function() { },
  failTick : function() { },
  errorTick : function() { },
  //stopClock : function(elapsedMs) {
  _printRowsUpTo : function(color, f) {
    var stop = false;
    while (this.__nextRow < this.__trows.length && !stop) {
      var row = this.__rows[this.__nextRow];
      var trow = this.__trows[this.__nextRow];
      this.__out.puts(trow[1] + tr.color(trow[2], color));
      debugger; debugger;
      stop = f(row);
      ++this.__nextRow;
    }
  }
});
