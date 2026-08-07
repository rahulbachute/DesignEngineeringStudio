# Challenge Development Framework

The Challenge Development Framework (CDF) is the official methodology for creating Engineering Challenges in Design Engineering Studio (DES). It standardizes pedagogy, workflow, assessment, and accreditation evidence without requiring changes to the frozen DES platform.

## Purpose

Every Engineering Challenge must provide:

- Consistent pedagogy
- Consistent assessment
- Consistent workflow
- OBE compliance
- NBA documentation support
- SPPU 2024 Pattern / CCE alignment

## Required Challenge Sections

1. Project Charter
2. Learning Outcomes
3. Engineering Resources
4. Engineering Activities
5. Report / Engineering Notebook
6. Reflection
7. Engineering Takeaways
8. Submission
9. Faculty Evaluation
10. Challenge Quality Checklist

## Pedagogy: 5E Learning Cycle

- Engage: introduce the professional problem and client context.
- Explore: inspect resources, diagrams, data, and system behavior.
- Explain: describe principles, mechanisms, material choices, or load paths.
- Elaborate: apply reasoning through calculations, decisions, ranking, or design recommendations.
- Evaluate: submit notebook, reflection, rubric evidence, and faculty evaluation.

## OBE Mapping

Every activity must include:

- CCE Marks
- Bloom Level
- CO
- PO
- PSO
- Estimated Time

## Challenge Development Workflow

1. Define the Project Charter.
2. Map CO, PO, PSO, Bloom levels, marks, and expected time.
3. List optional engineering resources.
4. Create activity specifications using `EngineeringActivityTemplate`.
5. Configure the activity sequence in JSON.
6. Create rubric criteria using `RubricTemplate`.
7. Add reflection questions using `ReflectionTemplate`.
8. Write faculty and student guides.
9. Run the `ChallengeChecklist`.
10. Launch using `assignment-workbench.html?assignment=<slug>`.

## Authoring Rule

Challenge authors edit JSON, Markdown, and media assets only. Do not write assignment-specific JavaScript or HTML.
