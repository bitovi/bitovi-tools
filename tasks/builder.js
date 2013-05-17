var fs = require('fs');
var path = require('path');
var steal = require('steal');
var builder = steal.build.builder;

module.exports = function(grunt) {
	var _ = grunt.util._;

	grunt.registerMultiTask('builder', 'Pluginify using the download builder configuration', function() {
		var done = this.async();
		var options = this.options();
		this.files.forEach(function(f) {
			grunt.file.mkdir(f.dest);
			f.src.forEach(function(src) {
				builder({
					path: fs.realpathSync(src),
					steal: options.steal,
				}, function(error, info, build) {
					var configurations = options.configurations || _.keys(info.configurations);
					configurations.forEach(function(name) {
						var builderOptions = {
							configuration: name,
							url: options.url,
							pluginify: options.pluginify
						};
						build(builderOptions, function(error, content) {
							var filename = path.join(f.dest, (options.prefix || '') + name + '.js');
							console.log('Writing ' + filename);
							grunt.file.write(filename, content);
							done();
						});
					});
				});
			});
		});
	});
};
