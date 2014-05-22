var _ = require("lodash");
var path = require('path');
var fs = require('fs');
var makeGraph = require("steal-tools").graph.make;
var makeOrderedTranspiledMinifiedGraph = require("steal-tools").graph.makeOrderedTranspiledMinified;

var utilities = {
	/**
	 * @method getPlugins
	 *
	 * Get the plugins from a builder.json file's modules
	 *
	 * @param {Object} modules The modules
	 * @return {Object} Modules that are plugins.
	 */
	getPlugins: function(modules){
		var keys = Object.keys(modules);
		var plugins = {};

		keys.forEach(function(moduleName) {
			var module = modules[moduleName];
			if(module.type === "plugin") {
				plugins[moduleName] = module;
			}
		});

		return plugins;
	},

	/**
	 * Load the main file using default configuration options
	 *
	 * @method loadMain
	 * @param {Object} info The info object
	 * @param {Function} callback
	 */
	loadMain: function(info, callback){
		var make = info.transpile === false ? makeGraph : makeOrderedTranspiledMinifiedGraph;

		make(info.system).then(function(data){
			info.graph = data.graph;

			callback(info);
		});
	},


	/**
	 * Load plugins and generate pluginify functions for each
	 */
	loadPlugins: function(info, callback){
		var modules = info.modules;
		var plugins = utilities.getPlugins(modules);
		var keys = Object.keys(plugins);

		function grapher() {
			var name = keys.shift();
			if(!name) {
				return callback(plugins);
			}

			var module = plugins[name];

			// If this module is hidden, skip it.
			if(module.hidden) {
				return grapher();
			}

			var parts = name.split("/");
			var moduleName = name + "/" + parts[parts.length - 1];

			var system = _.extend({}, info.system, {
				main: moduleName
			});

			var make = info.transpile === false ? makeGraph : makeOrderedTranspiledMinifiedGraph;

			make(system)
			.then(function(data){
				module.graph = data.graph;

				grapher();
			});
		}

		grapher();
	},

	/**
	 * @method maybeGetInfo
	 *
	 * Get an options object, either `builder.json` or `package.json` or return
	 * false if it's not found.
	 *
	 * @param {Object} options The options object to get
	 * @param {String} name
	 * @param {String} file The file to load
	 */
	maybeGetInfo: function(options, name, file){
		var info = options[name];
		if(info) return info;

		var filePath = path.join(options.path, "/" + file);
		if(!fs.existsSync(filePath)) {
			return false;
		}

		// It exists, return the json.
		return require(filePath);
	}
}

/**
 * Load the download builder information which will contain:
 *
 * - `package.json`
 * - `builder.json`
 * - All Steal dependencies (and file contents) for every available download builder configuration
 *
 * This will be used throughout most of the download builder.
 * The callback data will be `undefined` if any of the JSON configuration files
 * isn't available.
 *
 * @param {String|Object} options The resource path or a more detailed configuration.
 * @param {Function} callback Callback with the information object
 * @returns {*}
 */
var builder = function (options, callback) {
	var settings = typeof options === 'string' ? { path: options } : options;
	var filePath = settings.path;

	var builder = utilities.maybeGetInfo(settings, "builder", "builder.json");
	var pkg = utilities.maybeGetInfo(settings, "pkg", "package.json");

	if (!builder || !pkg) {
		return callback(null, null);
	}

	var info = _.extend({
		path: filePath,
		configurations: {},
		configuration: options.configuration
	}, builder, pkg, {
		system: options.steal
	});

	utilities.loadMain(info, function(){
		console.log("Loaded base.");

		utilities.loadPlugins(info, function(plugins){
			console.log("Loaded plugins.");

			callback(info);
		});
	});
};

_.extend(builder, utilities);

module.exports = builder;
