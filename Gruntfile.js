module.exports = function(grunt) {
	grunt.loadTasks('./tasks');

	grunt.initConfig({
		amdify: {
			options: {
				steal: {
					map: {
						'*': {
							'can/': 'canjs/'
						}
					}
				},
				map: {
					'canjs/': 'can/',
					'can/util': 'can/util/library'
				}
			},
			all: {
				files: {
					'dist/amd/': ['canjs/can.js']
				}
			}
		},
		builder: {
			options: {
				url: 'http://canjs.com',
				pluginify: {
					ignore: [ /\/lib\//, /util\/dojo-(.*?).js/ ]
				},
				steal: {
					map: {
						'*': {
							'can/': 'canjs/'
						}
					}
				}
			},
			core: {
				options: {
					prefix: 'can.'
				},
				files: {
					'dist/': 'canjs/'
				}
			}
		}
	})
}
