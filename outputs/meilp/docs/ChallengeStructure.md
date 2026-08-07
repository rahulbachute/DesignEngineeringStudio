# Engineering Challenge Structure

MEILP challenges are configuration-driven assignment packages.

## Folder Pattern

```text
assignments/
  challenge-slug/
    config.json
    workflow.json
    content.json
    rubric.json
    engineering-brief.md
    instructor-guide.md
    images/
```

## Configuration

`config.json` defines project metadata, task IDs, and linked data files.

`workflow.json` defines the ordered activity sequence and renderer type for each activity.

`content.json` holds dashboard data, attempt-mode fields, information widgets, activity prompts, labels, calculations, and reflection questions.

`rubric.json` defines marks and evaluation criteria.

## Runner

`assignment-workbench.html?assignment=<slug>` loads the assignment package and renders it through `js/challenge-runner.js`.

The runner is generic:

- It reads JSON files.
- It builds task navigation from workflow.
- It stores student and activity responses through `StateManager`.
- It uses `ComponentRegistry` for reusable components such as Image Label.
- It prepares submission data for future Google Sheets integration.

## Reference Implementation

`assignments/elevator/` is the reference implementation for future Engineering Challenges.

## Assignment Builder

`authoring/challenge-template/` is the faculty starting point for new challenges. Copy the template, edit JSON and Markdown files, add optional assets, then register the package in `data/assignments.json`.

`assignments/motorcycle/` demonstrates a second challenge authored from the template without writing custom JavaScript or HTML.

## Challenge Development Framework

Before authoring a new challenge, use `challenge-framework/ChallengeDevelopmentGuide.md` and `challenge-framework/ChallengeChecklist.md`. The framework defines the required pedagogy, OBE mapping, NBA evidence, CCE assessment structure, and quality checks for every future challenge.
