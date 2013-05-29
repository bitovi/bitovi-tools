var docco = require('docco');

module.exports = function (grunt) {
	grunt.registerMultiTask('docco', 'Docco processor', function () {
		var _ = grunt.util._;
		var done = this.async();
		var src = [];

		if (_.isArray(this.data.src)) {
			this.data.src.forEach(function (srcString) {
				src = grunt.file.expand(srcString);
			})
		} else {
			grunt.file.expand(this.data.src);
		}

		var proc = docco.document(_.extend({
			args: src
		}, this.options()));

		proc.on('disconnect',function(){
			done();
		})

	});
}