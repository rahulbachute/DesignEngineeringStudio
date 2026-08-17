# Component Guide

MEILP components are independent UI units created by `ComponentRegistry` from configuration. Sprint 2A adds the first production-ready reusable components.

## Base Contract

Every component extends `BaseComponent` from `js/base-component.js`.

Lifecycle methods:

- `constructor(options)`
- `render()`
- `save(value)`
- `load()`
- `validate()`
- `destroy()`

Components receive:

- `config`: component configuration
- `stateManager`: central state service
- `eventBus`: platform event bus

Components must not access `localStorage` directly and must not directly modify another component.

## Registration

Sprint 2A components register with an engine registry:

```js
window.MEILP.registerSprint2AComponents(window.MEILP.engine.componentRegistry);
```

Available types:

- `student-info`
- `progress-bar`
- `assignment-navigation`
- `image-viewer`
- `image-label`

## Student Information Component

Class: `StudentInformationComponent`  
File: `components/student-info/student-info.js`

Configuration:

```json
{
  "id": "studentInfo",
  "title": "Student Information",
  "required": true
}
```

Fields:

- Group Number
- Division
- Batch
- Student 1
- Student 2
- Student 3
- Student 4
- Faculty Name
- Assignment Date

Validation:

- All fields required
- Group Number numeric
- Student and faculty names alphabetic with spaces
- Maximum group size is four students by design

Public behavior:

- `render()` returns the component root element
- `validate()` returns `{ valid, errors }`
- `handleSave()` validates, stores state, and emits save events
- `resetStudentInfo()` clears student state and emits reset events

Events emitted:

- `student-info-updated`
- `student-info-saved`
- `student-info-reset`

State written:

- `state.student`
- `state.responses[config.id]`

## Progress Bar Component

Class: `ProgressBarComponent`  
File: `components/progress-bar/progress-bar.js`

Configuration:

```json
{
  "id": "progress",
  "showPercentage": true
}
```

Events listened for:

- `progress-updated`
- `progress:updated`
- `assignment-loaded`
- `assignment:loaded`
- `student-info-saved`

Public behavior:

- `render()` returns the component root element
- `updateProgress(payload)` updates current task, total tasks, and percentage
- `refreshFromState()` rehydrates display from `StateManager`

The component does not know assignment details. It only reads task counts and progress state.

## Navigation Component

Class: `AssignmentNavigationComponent`  
File: `components/assignment-navigation/assignment-navigation.js`

Configuration:

```json
{
  "id": "assignmentNavigation"
}
```

Buttons:

- Home
- Previous
- Save
- Next

Events emitted:

- `navigate-home`
- `navigate-previous`
- `save-request`
- `navigate-next`

Events listened for:

- `progress-updated`
- `progress:updated`
- `assignment-loaded`
- `assignment:loaded`
- `student-info-saved`
- `student-info-reset`

The component emits intent only. Routing, saving, and task movement are handled by the page or platform controller.

## Demo

Open `components/demo.html` to verify:

- Component rendering
- Student form validation
- StateManager persistence
- EventBus communication
- ComponentRegistry creation
- Responsive layout

## Image Viewer Component

Class: `ImageViewerComponent`  
File: `components/image-viewer/image-viewer.js`

Purpose: display responsive configurable engineering media without assignment-specific logic.

Configuration:

```json
{
  "id": "imageViewer",
  "title": "Configurable Image",
  "figure": "Figure 1",
  "description": "Neutral image description",
  "image": "assets/images/example.svg",
  "placeholderImage": "assets/images/image-placeholder.svg",
  "errorImage": "assets/images/image-error.svg",
  "zoom": true,
  "fullscreen": true
}
```

Public methods:

- `render()`
- `load()`
- `setImage(source, options)`
- `resetZoom()`
- `zoomIn()`
- `zoomOut()`
- `fitToScreen()`
- `serialize()`
- `destroy()`

Events emitted:

- `image-loaded`
- `image-error`
- `zoom-changed`
- `fullscreen-opened`
- `fullscreen-closed`

Supported interactions:

- Lazy image loading
- Loading spinner
- Error fallback image
- Fullscreen mode
- Zoom in, zoom out, reset zoom
- Mouse wheel zoom
- Touch pinch zoom
- Pan after zoom
- Responsive aspect-ratio-preserving image display

Example usage:

```js
const viewer = registry.create("image-viewer", {
  config,
  stateManager,
  eventBus
});
host.append(viewer.render());
```

Demo: `components/demo/image-viewer-demo.html`

## Image Label Component

Class: `ImageLabelComponent`  
File: `components/image-label/image-label.js`

Purpose: collect student-entered labels for configurable marker positions on an image. It uses `ImageViewerComponent` internally.

Configuration:

```json
{
  "id": "imageLabel",
  "title": "Identify Diagram Areas",
  "image": "assets/images/example.svg",
  "labels": [
    {
      "id": 1,
      "x": 20,
      "y": 15,
      "placeholder": "Component 1"
    }
  ]
}
```

Public methods:

- `render()`
- `save(emitSaved)`
- `load()`
- `validate()`
- `getValue()`
- `setValue(value)`
- `reset()`
- `serialize()`
- `destroy()`

Events emitted:

- `label-updated`
- `label-saved`
- `label-reset`
- `validation-complete`

Save format:

```json
{
  "component1": "",
  "component2": ""
}
```

Validation:

- Required fields
- Whitespace trimming
- Duplicate answer prevention
- Live status display for valid and missing values

Demo: `components/demo/image-label-demo.html`

Screenshot placeholders: both demo pages include reusable visual regions suitable for later documentation screenshots.

## Workbench Integration

Future assignment pages should mount components into the Workbench center panel instead of creating isolated pages. Components continue to use the same contracts:

- Extend `BaseComponent`
- Register through `ComponentRegistry`
- Store state through `StateManager`
- Communicate through `EventBus`

The Workbench demo uses `ImageViewerComponent` and `AssignmentNavigationComponent` in the center panel and renders configurable information widgets in the right panel.
