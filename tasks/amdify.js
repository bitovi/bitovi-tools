var fs = require("fs");
var path = require('path');
var grapher = require("../grapher");

module.exports = function(grunt) {
	var _ = grunt.util._;
	
	grunt.registerMultiTask("amdify", "Convert Steal to AMD modules", function() {
		var done = this.async();
		var options = this.options();
		// This is the destination folder
		var dist = this.files[0].dest;

		// Grapher is a utility used by amdify and stealify to obtain the graph. Given
		// the Gruntfile options it will know which modules to load the graph for and
		// return an `info` object which is essentially the builder.json file with
		// graphs attached for each configuration and module.
		grapher(options, function(info){
			// This is the core graph, ie the graph for can/can
			var core = { graph: info.graph };

			// This is an object for each plugin module. Each plugin module will have a
			// .graph property with it's own graph.
			var plugins = grapher.getPlugins(info.modules);

			// Save out the core graph to files.
			saveFile(core);

			// Loop through each plugin and save it out to a file as well.
			_.each(plugins, saveFile);

			console.log("Files written successfully.");

			done();
		});

		// This is a cache of files that have already been saved to prevent writing
		// the same file out multiple times unnessarily. This would happen if, for example
		// a plugin had a module that's part of core in its graph.
		var saved = {
			"jquery": true,
			"steal/dev/dev": true,
			"stealconfig": true
		};

		// Saves an item (an item could be a configuration or a module) out to files.
		// If the name is also provided we'll cache that to prevent it from being written
		// out multiple times.
		function saveFile(item, name) {
			if(saved[name]) return;
			saved[name] = true;

			// Save this file out to the proper location.
			var source = item.transpiledSource;
			if(source) {
				// This takes an AMD module name, for example can/view and turns it into
				// the full path to save to, like can/view.js.
				var parts = name.split("/");
				var file = parts[parts.length - 1] + ".js";
				var folder = path.dirname(path.dirname(name));
				var filename = path.join(dist, folder, file);

				grunt.verbose.writeln('Writing ' + filename);
				grunt.file.write(filename, source);
			}

			// Loop through each module in the graph and save it's contents out
			// to the destination directory.
			var graph = item.graph;
			if(graph) {
				_.each(graph, saveFile);
			}
		}
	});
}
