(function (global) {
  if (!global.DESCache) {
    global.DESCache = {
      createStore() {
        return {
          get() { return null; },
          set() {},
          clear() {},
          clearAll() {}
        };
      }
    };
  }
})(window);
