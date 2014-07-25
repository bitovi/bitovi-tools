var pluginifier = require("steal-tools").pluginify;
var fs = require('fs');
var path = require('path');

module.exports = function(grunt) {
	var _ = grunt.util._;

	grunt.registerMultiTask('pluginifyTests', 'Pluginify tests for builder.json modules', function() {
		var done = this.async();
		var options = this.options();
		var dest = options.to;


		var system = _.extend({}, options.steal, {
			main: 'test/all-tests'
		});
		var pOptions = { quiet: true };

		pluginifier(system, pOptions).then(function(pluginify) {
			var graph = pluginify.graph;

			var content = pluginify(null, {
				// Ignore everything that doesn't end with _test
				ignore: /^(?:.{0,3}|.*(?!test).{4})$/
			});

			grunt.log.writeln('Writing pluginified tests to ' + dest);
			grunt.file.write(dest, content);

			done();
		});
	});
}
