var stealify = require('steal').build.stealify;
var path = require('path');

module.exports = function(grunt) {
	var _ = grunt.util._;

	grunt.registerMultiTask('stealify', 'Extract a clean list of Steal dependencies.', function() {
		var done = this.async();
		var options = this.options();
		var dest = this.files[0].dest;

		stealify(options.ids, options, function(error, data) {
			_.each(data, function(content, name) {
				var fullName = path.join(dest, name) + '.js';
				var banner = options.banner || '';
				grunt.file.mkdir(path.dirname(fullName));
				grunt.file.write(fullName, banner + content);
				grunt.verbose.writeln('Writing ' + fullName);
			});
			done();
		});
	});
}
