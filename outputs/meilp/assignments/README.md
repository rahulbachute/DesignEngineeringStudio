# Assignments

Each future assignment receives its own folder:

```text
assignments/
  assignment-id/
    config.json
    assets/
    README.md
```

Assignment configuration must describe metadata, tasks, components, validation rules, and storage keys. The platform shell should load that configuration rather than hardcoding subject content in shared JavaScript.

Minimum structure:

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

Sprint 1 only supports loading and validating this shape. Real assignment content starts in a later sprint.

## Reference Challenge

`assignments/elevator/` is the first full Engineering Challenge package. It demonstrates the production structure:

- `config.json`
- `workflow.json`
- `content.json`
- `rubric.json`
- `engineering-brief.md`
- `instructor-guide.md`
- `images/`

Launch it with `assignment-workbench.html?assignment=elevator`.
