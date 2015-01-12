var gulp = require('gulp');
var gutil = require('gulp-util');
var uglify = require('gulp-uglify');
var jshint = require('gulp-jshint');
var browserify = require('browserify');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var sourcemaps = require('gulp-sourcemaps');


var jsBundleDirectory = './bin';
var jsSourceDirectory = './scripts/**/*.js';
var jsEntryPoint = './scripts/hexpixi.js';

var bundler = browserify(jsEntryPoint);

/*Tasks*/
gulp.task('lint-js', function() {

	return gulp.src(jsSourceDirectory)
		.pipe(jshint())
		.pipe(jshint.reporter('jshint-stylish'));
});

gulp.task('bundle-js', ['lint-js'], function () {

	return bundler.bundle()
		.on('error', showError)
		.pipe(source('hexpixi.js'))
		.pipe(buffer())
		.pipe(sourcemaps.init({loadMaps: true}))
		//.pipe(uglify())
		.pipe(sourcemaps.write('./'))
		.pipe(gulp.dest(jsBundleDirectory));
});

gulp.task('default', ['bundle-js']);

/*Functions*/
function showError (err) {
	gutil.log(gutil.colors.red(err.message));
	this.emit('end');
}
