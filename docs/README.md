# MEILP Sprint 0

Mechanical Engineering Interactive Learning Platform (MEILP) is a reusable static web foundation for interactive engineering assignments.

Sprint 1 adds the reusable platform engine. It intentionally does not include assignment questions, assignment-specific logic, grading logic, or student dashboards.

## Run

Open `index.html` in a browser.

The project also works when deployed as a static site on GitHub Pages, Netlify, or embedded in Google Sites through an iframe.

## Project Structure

```text
assets/       Shared media and downloads
assignments/  Future assignment folders and config files
components/   Component contracts and starter documentation
css/          Shared theme and layout styles
data/         Platform registry and schemas
docs/         Developer documentation
js/           Runtime ES6 modules
src/          Future source notes or non-runtime prototypes
index.html    Static platform entry point
```

## Sprint 0 Scope

- Static Bootstrap 5 landing page
- Responsive navigation
- Theme toggle stored in localStorage
- Assignment registry loaded from configuration
- Storage service abstraction
- Validation and utility modules
- Component and assignment extension points

## Sprint 1 Scope

- Assignment loader
- Router
- State manager
- Component registry
- Event bus
- Base component class
- Progress manager
- Platform engine composition

## Sprint 2A Scope

- Student Information component
- Progress Bar component
- Navigation component
- Component registration helper
- Integrated component demo at `components/demo.html`

## Sprint 2B Scope

- Image Viewer component
- Image Label component
- Generic engineering demo assets
- Image viewer demo at `components/demo/image-viewer-demo.html`
- Image label demo at `components/demo/image-label-demo.html`

## Workbench UX Scope

- Professional Engineering Workbench shell
- Three-panel responsive assignment layout
- Attempt mode workflow
- Configurable task navigator and information widgets
- Dark mode persisted through `StateManager`
- Demo at `workbench-demo.html`

## First Engineering Challenge

- EC-01: Safety Verification of Elevator Suspension Cables
- Assignment package at `assignments/elevator/`
- Generic runner at `assignment-workbench.html?assignment=elevator`
- Structure documented in `ChallengeStructure.md`

## Assignment Builder

- Authoring template at `authoring/challenge-template/`
- Authoring guide at `authoring/AuthoringGuide.md`
- EC-02 demonstration package at `assignments/motorcycle/`
- Launch EC-02 with `assignment-workbench.html?assignment=motorcycle`

## Challenge Development Framework

- Official methodology at `challenge-framework/ChallengeDevelopmentGuide.md`
- Quality checklist at `challenge-framework/ChallengeChecklist.md`
- Templates for challenge packages, activities, rubrics, reflection, faculty guides, and student guides
- JSON and Markdown examples under `challenge-framework/examples/`

## Student Analytics Dashboard

- Dashboard page at `analytics-dashboard.html`
- Sample data at `data/analytics/sample-dashboard.json`
- Google Sheets integration module at `js/analytics/googleSheets.js`
- Installation guide at `docs/analytics/InstallationGuide.md`

## Sprint 1 Direction

Build the first assignment using the reusable engine and component set. Keep assignment content in assignment-level configuration.
