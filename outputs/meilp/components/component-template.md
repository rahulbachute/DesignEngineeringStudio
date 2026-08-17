# Component Template

Use this template when adding a new component.

## Purpose

Describe the student or faculty workflow the component supports.

## Configuration Contract

```json
{
  "id": "component-id",
  "type": "component-type",
  "label": "Visible label",
  "required": true
}
```

## DOM Contract

- The component root uses `data-component`.
- Inputs use stable `name` attributes.
- State changes are emitted through standard browser events.

## Storage Contract

Store only normalized student responses, not rendered HTML.
