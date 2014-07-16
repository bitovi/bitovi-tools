var pluginifier = require("steal-tools").pluginify;
var fs = require('fs');
var path = require('path');

module.exports = function(grunt) {
	var _ = grunt.util._;

	grunt.registerMultiTask('pluginifyTests', 'Pluginify tests for builder.json modules', function() {
		debugger;

		var done = this.async();
		var options = this.options();
		var dest = options.to;
		var modules = {};
		_.each(options.builder.modules, function(module, name) {
			if(module.type !== "loader") {
				modules[name] = module;
			}
		});
		var testsToPluginify = _.map(modules, function(module, key) {
			return key + "/" + key.split('/').pop() + '_test'
		});

		grunt.verbose.writeln("Pluginifying tests");
		grunt.verbose.writeln(testsToPluginify);

		function next() {
			var moduleName = testsToPluginify.shift();
			if(!moduleName) {
				done();
				return;
			}

			var system = _.extend({}, options.steal, {
				main: moduleName
			});
			var pOptions = { quiet: true };

			pluginifier(system, pOptions).then(function(pluginify) {
				// TODO Write out this pluginfied file.

				grunt.verbose.writeln("Finished", moduleName);
				next();
			});
		}

		next();
	});
}
