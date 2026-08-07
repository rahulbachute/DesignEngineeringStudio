# Challenge Template Guide

The challenge template contains all files needed to start a new Engineering Challenge.

## Required Files

- `config.json`: challenge metadata and course mapping
- `workflow.json`: activity order and renderer mapping
- `content.json`: dashboard, attempt mode fields, widgets, and activity content
- `rubric.json`: marks and assessment mapping
- `engineering-brief.md`: professional project brief
- `instructor-guide.md`: teaching and evaluation notes
- `student-guide.md`: student-facing guidance

## Standard Challenge Sections

1. Project Charter
2. Engineering Background
3. Learning Outcomes
4. Engineering Activities
5. Report / Engineering Notebook
6. Reflection
7. Submission

## Course Mapping

Use `config.json` to define:

- Course Code
- Course Name
- Unit
- CO
- PO
- PSO
- CCE Type
- Assignment Weightage

## Attempt Mode

Set `settings.attemptMode` to:

- `individual`
- `group`
- `both`

Then keep only the relevant attempt fields in `content.json`.
