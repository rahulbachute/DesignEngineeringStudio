window.MEILP = window.MEILP || {};

/**
 * Registers reusable components with a ComponentRegistry instance.
 */
window.MEILP.registerSprint2AComponents = function registerSprint2AComponents(registry) {
  window.MEILP.registerStudentInformationComponent(registry);
  window.MEILP.registerProgressBarComponent(registry);
  window.MEILP.registerAssignmentNavigationComponent(registry);
};

window.MEILP.registerSprint2BComponents = function registerSprint2BComponents(registry) {
  window.MEILP.registerImageViewerComponent(registry);
  window.MEILP.registerImageLabelComponent(registry);
};

window.MEILP.registerAllComponents = function registerAllComponents(registry) {
  window.MEILP.registerSprint2AComponents(registry);
  window.MEILP.registerSprint2BComponents(registry);
};
