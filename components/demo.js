window.addEventListener("DOMContentLoaded", () => {
  const storage = new window.MEILP.StorageService("meilp-demo");
  const engine = new window.MEILP.PlatformEngine({
    storage,
    config: window.MEILP.platformConfig
  });
  const services = engine.getServices();

  window.MEILP.registerSprint2AComponents(services.componentRegistry);
  window.MEILP.demoEngine = engine;

  const demoAssignment = {
    id: "component-demo",
    title: "Component Demo",
    description: "Generic task structure used only to demonstrate platform components.",
    tasks: [
      { id: "task-1", title: "Task 1" },
      { id: "task-2", title: "Task 2" },
      { id: "task-3", title: "Task 3" },
      { id: "task-4", title: "Task 4" },
      { id: "task-5", title: "Task 5" },
      { id: "task-6", title: "Task 6" }
    ]
  };

  engine.start();
  services.progressManager.startAssignment(demoAssignment);
  services.eventBus.emit("assignment-loaded", demoAssignment);

  const studentInfo = services.componentRegistry.create("student-info", {
    config: {
      id: "studentInfo",
      title: "Student Information",
      required: true
    },
    stateManager: services.stateManager,
    eventBus: services.eventBus
  });

  const progressBar = services.componentRegistry.create("progress-bar", {
    config: {
      id: "progress",
      showPercentage: true
    },
    stateManager: services.stateManager,
    eventBus: services.eventBus
  });

  const navigation = services.componentRegistry.create("assignment-navigation", {
    config: {
      id: "assignmentNavigation"
    },
    stateManager: services.stateManager,
    eventBus: services.eventBus
  });

  document.querySelector("[data-demo-student-info]").append(studentInfo.render());
  document.querySelector("[data-demo-progress]").append(progressBar.render());
  document.querySelector("[data-demo-navigation]").append(navigation.render());

  wireDemoEvents({ services, studentInfo, demoAssignment });
});

function wireDemoEvents({ services, studentInfo, demoAssignment }) {
  const eventBus = services.eventBus;
  const progressManager = services.progressManager;
  const logEvents = [
    "student-info-saved",
    "student-info-updated",
    "student-info-reset",
    "progress-updated",
    "navigate-next",
    "navigate-previous",
    "navigate-home",
    "save-request"
  ];

  logEvents.forEach((eventName) => {
    eventBus.listen(eventName, (payload) => addEventLog(eventName, payload));
  });

  eventBus.listen("student-info-saved", () => {
    emitProgressFromState(services);
  });

  eventBus.listen("student-info-reset", () => {
    services.stateManager.update({
      progress: {
        currentTaskId: "task-1",
        completedTaskIds: [],
        percentage: 0
      }
    });
    eventBus.emit("progress-updated", {
      currentTask: 1,
      totalTasks: demoAssignment.tasks.length,
      percentage: 0,
      active: false
    });
  });

  eventBus.listen("save-request", () => {
    studentInfo.handleSave();
  });

  eventBus.listen("navigate-next", () => {
    moveTask(services, 1);
  });

  eventBus.listen("navigate-previous", () => {
    moveTask(services, -1);
  });

  eventBus.listen("navigate-home", () => {
    services.router.navigate("home");
  });

  progressManager.setCurrentTask("task-1");
  eventBus.emit("progress-updated", {
    currentTask: 1,
    totalTasks: demoAssignment.tasks.length,
    percentage: 0,
    active: false
  });
}

function moveTask(services, direction) {
  const state = services.stateManager.getState();
  const tasks = state.assignment.tasks || [];
  const currentIndex = Math.max(0, tasks.findIndex((task) => task.id === state.progress.currentTaskId));
  const nextIndex = Math.max(0, Math.min(tasks.length - 1, currentIndex + direction));
  const nextTask = tasks[nextIndex];

  if (!nextTask) {
    return;
  }

  services.progressManager.setCurrentTask(nextTask.id);
  if (direction > 0 && tasks[currentIndex]) {
    services.progressManager.markTaskComplete(tasks[currentIndex].id);
  }
  emitProgressFromState(services);
}

function emitProgressFromState(services) {
  const state = services.stateManager.getState();
  const tasks = state.assignment.tasks || [];
  const currentIndex = Math.max(0, tasks.findIndex((task) => task.id === state.progress.currentTaskId));
  const currentTask = tasks.length > 0 ? currentIndex + 1 : 0;

  services.eventBus.emit("progress-updated", {
    currentTask,
    totalTasks: tasks.length,
    percentage: state.progress.percentage || 0,
    active: Boolean(state.student.saved)
  });
}

function addEventLog(eventName, payload = {}) {
  const log = document.querySelector("[data-event-log]");
  const item = document.createElement("li");
  const time = new Date().toLocaleTimeString();
  item.innerHTML = `
    <strong>${window.MEILP.escapeHtml(eventName)}</strong>
    <span>${window.MEILP.escapeHtml(time)} | ${window.MEILP.escapeHtml(summarizePayload(payload))}</span>
  `;
  log.prepend(item);
}

function summarizePayload(payload) {
  if (!payload || Object.keys(payload).length === 0) {
    return "event emitted";
  }

  if (payload.currentTask || payload.totalTasks) {
    return `task ${payload.currentTask || 0} of ${payload.totalTasks || 0}`;
  }

  if (payload.componentId) {
    return `component ${payload.componentId}`;
  }

  return "state changed";
}
