# Architecture

MEILP is a static, configuration-driven learning platform engine. The core platform must remain independent of any subject, assignment, institution, or assessment style.

## Runtime Layers

1. Platform Shell

   `index.html`, `css/theme.css`, and `js/app.js` provide the static entry point, landing view, navigation, theme state, and engine startup.

2. Platform Engine

   `js/engine.js` composes the Sprint 1 services into one runtime object exposed as `window.MEILP.engine`.

3. Assignment Loading

   `js/assignment-loader.js` loads future assignment configuration from `assignments/<assignment-name>/config.json`, validates required fields, builds normalized assignment structure, checks component availability, and reports errors through the event bus.

4. Routing

   `js/router.js` supports hash-based routes for `home`, `assignment`, `task`, `summary`, and `submit`. Hash routing keeps the platform static-host friendly and compatible with direct file opening.

5. State

   `js/state-manager.js` owns the full platform state:

   ```json
   {
     "student": {},
     "assignment": {},
     "responses": {},
     "progress": {},
     "settings": {}
   }
   ```

   State is persisted only through `js/storage.js`.

6. Components

   `js/component-registry.js` registers component classes and creates instances dynamically. `js/base-component.js` defines the lifecycle contract for all Sprint 2 components. Sprint 2A components live under `/components` and register with the existing registry.

7. Events and Progress

   `js/event-bus.js` provides decoupled communication. `js/progress-manager.js` tracks current task, completed tasks, and completion percentage.

## Engine Flow

```text
Router -> AssignmentLoader -> ComponentRegistry
   |              |                  |
   v              v                  v
EventBus -> StateManager <-> ProgressManager
                  |
                  v
              StorageService
```

## Assignment Configuration

Future assignments should use this shape:

```json
{
  "id": "assignment-id",
  "title": "Assignment Title",
  "description": "Short description",
  "tasks": [
    {
      "id": "task-id",
      "type": "task-type",
      "components": []
    }
  ]
}
```

The engine supports loading this structure but Sprint 1 does not include real assignments, questions, media assets, or assignment-specific logic.

## Sprint 2A Components

Reusable UI components are integrated without changing the Platform Engine:

- `StudentInformationComponent` collects group and faculty information, validates it, stores it through `StateManager`, and emits student events.
- `ProgressBarComponent` listens for progress and assignment events, then renders current task, total tasks, and percentage.
- `AssignmentNavigationComponent` emits navigation intent events and automatically enables or disables controls based on state.

The demo page at `components/demo.html` composes these components through `ComponentRegistry` and `EventBus`.

## Sprint 2B Components

Sprint 2B adds reusable media components without changing the Platform Engine:

- `ImageViewerComponent` displays configurable images with caption metadata, loading and error states, fullscreen mode, zoom, wheel zoom, touch pinch zoom, pan, reset, and fit-to-screen behavior.
- `ImageLabelComponent` composes `ImageViewerComponent`, renders numbered markers from percentage coordinates, stores student labels through `StateManager`, autosaves values, and validates missing or duplicate entries.

Demo pages:

- `components/demo/image-viewer-demo.html`
- `components/demo/image-label-demo.html`

## Engineering Workbench

The Workbench is the standard assignment interface shell for future assignments. It sits above the Platform Engine and composes existing services and components without modifying engine internals.

Workbench areas:

- Top header for assignment identity, course metadata, user, attempt mode, progress, theme, and help.
- Left task navigator for assignment overview, setup, tasks, reflection, and submit states.
- Center activity panel for dynamically mounted components.
- Right engineering information panel for configurable widgets.

The demo page is `workbench-demo.html`.

## Configuration-Driven Challenge Runner

`assignment-workbench.html` and `js/challenge-runner.js` render Engineering Challenges from assignment package JSON. The runner is reusable and not specific to EC-01.

Responsibilities:

- Load `config.json`, `workflow.json`, `content.json`, and `rubric.json`.
- Build task navigation from `workflow.json`.
- Render activity UI from configured component types.
- Mount reusable components through `ComponentRegistry`.
- Persist attempt mode, student details, and responses through `StateManager`.
- Prepare a structured submission payload for future Google Sheets integration.

The first reference package is `assignments/elevator/`.

## Static Deployment

The platform uses HTML5, CSS3, Bootstrap 5, Bootstrap Icons, and vanilla ES6 classes in modular JavaScript files. No backend, npm, bundler, framework, or build process is required.

## Future Expansion

The architecture is ready for:

- 20+ assignments
- 100+ tasks
- Student dashboard
- Faculty dashboard
- Google Sheets and Forms integration
- Authentication
- Progress tracking
- Badges and certificates
