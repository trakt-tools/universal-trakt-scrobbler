const gulp = require('gulp');
const zip = require('gulp-zip');

function zipExtension(browserName) {
  return gulp.src([`build/${browserName}/**`])
    .pipe(zip(`${browserName}.zip`))
    .pipe(gulp.dest('./dist'));
}

gulp.task('zip-chrome', () => {
  return zipExtension('chrome');
});

gulp.task('zip-firefox', () => {
  return zipExtension('firefox');
});

gulp.task('zip', gulp.parallel('zip-chrome', 'zip-firefox'));