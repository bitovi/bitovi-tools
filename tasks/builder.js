var fs = require('fs');
var path = require('path');
var steal = require('steal');
var builder = steal.build.builder;

module.exports = function (grunt) {
    var _ = grunt.util._;

    function buildFiles(build, name, dest, dev, options, callback) {
        name = path.join(dest, name);

        build(_.omit(options, 'dev'), function (error, content, banner, steals) {
            var filename = name + '.js';
            console.log('Writing ' + filename);
            grunt.file.write(filename, banner + content);
            if (callback) {
                callback.apply(this, arguments);
            }
        });

        if (dev) {
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
            var src = f.src[0];

            builder({
                path: fs.realpathSync(src),
                steal: options.steal
            }, function (error, info, build) {
                var configurations = options.configurations || _.keys(info.configurations);
                var defaultConfiguration = configurations.shift();
                var builderOptions = {
                    url: options.url,
                    dev: options.dev,
                    pluginify: options.pluginify
                };
                var buildWithConfiguration = function (name, callback) {
                    if (info.configurations[name].hidden) {
                        return;
                    }

                    builderOptions.configuration = name;

                    buildFiles(build, (options.prefix || '') + name, f.dest, options.dev, builderOptions, callback);
                }

                // build core for other libraries
                configurations.forEach(function(name) {
                    buildWithConfiguration(name);
                });

                // Build the default configuration and all plugins (excluding the core Steals)
                buildWithConfiguration(defaultConfiguration, function (error, content, banner, steals) {
                    var plugins = _.filter(_.keys(options.builder.modules), function (mod) {
                        return options.builder.modules[mod]["type"] === "plugin" && !options.builder.modules[mod].hidden;
                    });

                    // Ignore the core steals
                    builderOptions.pluginify.ignore = steals.map(function (stl) {
                        return '' + stl.options.id;
                    });
                    builderOptions.pluginify.shim = _.extend({
                        "can/util/util.js": "window.can"
                    }, info.pluginify.shim);
                    builderOptions.pluginify.exports = {};

                    // Build all plugins
                    plugins.forEach(function (plugin) {
                        var name = options.builder.modules[plugin].name.toLowerCase();

                        builderOptions.ids = [plugin];
                        buildFiles(build, name, f.dest, false, builderOptions);
                    });
                });

                done();
            });
        });
    });
};
