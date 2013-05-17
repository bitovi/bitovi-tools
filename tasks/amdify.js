var amdify = require('steal').build.amdify;
var path = require('path');

module.exports = function(grunt) {
	var _ = grunt.util._;

	grunt.registerMultiTask('amdify', 'Convert Steal to AMD modules', function() {
		var done = this.async();
		var options = this.options();
		this.files.forEach(function(current) {
			amdify(current.src, options, function(error, data) {
				_.each(data, function(content, name) {
					var fullName = path.join(current.dest, name) + '.js';
					grunt.file.mkdir(path.dirname(fullName));
					grunt.file.write(fullName, content);
					grunt.verbose.writeln('Writing ' + fullName);
				});
				done();
			});
		});
	});
}
