# Coding Standards

## General

- Use HTML5, CSS3, Bootstrap 5, Bootstrap Icons, and vanilla ES6 JavaScript only.
- Do not introduce React, Angular, Vue, Tailwind, jQuery, npm, Node.js, or a build process.
- Keep shared code assignment-agnostic.
- Prefer configuration over hardcoded content.
- Avoid inline CSS and inline JavaScript.

## JavaScript

- Use modular ES6 class files. Runtime files are loaded as deferred browser scripts so `index.html` can still open directly without a local server.
- Keep functions small and named by intent.
- Keep DOM selectors stable with `data-*` attributes.
- Keep services behind adapter-style APIs.
- Sanitize dynamic HTML with shared utilities.
- Document module responsibility at the top of each module.
- Do not access localStorage outside `storage.js`.
- Use `StateManager` for platform state.
- Use `EventBus` for cross-service or cross-component communication.

## CSS

- Use theme tokens in `:root`.
- Keep Bootstrap overrides centralized in `css/theme.css`.
- Keep card radius at 8px unless the design system changes.
- Ensure layouts are responsive and text remains readable on mobile.

## Components

- Each component must have a clear configuration contract.
- Components should not know which assignment they belong to.
- Components should emit normal browser events for state changes.
- Components should store normalized values, not rendered HTML.
- Components must extend `BaseComponent`.
- Components must register through `ComponentRegistry`.
- Components must communicate with siblings through `EventBus`, not direct references.

## Data

- Use JSON for assignment registries and assignment configuration.
- Validate required fields before rendering.
- Keep assignment assets inside the assignment folder unless they are shared.
