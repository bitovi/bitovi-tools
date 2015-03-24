var fs = require("fs");
var path = require('path');
var grapher = require("../grapher");

module.exports = function(grunt) {
	var _ = grunt.util._;

	grunt.registerMultiTask("stealify", "Extract a clean list of Steal dependencies.", function() {
		var done = this.async();
		var options = this.options();
		var file = this.files[0];
		var dist = file.dest;
		options.transpile = false;

		grapher(options, function(info){
			var base = { graph: info.graph };
			var plugins = grapher.getPlugins(info.modules);
			var loaders = grapher.getModulesOfType(info.modules, "loader");

			saveFile(base);
			_.each(plugins, saveFile);
			_.each(loaders, saveFile);

			console.log("Files wrote.");

			done();
		});

		var saved = {
			"jquery": true,
			"steal/dev/dev": true,
			"stealconfig": true
		};
		function saveFile(item, name) {
			try {
				if(saved[name]) return;
				saved[name] = true;

				// Save this file out to the proper location
				var source = item.load && item.load.source;
				if(source) {
					var outname = name.replace(/^can/, "canjs/"); 
					var filename = path.join(dist, outname + ".js");

					grunt.verbose.writeln('Writing ' + filename);
					grunt.file.write(filename, source);
				}

				var graph = item.graph;
				if(graph) {
					_.each(graph, saveFile);
				}
			} catch(err) {
				console.log("ERR:", err);
			}
		}
	});
}
