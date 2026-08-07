# Workbench Guide

The Engineering Workbench is the standard interface shell for future MEILP assignments. It is designed to feel like a professional engineering tool rather than a course landing page.

## Layout

The Workbench uses a responsive three-panel layout:

- Top Header: assignment title, course code, course name, current user, attempt mode, progress, dark mode, and help.
- Left Sidebar: task navigator with completed, current, and pending states.
- Center Panel: dynamic activity host for reusable components.
- Right Sidebar: engineering information widgets.

Desktop uses three columns, tablet collapses the inspector below the main area, and mobile uses a single-column layout with the task navigator in an offcanvas panel.

## Widgets

Right-panel widgets are configuration driven. Standard widget types include:

- Progress Summary
- Current Responses
- Engineering Hint
- Important Note
- Learning Outcome
- CO Mapping
- Time Remaining
- AI Assistant Placeholder

Widgets use shared card styling and can be replaced by assignment configuration in future sprints.

## Theme

The Workbench uses the engineering calculator palette:

- Primary: `#0B2E59`
- Accent: `#F28C28`
- Secondary: `#6C3FC5`
- Background: `#F5F7FA`
- Cards: white

Dark mode is controlled by the Workbench theme toggle and persisted through `StateManager`.

## Cards

Reusable card styles:

- Information Card
- Theory Card
- Hint Card
- Warning Card
- Calculation Card
- Observation Card
- Student Response Card
- Result Card
- Error Card

Cards share border radius, shadows, typography, and section heading treatment.

## Navigation

The task navigator displays:

- Assignment Overview
- Introduction
- Student Information
- Task 1 through Task 4
- Reflection
- Submit

Each task displays a completed, current, or pending icon. Navigation buttons emit events and do not directly modify the Platform Engine.

## Attempt Mode

The Workbench asks for attempt mode before the assignment starts:

- Individual: Roll Number, Student Name, Division, Class, Academic Year
- Group: Group Number, optional Group Name, Division, Class, Academic Year, Student 1 through Student 4

The demo stores this information in `StateManager` and uses it to unlock the assignment workflow.

## Demo

Open `workbench-demo.html` to test the full flow:

1. Choose attempt mode.
2. Enter student or group information.
3. Navigate tasks.
4. View the engineering information panel.
5. Interact with the image viewer placeholder.
6. Save drafts and observe progress updates.

## Challenge Runner

Open `assignment-workbench.html?assignment=elevator` to run the first full Engineering Challenge.

The runner keeps pages generic. Assignment content comes from:

- `assignments/elevator/config.json`
- `assignments/elevator/workflow.json`
- `assignments/elevator/content.json`
- `assignments/elevator/rubric.json`
