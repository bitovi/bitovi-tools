var _ = require("lodash");
var path = require('path');
var fs = require('fs');
var makeGraph = require("steal-tools").graph.make;
var makeOrderedTranspiledMinifiedGraph = require("steal-tools").graph.makeOrderedTranspiledMinified;

var utilities = {
	/**
	 * @method getModulesOfType
	 *
	 * Get the modules of a specific type from a builder.json file's modules.
	 * The type could be 'core', 'plugin', or 'loader'.
	 *
	 * @param {Object} modules The modules
	 * @param {String} type The type (plugin, loader, etc.)
	 * @return {Object} Modules that are plugins.
	 */
	getModulesOfType: function(modules, type){
		var keys = Object.keys(modules);
		var out = {};

		keys.forEach(function(moduleName) {
			var module = modules[moduleName];
			if(module.type === type) {
				out[moduleName] = module;
			}
		});

		return out;
	},


	/**
	 * @method getPlugins
	 *
	 * Get the module object from builder.json for plugins.
	 *
	 * @param {Object} modules The full modules object containing everything in
	 * core and all plugins.
	 * @return {Object} Modules that are plugins.
	 */
	getPlugins: function(modules){
		return utilities.getModulesOfType(modules, "plugin");
	},

	/**
	 * Load the main file using default configuration options. For CanJS this will
	 * load all of core by loading can/can.
	 *
	 * @method loadMain
	 * @param {Object} info The info object
	 * @param {Function} callback
	 */
	loadMain: function(info, callback){
	// Stealify will use makeGraph and amdify will use makeOrderedTranspiledMinifiedGraph.
		var make = info.transpile === false ? makeGraph : makeOrderedTranspiledMinifiedGraph;
		var options = {};
		if(info.transpile !== false) {
			options = {
				useNormalizedDependencies: true,
				normalize: function(name){
					var parts = name.split("/");
					if(parts.length > 2) {
						parts.splice(parts.length-2,1);
					}
					return parts.join("/");
				}
			};
		}

		make(info.system, options).then(function(data){
			info.graph = data.graph;

			callback(info);
		});
	},


	/**
	 * @method loadPlugins
	 *
	 * Individually loads all of the plugins in order to get their graph.
	 */
	loadPlugins: function(info, callback){
		// Modules is an object containing all possible modules from builder.json
		var modules = info.modules;
		var plugins = utilities.getPlugins(modules);

		// This is an array of all of the plugin moduleNames. We'll go through these
		// one by one and obtain their graphs.
		var keys = Object.keys(plugins);

		// This is a function to retrieve the graph for a single plugin. This is
		// done one at a time because attempting to get the graph for multiple
		// modules simultaneously will cause errors.
		function grapher() {
			// If 
			if(!keys.length) {
				return callback(plugins);
			}

			// Get the next moduleName
			var name = keys.shift();

			// This is the module object from the builder.json file
			var module = plugins[name];

			// If this module is hidden, skip it.
			if(module.hidden) {
				return grapher();
			}

			// This converts steal moduleName's to their fully normalized versions
			// ie: can/view is actually can/view/view.
			// TODO Somehow expose System.normalize from steal-tools so this can be
			// done properly.
			var parts = name.split("/");
			var moduleName = name + "/" + parts[parts.length - 1];

			// info.system will contain some system options, such as `config` and
			// `baseURL` that we want to pass into our make function, this just
			// overrides the `main` module.
			var system = _.extend({}, info.system, {
				main: moduleName
			});

			var make = info.transpile === false ? makeGraph : makeOrderedTranspiledMinifiedGraph;
			var options = {};
			if(info.transpile !== false) {
				options = {
					useNormalizedDependencies: true,
					normalize: function(name){
						var parts = name.split("/");
						if(parts.length > 2) {
							parts.splice(parts.length-2,1);
						}
						return parts.join("/");
					}
				};
			}

			make(system, options)
			.then(function(data){
				module.graph = data.graph;

				// Recurse to get the next plugin module.
				grapher();
			});
		}

		grapher();
	},

	/**
	 * @method loadLoaders
	 *
	 * This is a dirty hack to load all modules of the "loader" type. This
	 * includes can/util/domless and can/stache/system.js. Probably a better solution
	 * would be to have a single plugin called "steal template plugins" that
	 * includes can/util/domless and the ejs, mustache and stache system.js modules.
	 */
	loadLoaders: function(info, callback){
		var modules = info.modules;
		var loaders = utilities.getModulesOfType(modules, "loader");
		var keys = Object.keys(loaders);

		function grapher() {
			var name = keys.shift();
			if(!name) {
				return callback(loaders);
			}

			var module = loaders[name];

			// If this module is hidden, skip it.
			if(module.hidden) {
				return grapher();
			}

			// This normalizes module names to their fully normalized form. For example
			// can/view becomes can/view/view.	If the name already ends with .js then
			// just return everything but the .js.
			var parts = name.split("/");
			var moduleName = name.indexOf(".js") !== -1 ?
				name.substr(0, name.indexOf(".js")) :
				name + "/" + parts[parts.length - 1];


			var system = _.extend({}, info.system, {
				main: moduleName
			});

			var make = info.transpile === false ? makeGraph : makeOrderedTranspiledMinifiedGraph;
			var options = {};
			if(info.transpile !== false) {
				options = {
					useNormalizedDependencies: true,
					normalize: function(name){
						var parts = name.split("/");
						if(parts.length > 2) {
							parts.splice(parts.length-2,1);
						}
						return parts.join("/");
					}
				};
			}
			make(system, options)
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
	 * false if it's not found. The object might either be on the main `option` object itself or should be retrieved from the filesystem.
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
};

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
	// The settings file can either be an object or a path to the folder containing
	// the options (such as builder.json and package.json).
	var settings = typeof options === 'string' ? { path: options } : options;
	var filePath = settings.path;

	var builder = utilities.maybeGetInfo(settings, "builder", "builder.json");
	var pkg = utilities.maybeGetInfo(settings, "pkg", "package.json");

	if (!builder || !pkg) {
		return callback(null, null);
	}

	// This combines the package.json, builder.json, and Gruntfile options object
	// into one massive object containing the configurations to build, the modules
	// to build for each configuration, and a `system` object on each configuration
	// containing the paths for that configuration (and other system options). All
	// of this can be seen from the builder.json file.
	var info = _.extend({
		path: filePath,
		configurations: {},
		configuration: options.configuration
	}, builder, pkg, {
		system: options.steal
	});

	// loadMain, loadPlugins, and loadLoaders all do the same thing essentially.
	// They get the graph for a set of modules and attach the graph back onto
	// the module (or configuration in the case of configurations).

	// Load the "main" module, such as can/can. This will get the core graph.
	utilities.loadMain(info, function(){

		// Load the individual plugin modules to get their graph.
		utilities.loadPlugins(info, function(plugins){

			// This loads loader plugins, such as can/util/domless and can/stache/system.js. This should probably be removed in favor of a proper plugin that loads all of the above. This only exists now to prevent these modules from appearing on the website's custom download builder.
			utilities.loadLoaders(info, function() {

				// Once you've loaded the sets of modules all are attached back onto
				// the `info` object and can be passed back to the grunt task itself.
				callback(info);
			});
		});
	});
};

_.extend(builder, utilities);

module.exports = builder;
