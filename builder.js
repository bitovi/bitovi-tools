var _ = require("lodash");
var path = require('path');
var fs = require('fs');
var pluginify = require("steal-tools").pluginify;

var utilities = {
 
	/**
	 * @method getModulesOfType
	 *
	 * Get the modules of a specific type from a builder.json file's modules
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
	 * Load configurations and generate pluginify functions for each
	 *
	 * @method loadConfigurations
	 * @param {Object} info The info object
	 * @param {Function} callback
	 */
	loadConfigurations: function(info) {
		var configurations = info.configurations;
		var keys = _.keys(configurations);
		var modules = _.keys(info.modules);

		return new Promise(function(resolve, reject) {

			function pluginifier() {
				var name = keys.shift();
				if(!name) {
					// We have reached the end, call the callback with the configurations
					return resolve(configurations);
				}

				var configuration = configurations[name];
				var stealConfig = configuration.steal || {};
				var system = _.extend({}, info.system, stealConfig);

				var pluginifyOptions = configuration.pluginifyOptions || {};
				var options = _.extend({ quiet: true }, pluginifyOptions);

				pluginify(system, options).then(function(pluginify){
					// Attach the pluginify function to the configuration
					configuration.pluginify = pluginify;

					// Recurse, doing the next pluginify function
					pluginifier();
				});
			}

			pluginifier();

		});

	},

	/**
	 * Load plugins and generate pluginify functions for each
	 */
	loadPlugins: function(info){
		var modules = info.modules;
		var plugins = utilities.getModulesOfType(modules, "plugin");
		var keys = Object.keys(plugins);

		return new Promise(function(resolve, reject) {

			function pluginifier() {
				var name = keys.shift();
				if(!name) {
					return resolve(plugins);
				}

				var module = plugins[name];

				// If this module is hidden, skip it.
				if(module.hidden) {
					return pluginifier();
				}

				var parts = name.split("/");
				var moduleName = name + "/" + parts[parts.length - 1];

				var system = _.extend({}, info.system, {
					main: moduleName
				});
				var pluginifyOptions = info.pluginifyOptions || {};
				var options = _.extend({ quiet: true }, pluginifyOptions);

				pluginify(system, options).then(function(pluginify){
					module.pluginify = pluginify;

					pluginifier();
				});
			}

			pluginifier();

		});
	},

	loadLoadingModules: function(info) {
		var modules = info.modules;
		var loaders = utilities.getModulesOfType(modules, "loader");
		var keys = Object.keys(loaders);

		return new Promise(function(resolve, reject) {

			function pluginifier() {
				var name = keys.shift();
				if(!name) {
					return resolve(loaders);
				}

				var module = loaders[name];
				var parts = name.split("/");
				var moduleName = name.indexOf(".js") !== -1 ?
					name.substr(0, name.indexOf(".js")) :
					name + "/" + parts[parts.length - 1];

				var system = _.extend({}, info.system, {
					main: moduleName
				});
				var pluginifyOptions = info.pluginifyOptions || {};
				var options = _.extend({ quiet: true }, pluginifyOptions);

				pluginify(system, options).then(function(pluginify) {
					module.pluginify = pluginify;
					
					pluginifier();
				});
			}

			pluginifier();

		});
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
	}, builder, pkg, {
		system: options.steal,
		pluginifyOptions: options.pluginifyOptions
	});

	utilities.loadConfigurations(info)
		.then(function(configurations){
			//console.log("Loaded configurations.");

			return utilities.loadPlugins(info);
		})
		.then(function(plugins){
			//console.log("Loaded plugins.");

			return utilities.loadLoadingModules(info);
		})
		.then(function(){
			//console.log("Loaded domless.");

			callback(info);
		});
};

_.extend(builder, utilities);

module.exports = builder;
