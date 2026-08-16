(function (global) {
  const logger = global.DESLogger ? global.DESLogger('FacultyUI', global.DESConfig || {}) : console;

  global.DESFacultyLogger = logger;
})(window);
