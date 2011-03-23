var sys = require('sys');
// bootstrapped test stuff !
var numOk = 0; numFailed = 0;
var ok = function(b, msg) {
  if (b) { numOk += 1; sys.print('.'); }
  else { numFailed += 1; sys.puts("\nfailed "+msg); }
};
var equal = function(a, b, msg) {
  if (a==b) { numOk +=1; sys.print('.'); }
  else { numFailed +=1; sys.puts("\nfailed: "+msg+' "'+a+'" "'+b+'"'); }
};
var reportSummary = function(){
  sys.puts("\n"+(numOk+numFailed)+' assertions, '+numFailed+' failures');
};
