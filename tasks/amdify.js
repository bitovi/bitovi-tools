var fs = require("fs");
var path = require('path');
var grapher = require("../grapher");

module.exports = function(grunt) {
	var _ = grunt.util._;

	grunt.registerMultiTask("amdify", "Convert Steal to AMD modules", function() {
		var done = this.async();
		var options = this.options();
		var file = this.files[0];
		var dist = file.dest;

		grapher(options, function(info){
			var base = { graph: info.graph };
			var plugins = grapher.getPlugins(info.modules);

			saveFile(base);
			_.each(plugins, saveFile);

			console.log("Files wrote.");

			done();
		});

		var saved = {
			"jquery": true,
			"steal/dev/dev": true,
			"stealconfig": true
		};
		// Save out a file
		function saveFile(item, name) {
			if(saved[name]) return;
			saved[name] = true;

			// Save this file out to the proper location
			var source = item.transpiledSource;
			if(source) {
				var parts = name.split("/");
				var file = parts[parts.length - 1] + ".js";
				var folder = path.dirname(path.dirname(name));
				var filename = path.join(dist, folder, file);

				grunt.verbose.writeln('Writing ' + filename);
				grunt.file.write(filename, source);
			}

			var graph = item.graph;
			if(graph) {
				_.each(graph, saveFile);
			}
		}
	});
}
