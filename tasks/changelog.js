var https = require('https');
var querystring = require('querystring');
var ejs = require('ejs');
var request = require('request');
var githubApi = 'https://api.github.com';
var headers = {
  'User-Agent': 'Bitovi Tools'
};

function getIssues(options, callback) {
  var params = querystring.stringify({
    milestone: options.milestone,
    state: 'closed',
    per_page: 100
  });
  var path = '/repos/' + options.user + '/' + options.repo + '/issues?' + params;

  request({
    url: githubApi + path,
    json: true,
    headers: headers
  }, function(error, data) {
    callback(error, data.body);
  });
}

function getMilestone(options, callback) {
  var params = querystring.stringify({
    state: 'closed',
    sort: 'due_date',
    direction: 'desc'
  });
  var path = '/repos/' + options.user + '/' + options.repo + '/milestones?' + params;

  request({
    url: githubApi + path,
    json: true,
    headers: headers
  }, function(error, data) {
    if(data.body && data.body[0] && data.body[0]) {
      return callback(error, data.body[0]);
    }

    callback(new Error('No milestone number found'));
  });
}

module.exports = function(grunt) {
  grunt.registerTask('changelog', 'Updates changelog.md based on GitHub milestones', function() {
    var done = this.async();
    var options = this.options();

    getMilestone(options, function(error, milestone) {
      grunt.log.writeln('Reading issues for milestone ' + milestone.title + ' (#' + milestone.number + ')');
      options.milestone = milestone.number;
      getIssues(options, function(error, issues) {
        if (grunt.file.exists('changelog.md')) {
          log = grunt.file.read('changelog.md');
        }

        ejs.renderFile(__dirname + '/../resources/changelog.ejs', {
          milestone: milestone,
          date: new Date(Date.now()),
          issues: issues
        }, function(e, template) {
          if (e) {
            return done(e);
          }

          if(log.indexOf(template) !== -1) {
            grunt.log.error('Changelog entry already exists.');
          } else {
            grunt.file.write('changelog.md', log.replace('-->', '-->\n' + template));
          }

          done();
        });
      });
    });
  });
}
