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
			var configurations = info.configurations;
			var plugins = grapher.getPlugins(info.modules);

			_.each(configurations, saveFile);
			_.each(plugins, saveFile);

			console.log("Files wrote.");

			done();
		});

		var saved = {};
		function saveFile(item, name) {
			try {
				if(saved[name]) return;
				saved[name] = true;

				debugger;

				// Save this file out to the proper location
				var source = item.load && item.load.source;
				if(source) {
					var filename = path.join(dist, name + ".js");

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
