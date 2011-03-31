var path = require('path');

var o = path.normalize(__dirname + '/../..');     // root folder of this package
var O = path.normalize(__dirname + '/../../../'); // uber parent folder

exports.fapDoc   = O + '/fap-doc';
exports.optparse = O + '/fuckparse/lib/fuckparse';
exports.template = o + '/data';
