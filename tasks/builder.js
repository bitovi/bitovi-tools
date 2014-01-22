var fs = require('fs');
var path = require('path');
var steal = require('steal');
var builder = steal.build.builder;

module.exports = function (grunt) {
	var _ = grunt.util._;

    function buildFiles(build, name, dest, dev, options) {
        name = path.join(dest, name);

        build(_.omit(options, 'dev'), function (error, content, banner) {
            var filename = name + '.js';
            console.log('Writing ' + filename);
            grunt.file.write(filename, banner + content);
        });

        if(dev) {
            build(options, function (error, content, banner) {
                var filename = name + '.dev.js';
                console.log('Writing ' + filename);
                grunt.file.write(filename, banner + content);
            });
        }
    }

	grunt.registerMultiTask('builder', 'Pluginify using the download builder configuration', function () {
		var done = this.async();
		var options = this.options();
		this.files.forEach(function (f) {
			grunt.file.mkdir(f.dest);
			var plugins = _.filter(_.keys(options.builder.modules), function (mod) {
				return options.builder.modules[mod]["type"] === "plugin" && !options.builder.modules[mod].hidden;
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
                        if(info.configurations[name].hidden) {
                            return;
                        }

						builderOptions.configuration = name;
						delete builderOptions.plugin;

                        buildFiles(build, (options.prefix || '') + name, f.dest, options.dev, builderOptions);

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

                                buildFiles(build, options.builder.modules[plugin].name.toLowerCase(), f.dest, false, builderOptions);
							}

						});

					});
					done();

				});
			});
		});
	});
};
