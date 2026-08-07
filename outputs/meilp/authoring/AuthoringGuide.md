# Assignment Builder Authoring Guide

The MEILP Assignment Builder is a file-based authoring framework. Faculty create Engineering Challenges by editing JSON and Markdown files only. No JavaScript or HTML is required.

## Create a New Challenge

1. Copy `authoring/challenge-template/`.
2. Rename the copied folder using a lowercase slug, such as `bearing-selection`.
3. Move it to `assignments/<challenge-slug>/`.
4. Edit `config.json`, `workflow.json`, `content.json`, `rubric.json`, and Markdown guides.
5. Add optional resources under `images/` or `assets/`.
6. Register the challenge in `data/assignments.json`.
7. Launch with `assignment-workbench.html?assignment=<challenge-slug>`.

## Add Images and Resources

Place resources in the challenge folder:

```text
assignments/<challenge-slug>/images/
assignments/<challenge-slug>/assets/
```

Supported resource types:

- Photographs
- Assembly drawings
- Line diagrams
- Exploded views
- CAD screenshots
- Reference documents
- Videos and animations for future support

Resources are optional. Only include what the activity needs.

## Configure Activities

Define the ordered flow in `workflow.json`. Each step needs:

- `id`: unique activity ID
- `title`: visible activity title
- `component`: renderer type
- `statusGroup`: setup, analysis, calculation, report, reflection, or submission

Supported activity types:

- Information Page
- Student Information
- Image Viewer
- Image Label
- Engineering Text Response
- MCQ
- Checkbox
- Dropdown
- Numerical Input
- Calculation
- Ranking
- Reflection
- Engineering Decision
- Report / Engineering Notebook

Future activity types should be added as new renderer/component contracts, while existing challenge files remain stable.

## Configure Marks

Use `rubric.json` for assessment:

- `activityId`
- `title`
- `marks`
- `coMapping`
- `bloomLevel`
- `facultyRemarks`
- `autoEvaluation`

Every assessed activity should have a matching rubric entry.

## Configure Navigation

Navigation is generated from `workflow.json`. Do not create custom pages for activities. Reorder steps by moving objects in the `steps` array.

## Instructor Notes

Use `instructor-guide.md` for:

- Objectives
- Expected answers
- Common mistakes
- Discussion points
- Suggested evaluation

## Export Readiness

The runner prepares response data as structured JSON. Future exports can target LMS packages, Google Sheets, or downloadable challenge documentation.
