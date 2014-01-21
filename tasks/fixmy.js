/*
 * grunt-fixmyjs
 * https://github.com/jonschlinkert/grunt-fixmyjs
 *
 * Copyright (c) 2013 Jon Schlinkert
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {


  var chalk = require('chalk');
  var fixmyjs = require('fixmyjs');
  var _ = grunt.util._;

  grunt.task.registerMultiTask('fixmyjs', 'Fix your JavaScript.', function() {
    var options = this.options({
      config: '.jshintrc'
    });

    // Extend default options with options from specified jshintrc file
    if (options.config) {
      options = _.extend(options, grunt.file.readJSON(options.config));
    }

    // Iterate over all specified file groups.
    this.files.forEach(function(fp) {
      fp.src.forEach(function(filename) {
        var srcFile = grunt.file.read(filename);
        var re = /(#!\/usr\/bin\/env node)/g;

        // First, comment out '#!/usr/bin/env node' since it breaks fixmyjs.
        srcFile = srcFile.replace(re, '//$1');

        // Handle options.
        var fixjs = fixJavaScript(srcFile, options);
        if (fixjs.length < 1) {
          grunt.log.warn('Destination not written because dest file was empty.');
        } else {

          // Write the destination file, and remove comments
          // before '#!/usr/bin/env node' as files are fixed.
          grunt.file.write(filename, fixjs.replace(re, '$2'));

          // Print a success message.
          grunt.log.ok('File "' + filename + '" fixed' + chalk.green('...OK'));
        }
      });
    });
  });

  var fixJavaScript = function(source, options) {
    try {
      return fixmyjs.fix(source, options);
    } catch (e) {
      grunt.log.error(e);
      grunt.fail.warn('JavaScript fixification failed.');
    }
  };
};