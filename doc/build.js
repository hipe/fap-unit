#!/usr/bin/env node
;

var fap = require('path').normalize(__dirname +'/../../fap-doc');
require.paths.push(fap + '/lib');
require.paths.push(fap + '/vendor/petrify/lib');
require.paths.push(fap + '/vendor/petrify/deps');
require.paths.push(fap + '/vendor/petrify/deps/json-template/lib');
require.paths.push(fap + '/vendor/petrify/deps/markdown-js/lib');

require('fap-doc/petrify-hacks').hackPetrify(function(h) {
  h.processSidebars();
  h.processSee();
  h.processCodeBlocks({
    theme : 'shCoreFadeToGrey.css',
    gutter : false
  });
  h.includeStrangeDataFiles(['../../README.md']);
  h.setMetadata('../../README.md', {
    'directory-index'   : 1,
    'page-title-short'  : "Intro",
    'code-blocks'       : '[js,{class:console},terminal]'
  });
});

require('buildrunner').run({
  data_dir:     __dirname + '/data',
  view_dir:     __dirname + '/view',
  template_dir: __dirname + '/template',
  output_dir:   __dirname + '/www',
  media_dirs:  [__dirname + '/media']
});
