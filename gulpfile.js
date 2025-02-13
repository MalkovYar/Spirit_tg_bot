var gulp = require('gulp');
var sass = require('gulp-sass');
var browserSync = require('browser-sync').create
// Задача для компиляции SASS файлов в CSS
gulp.task('sass', function () {
   return gulp.src('app/scss/**/*.scss')
      .pipe(sass())
      .pipe(gulp.dest('app/css'))
      .pipe(browserSync.reload({
         stream: true
      }))
});
// Задача для автоматического обновления браузера
gulp.task('browserSync', function () {
   browserSync.init({
      server: {
         baseDir: 'app'
      },
   })
})
// Запуск задач sass и browserSync параллельно
gulp.task('default', gulp.parallel('sass', 'browserSync'));