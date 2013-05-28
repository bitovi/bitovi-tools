var fs = require('fs');
var path = require('path');
var steal = require('steal');
var builder = steal.build.builder;

module.exports = function (grunt) {
	var _ = grunt.util._;
	grunt.registerMultiTask('builder', 'Pluginify using the download builder configuration', function () {
		var done = this.async();
		var options = this.options();
		this.files.forEach(function (f) {
			grunt.file.mkdir(f.dest);
			var plugins = _.filter(_.keys(options.builder.modules), function (mod) {
				return options.builder.modules[mod]["type"] === "plugin";
			});

			f.src.forEach(function (src) {
				builder({
					path: fs.realpathSync(src),
					steal: options.steal
				}, function (error, info, build) {

					var configurations = options.configurations || _.keys(info.configurations);

					var builderOptions = {
						generatedPlugins: {},
						url: options.url,
						pluginify: options.pluginify,
						plugins: plugins
					};

					//build core distributable
					configurations.forEach(function (name) {

						builderOptions.configuration = name;
						delete builderOptions.plugin;

						build(builderOptions, function (error, content, banner) {
							var filename = path.join(f.dest, (options.prefix || '') + name + '.js');
							console.log('Writing ' + filename);
							grunt.file.write(filename, banner + content);
						});

						plugins.forEach(function (plugin) {
							var pluginConfigs = options.builder.modules[plugin].configurations;
							builderOptions.plugin = plugin;

							if (!builderOptions.generatedPlugins[plugin]) {


								if (pluginConfigs) {
									if (pluginConfigs.indexOf(name) === -1) {
										return false;
									}
								}

								builderOptions.generatedPlugins[plugin] = true;

								build(builderOptions, function (error, content, banner) {
									var filename = path.join(f.dest, options.builder.modules[plugin].name.toLowerCase() + '.js');
									console.log('Writing ' + filename);
									grunt.file.write(filename, banner + content);
								});
							}

						});

					});
					done();

				});
			});
		});
	});
};
