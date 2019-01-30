(function() {
  module.exports = function(grunt) {  // eslint-disable-line no-undef
    var fs = require('fs'),
        TPL_NAME = 'tpl';

    /*
     * Tasks:
     *  - grunt             Create the production build
     *  - grunt dev         Run the app from source
     *  - grunt server      Run a webserver on 8080
     */

    require('load-grunt-tasks')(grunt);

    grunt.initConfig({
      pkg: grunt.file.readJSON('package.json'),

      clean: {
        build: ['build/'],
        deploy: ['deploy/*'],
        jsapioptim: [
          'deploy/build-api-viewer.tmp',
          'deploy/build-api-builder.tmp',
          'deploy/build-api-print.tmp',
          'jsapi-optim-modules-viewer.txt',
          'jsapi-optim-modules-print.txt',
          'jsapi-optim-modules-builder.txt'
        ],
        fonts: [
          'deploy/resources/fonts/glyphicons-*.*',
          'deploy/resources/fonts/OpenSans-*.*',
          'deploy/resources/tpl/viewer/fonts'
        ]
      },

      mkdir: {
        all: {
          options: {
            create: ['deploy/app', 'build']
          }
        }
      },

      // At build time lib-build/lessc is not used, the node package is used
      // Can't seem to use less v2 at build time but ok during development
      requirejs: {
        options: {
          baseUrl: 'src/app/',
          paths: {
            /* Ignore modules of the following packages */
            dojo: 'empty:',
            esri: 'empty:',
            esri4: 'empty:',
            dijit: 'empty:',
            dojox: 'empty:',
            dgrid: 'empty:', // Used by SelectMapWidget
            'put-selector': 'empty:', // Used by SelectMapWidget

            lib: '../lib/',

            /* React */
            'storymaps-react': '../../build/app/storymaps/',
            'issue-checker': '../../build/app/storymaps/issue-checker',
            react: '../lib/react/react.min',
            'react-dom': '../lib/react/react-dom.min',
            redux: '../lib/redux/index',
            'react-redux': '../lib/react-redux/index',
            'react-bootstrap': '../lib/react-bootstrap/react-bootstrap.min',

            /* Build chain dependencies */
            'lib-build': '../lib-build/',

            /* Inlining of .html */
            text: '../lib-build/text',
            underscore: '../lib-build/lodash',
            Handlebars: '../lib-build/hbs/handlebars',

            /* Localization */
            i18n: '../lib-build/i18n',
            resources: '../resources'
          },
          stubModules: [
            'text',
            'lib-build/tpl'
          ],
          exclude: [
            'underscore',
            'lib-build/normalize',
            'lib-build/i18n'
          ],
          inlineText: true,
          separateCSS: true,
          siteRoot: '../../src/app/storymaps/',
          preserveLicenseComments: false,

          removeCombined: true,
          onBuildWrite: function(moduleName, path, content) {
            // replace handlebars with the runtime version
            if (moduleName === 'Handlebars') {
              path = path.replace('handlebars.js','handlebars.runtime.js');
              content = fs.readFileSync(path).toString();
              content = content.replace(/(define\()(function)/, '$1"handlebars", $2');
            }
            return content;
          }

          // ckeditor doesn't build with uglify2
          //optimize: 'uglify2'
        },
        builder: {
          options: {
            name: 'storymaps/' + TPL_NAME + '/BuildConfigBuilder',
            out: 'deploy/app/builder-min.js',
            onModuleBundleComplete: function(data) {
              var modules = data.included.filter(function(value) {
                return ! value.match(/lib-/);
              });

              fs.writeFile('deploy/build-api-builder.tmp', modules.join('\n'), function(err) {
                if (err) {
                  console.log(err);
                }
              });
            }
          }
        },
        viewer: {
          options: {
            name: 'storymaps/' + TPL_NAME + '/BuildConfigViewer',
            out: 'deploy/app/viewer-min.js',
            onModuleBundleComplete: function(data) {
              var modules = data.included.filter(function(value) {
                return ! value.match(/lib-/);
              });

              fs.writeFile('deploy/build-api-viewer.tmp', modules.join('\n'), function(err) {
                if (err) {
                  console.log(err);
                }
              });
            }
          }
        },
        print: {
          options: {
            name: 'storymaps/' + TPL_NAME + '/BuildConfigPrint',
            out: 'deploy/app/print-min.js',
            onModuleBundleComplete: function(data) {
              var modules = data.included.filter(function(value) {
                return ! value.match(/lib-/);
              });

              fs.writeFile('deploy/build-api-print.tmp', modules.join('\n'), function(err) {
                if (err) {
                  console.log(err);
                }
              });
            }
          }
        }
      },

      concat: {
        options: {
          stripBanners: true,
          banner: '/*! <%= pkg.name %> - v<%= pkg.version %> - '
              + '<%= grunt.template.today("yyyy-mm-dd, hh:MM:ss TT") %> - '
              + 'Copyright \u00A9 2016-2018 Esri \n'
              + 'This application is released under the Apache License V2.0 by Esri http://www.esri.com/ - '
              + 'https://github.com/Esri/story-map-cascade */'
        },
        viewerJS: {
          src: ['deploy/app/viewer-min.js'],
          dest: 'deploy/app/viewer-min.js'
        },
        builderJS: {
          src: ['deploy/app/builder-min.js'],
          dest: 'deploy/app/builder-min.js'
        },
        printJS: {
          src: ['deploy/app/print-min.js'],
          dest: 'deploy/app/print-min.js'
        }
      },

      execute: {
        viewer: {
          src: ['src/lib-build/js-api-optimizer.js'],
          options: {
            // execute node with additional arguments
            args: ['deploy/build-api-viewer.tmp', 'jsapi-optim-modules-viewer.txt']
          }
        },
        builder: {
          src: ['src/lib-build/js-api-optimizer.js'],
          options: {
            // execute node with additional arguments
            args: ['deploy/build-api-builder.tmp', 'jsapi-optim-modules-builder.txt']
          }
        },
        print: {
          src: ['src/lib-build/js-api-optimizer.js'],
          options: {
            // execute node with additional arguments
            args: ['deploy/build-api-print.tmp', 'jsapi-optim-modules-print.txt']
          }
        }
      },

      copy: {
        html: {
          files: [{
            expand: true,
            cwd: 'src',
            src: ['*.html'],
            dest: 'deploy/'
          }]
        },
        resources: {
          files: [{
            expand: true,
            cwd: 'src',
            src: ['resources/**'],
            dest: 'deploy/'
          }]
        },
        commonResources4react: {
          files: [{
            expand: true,
            cwd: 'src/resources/',
            src: ['**'],
            dest: 'build/resources/'
          }]
        },
        config: {
          files: [{
            expand: true,
            cwd: 'src',
            src: ['app/config.js'],
            dest: 'deploy/'
          }]
        },
        main: {
          files: [{
            expand: true,
            cwd: 'src',
            src: ['app/main-app.js', 'app/main-config.js', 'app/custom-scripts.js'],
            dest: 'deploy/'
          }]
        },
        readme: {
          files: [{
            expand: true,
            src: ['Readme.pdf', 'Readme.txt'],
            dest: 'deploy/'
          }]
        },
        libsResources: {
          files: [
            {
              expand: true,
              cwd: 'src/lib/font-awesome/fonts/',
              src: ['**'],
              dest: 'deploy/resources/lib/font-awesome/fonts/'
            }
          ]
        },
        jsapioptim: {
          files: [{
            src: ['jsapi-optim-modules-viewer.txt', 'jsapi-optim-modules-builder.txt', 'jsapi-optim-modules-print.txt'],
            dest: 'deploy/'
          }]
        },
        'less-in-react': {
          files: [{
            expand: true,
            cwd: 'src/app/storymaps/',
            src: ['**/*.less', '**/*.css'], // TODO: CSS shouldn't be needed
            dest: 'build/app/storymaps/'
          }]
        },
        'hbs-in-react': {
          files: [{
            expand: true,
            cwd: 'src/app/storymaps/',
            src: ['**/*.hbs'],
            dest: 'build/app/storymaps/'
          }]
        },
        /*
         * Calcite as an issue with it's open theme where the fonts are not loaded
         *  from the proper directory, the first rule fix it the ugly way
         *  https://github.com/Esri/calcite-bootstrap/issues/251
         * The second rules override some of these files from another folder that
         *  contains thw woff2 version
         * The third rule copy bootstrap default icon that are not included in calcite
         *  https://github.com/Esri/calcite-bootstrap/issues/250
         * The fourth rule is used when building the app to have the fonts in a resource folder
         * The build also require a regex-replace rule, see the last one
         * And there is an optional clean rule for the source font in _resources/common
         *
         * TODO This allow for no font duplication but should be reviewed
         */
        fonts: {
          files: [{
            expand: true,
            cwd: 'src/lib/calcite-bootstrap/fonts/',
            src: ['OpenSans-*.*'],
            dest: 'src/lib/calcite-bootstrap/css/fonts/'
          }]
        },
        fonts2: {
          files: [{
            expand: true,
            cwd: 'src/resources/fonts/',
            src: ['OpenSans-*.*'],
            dest: 'src/lib/calcite-bootstrap/css/fonts/'
          }]
        },
        fonts3: {
          files: [{
            expand: true,
            cwd: 'src/resources/fonts/',
            src: ['glyphicons-*.*'],
            dest: 'src/lib/calcite-bootstrap/css/fonts/'
          }]
        },
        fonts4: {
          files: [{
            expand: true,
            cwd: 'src/lib/calcite-bootstrap/css/fonts/',
            src: ['*.*'],
            dest: 'deploy/resources/lib/calcite-bootstrap/fonts/'
          }]
        },
        youtube: {
          files: [{
            expand: true,
            cwd: 'src/lib/youtube-api/',
            src: ['index'],
            dest: 'src/lib/youtube-api/',
            rename: function(dest, src) {
              return dest + src + '.js';
            }
          }]
        },
        'calcite-vars': {
          options: {
            process: function(content) {
              return content.replace(/\$/g, '@') // change sass $ vars to less @ vars
                      .replace(/ !default/g, '') // get rid of sass !default
                      .replace(/Calcite-Highlight-Blue-350/, 'Calcite_Highlight_Blue_350') // fix calcite vars
                      .replace(/Calcite_Highlight-Blue/, 'Calcite_Highlight_Blue') // more calcite :(
                      // replace fade-in or fade_in(color, 0-1) with fade(color, 0-100%)
                      .replace(/(fade-in\(|fade_in\().+?\.[0-9]+\s*\)/g, function(fadeStr) {
                        // find the 0-1 decimal at the end of the fade_in function
                        var decimal = fadeStr.slice(fadeStr.lastIndexOf('.'), fadeStr.lastIndexOf(')'));
                        var percent = Math.round(parseFloat(decimal) * 100) + '%';
                        return 'fadein' + fadeStr.slice(fadeStr.indexOf('('), fadeStr.indexOf(',') + 1) + ' ' + percent + ')';
                      })
                      // replace rgba(#hex, 0-1) with fade(#hex, 0-100%)
                      .replace(/rgba\(#(?:[0-9a-fA-F]{3}){1,2},\s*0*\.[0-9]+\s*\)/g, function(rgbaStr) {
                        var decimal = rgbaStr.slice(rgbaStr.lastIndexOf('.'), rgbaStr.lastIndexOf(')'));
                        var percent = Math.round(parseFloat(decimal) * 100) + '%';
                        return 'fade' + rgbaStr.slice(rgbaStr.indexOf('('), rgbaStr.indexOf(',') + 1) + ' ' + percent + ')';
                      });
            }
          },
          files: [{
            expand: true,
            cwd: 'src/lib/calcite-bootstrap/sass/calcite/',
            src: [
              '_variables.scss',
              '_colors-default.scss'
            ],
            dest: 'src/resources/styles/calcite/',
            rename: function(dest, src) {
              var fileName = src.slice(src.lastIndexOf('/') + 1, src.lastIndexOf('.'));
              if (fileName.charAt(0) === '_') {
                fileName = fileName.slice(1);
              }
              return dest + fileName + '.less';
            }
          }]
        }
      },

      'regex-replace': {
        css: {
          src: ['deploy/app/*.css'],
          actions: [
            {
              name: 'Project images path',
              search: '../../(../)*',
              replace: '../',
              flags: 'g'
            },
            {
              name: 'Remove build folder from image path',
              // remove the root build folder... sometimes css image paths get this for some weird reason. Don't remove other build folders farther along in the path
              search: '\.\.\/build\/',
              replace: '../'
            },
            {
              name: 'Font Awesome path',
              search: '../lib/font-awesome/fonts/',
              replace: '../resources/lib/font-awesome/fonts/',
              flags: 'g'
            },
            {
              name: 'Calcite fonts',
              search: '../lib/calcite-bootstrap/css/fonts/',
              replace: '../resources/lib/calcite-bootstrap/fonts/',
              flags: 'g'
            }
          ]
        },
        js: {
          src: ['deploy/app/*.js'],
          actions: [
            {
              name: 'JS isProduction flag',
              search: 'TPL_ENV_DEV',
              replace: 'TPL_ENV_PRODUCTION'
            }
          ]
        },
        main: {
          src: ['deploy/app/main-config.js'],
          actions: [
            {
              name: 'Index.html isProduction flag',
              search: 'app.isProduction = false',
              replace: 'app.isProduction = true'
            }
          ]
        }
      },

      jshint: {
        'nls-en': {
          files: {
            src: [
              'src/resources/**/nls/*.js'
            ]
          }
        },
        'nls-all': {
          options: {
            smarttabs: true,
            '-W100': true,
            '-W044': true
          },
          files: {
            src: [
              'src/resources/**/nls/*/*.js'
            ]
          }
        }
      },

      connect: {
        server: {
          options: {
            port: 8081,
            keepalive: true,
            hostname: '*'
          }
        }
      },

      watch: {
        jsx: {
          files: ['src/app/**/*.jsx', 'src/app/storymaps/issue-checker/**/*.js'],
          tasks: [/*'eslint',*/ 'newer:babel'],
          options: {
            livereload: true
          }
        },
        less: {
          files: ['src/app/**/*.less'],
          tasks: ['newer:copy:less-in-react'],
          options: {
            livereload: true
          }
        },
        hbs: {
          files: ['src/app/**/*.hbs'],
          tasks: ['newer:copy:hbs-in-react'],
          options: {
            livereload: true
          }
        },
        others: {
          files: ['src/app/**/*.js', 'src/app/**/*.css', 'src/app/**/*.html'],
          tasks: [/*'eslint'*/],
          options: {
            livereload: true
          }
        },
        nlsforreact: {
          files: ['src/resources/tpl/**/nls/*.js'],
          tasks: ['copy:commonResources4react'],
          options: {
            livereload: true
          }
        }
      },
      uglify: {
        test: {
          files: {
            'src/MainView.js': ['src/app/storymaps/tpl/core/MainView.js']
          }
        }
      },

      eslint: {
        options: {
          configFile: '.eslintrc'
        },
        target: [
          'src/app/storymaps/**/*.js',
          'src/app/storymaps/**/*.jsx',
          '!src/app/storymaps/tpl/utils/UniteGallery.js',
          // ignore the issue-checker as well as it is an external repo
          '!src/app/storymaps/issue-checker/**/*.js',
        ]
      },

      babel: {
        options: {
          // Some configuration is in .babelrc as they are not supported here
          babelrc: '.babelrc',
          sourceMaps: true
        },
        dev: {
          files: [
            {
              expand: true,
              cwd: 'src/',
              src: ['app/storymaps/**/*.jsx'],
              dest: 'build/',
              ext: '.js'
            },
            {
              expand: true,
              cwd: 'src/app/storymaps/issue-checker/src/',
              src: ['./**/*.js'],
              dest: 'build/app/storymaps/issue-checker/',
              ext: '.js'
            }
          ]
        }
      }
    });

    /*
     * Create a web server on port 8081
     * Run 'start grunt server' or 'grunt server &'
     */
    grunt.registerTask('server', ['connect']);

    /*
     * Build production version of the template
     */
    grunt.registerTask('default', [
      // Comment out to disable code linting
      'jshint:nls-en',
      'jshint:nls-all',
      'eslint',

      // Initialize build (react temporary) and deploy (dist - ready for deploy) folders
      'clean',
      'mkdir',
      'copy:fonts',
      'copy:fonts2',
      'copy:fonts3',
      'copy:youtube',
      'copy:calcite-vars',

      //
      // React components
      //

      // React components are build into the temporary 'build' folder
      // They are wrapped into an AMD modules that the app is loading
      // Using the storymaps-react package

      // Copy the less files associated with react components manually
      // Some less files not used by react components also get copied but they won't be built
      'copy:less-in-react',
      'copy:hbs-in-react',
      // Build the JavaScript
      'babel',
      'copy:commonResources4react',

      // Minify and compress JS & CSS
      'requirejs',
      'regex-replace:js',
      'regex-replace:css',
      'concat',

      // Copy html
      'copy:html',

      // Copy main
      'copy:main',
      'regex-replace:main',

      // Copy resources
      'copy:config',
      'copy:resources',

      // Copy libs resources
      'copy:libsResources',

      'copy:fonts4',
      'clean:fonts',

      'copy:readme',
      'clean:jsapioptim',
      //'clean:fontello',
      'clean:build'
    ]);

    /*
     * Use during development
     * App will reload when making change through livereload
     */
    grunt.registerTask('dev', [
      'jshint:nls-en',
      'jshint:nls-all',
      'eslint',

      'clean',
      'mkdir',
      'copy:fonts',
      'copy:fonts2',
      'copy:fonts3',
      'copy:youtube',
      'copy:calcite-vars',

      'copy:less-in-react',
      'copy:hbs-in-react',
      'babel',
      'copy:commonResources4react',

      'watch'
    ]);

    /*
     * Generate jso.arcgis.com input
     */
    grunt.registerTask('jsapioptim', [
      'clean',
      'mkdir',

      'copy:less-in-react',
      'copy:hbs-in-react',
      'babel',
      'copy:commonResources4react',

      'requirejs',
      'execute'
    ]);

  };
})();
