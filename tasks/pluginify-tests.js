var pluginify = require('steal').build.pluginify;
var fs = require('fs');
var path = require('path');

module.exports = function(grunt) {
    var _ = grunt.util._;

    grunt.registerMultiTask('pluginifyTests', 'Pluginify tests for builder.json modules', function() {
        var done = this.async();
        var options = this.options();
        var dest = options.to;
        var testsToPluginify = _.map(options.builder.modules, function(module, key) {
            return key + "/" + key.split('/').pop() + '_test.js'
        });

        grunt.verbose.writeln(testsToPluginify);

        pluginify(testsToPluginify, {
            ignore: [/^((?!test\.js).)*$/],
            steal: options.steal,
            shim: options.shim
        }, function(error, content) {
            grunt.log.writeln('Writing pluginified tests to ' + dest);
            grunt.file.write(dest, content);
            done();
        });
    });
}
