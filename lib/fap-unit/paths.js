var path = require('path');

var o = path.normalize(__dirname + '/../..');

exports.fapDoc = path.normalize(__dirname + '/../../../fap-doc');
exports.optparse = o + '/vendor/fuckparse/lib/fuckparse';
exports.template = o + '/data';
