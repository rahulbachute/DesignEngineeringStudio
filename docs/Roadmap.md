# Roadmap

## Sprint 0: Platform Foundation

- Create static project structure.
- Add landing page and theme.
- Add navigation, storage, config, utility, and validation modules.
- Define component and assignment extension points.
- Add developer documentation.

## Sprint 1: Platform Engine

- Add `AssignmentLoader`.
- Add hash-based `Router`.
- Add centralized `StateManager`.
- Add `ComponentRegistry`.
- Add decoupled `EventBus`.
- Add `BaseComponent` lifecycle class.
- Add `ProgressManager`.
- Compose services through `PlatformEngine`.
- Keep all code assignment-agnostic.

## Sprint 2A: Foundational Reusable UI Components

- Add Student Information component.
- Add Progress Bar component.
- Add Navigation component.
- Register components through `ComponentRegistry`.
- Demonstrate StateManager and EventBus communication in `components/demo.html`.

## Sprint 2B: Media and Labeling Components

- Add reusable image viewer.
- Add reusable image label component.
- Keep media components assignment-agnostic.
- Demonstrate zoom, fullscreen, autosave, reload, and validation.
- Keep marker coordinates configurable.

## Workbench UX Sprint

- Add professional engineering workbench interface.
- Add top header, task navigator, center activity panel, and engineering information panel.
- Add attempt mode workflow.
- Add reusable card styles and widget patterns.
- Persist light and dark mode through `StateManager`.

## Challenge Development Framework

- Add standard challenge development methodology.
- Add quality checklist for pedagogy, OBE, NBA, SPPU, CCE, accessibility, and JSON validation.
- Add templates for challenge, activity, rubric, reflection, faculty guide, and student guide.
- Add JSON and Markdown examples for faculty authoring.

## Sprint 3: First Assignment

- Add EC-01 Engineering Challenge package.
- Load challenge configuration through the generic assignment Workbench runner.
- Compose activities from JSON content and reusable components.
- Keep assignment content out of shared platform modules.

## Sprint 4: Student and Faculty Experience

- Add student dashboard.
- Add faculty dashboard prototype.
- Add exportable response summaries.
- Add configurable rubrics.

## Sprint 5: Integrations and Certification

- Add Google Sheets adapter.
- Add Google Forms export path if required.
- Add optional authentication adapter.
- Add badges and certificate workflows.
