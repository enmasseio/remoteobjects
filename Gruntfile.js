module.exports = function(grunt) {

  // load plugins
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-mocha-test');

  // configuration
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    browserify: {
      options: {
        standalone: 'remoteobjects'
      },
      dist: {
        files: {
          './dist/<%= pkg.name %>.js': ['./index.js']
        }
      }
    },

    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
      },
      build: {
        src:  './dist/<%= pkg.name %>.js',
        dest: './dist/<%= pkg.name %>.min.js'
      }
    },

    watch: {
      scripts: {
        files: ['lib/**/*.js'],
        tasks: ['minify'],
        options: {
          spawn: false
        }
      }
    },

    mochaTest: {
      test: {
        options: {
          reporter: 'spec'
        },
        src: ['test/**/*.js']
      }
    }
  });

  // tasks
  grunt.registerTask('default', ['build', 'minify', 'test']);
  grunt.registerTask('build',   ['browserify']);
  grunt.registerTask('minify',  ['build', 'uglify']);
  grunt.registerTask('test',    ['mochaTest']);
};
