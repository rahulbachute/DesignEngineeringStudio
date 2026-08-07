# DES Metadata Specification

Every Engineering Challenge must include standardized metadata. Metadata supports search, review, outcome mapping, assessment, version control, and compatibility with DES authoring practice.

Do not change the platform JSON schema. Use this document as an authoring standard for preparing and reviewing challenge content.

## Required Metadata Fields

| Field | Purpose | Authoring Guidance |
| --- | --- | --- |
| Challenge Code | Unique challenge identifier | Use a stable code such as `PCC303-MEC-U2-EC01`. |
| Course Code | Course ownership | Use official course code, for example `PCC303-MEC`. |
| Unit | Syllabus unit | Mention unit number and short topic name. |
| Difficulty | Student challenge level | Use `Beginner`, `Intermediate`, or `Advanced`. |
| Estimated Time | Workload planning | State expected completion time in minutes or hours. |
| CCE Marks | Assessment weight | State total marks and distribution if applicable. |
| CO Mapping | Course Outcome alignment | List CO numbers and short evidence statement. |
| PO Mapping | Program Outcome alignment | List PO numbers with activity evidence. |
| PSO Mapping | Program Specific Outcome alignment | List PSO numbers with evidence. |
| WK Mapping | Washington Accord knowledge mapping | List WK1 to WK9 entries used in the challenge. |
| Bloom Level | Cognitive level | Use Remember, Understand, Apply, Analyze, Evaluate, or Create. |
| Graduate Attributes | Professional attributes | Name relevant attributes such as engineering knowledge, problem analysis, design, communication, ethics, sustainability, teamwork, and lifelong learning. |
| Interactive Components | Platform interactions used | List each interaction and its learning purpose. |
| Required Resources | Materials needed | Include diagrams, tables, formulas, standards, data sheets, or tools. |
| Prerequisites | Prior knowledge | Mention required concepts, formulas, or previous challenge experience. |
| Version | Content version | Use semantic or dated versioning, for example `1.0` or `2026.07.17`. |
| Author | Content creator | Include name, department, and institution if required. |
| Reviewer | Academic reviewer | Include reviewer name and review date. |
| Approval Status | Release state | Use `Draft`, `Under Review`, `Pilot`, `Approved`, or `Retired`. |

## Recommended Metadata Block

```markdown
## Challenge Metadata

- Challenge Code:
- Course Code:
- Unit:
- Difficulty:
- Estimated Time:
- CCE Marks:
- CO Mapping:
- PO Mapping:
- PSO Mapping:
- WK Mapping:
- Bloom Level:
- Graduate Attributes:
- Interactive Components:
- Required Resources:
- Prerequisites:
- Version:
- Author:
- Reviewer:
- Approval Status:
```

## Approval Status Definitions

| Status | Meaning |
| --- | --- |
| Draft | Author is still developing content. |
| Under Review | Faculty reviewer is checking quality and alignment. |
| Pilot | Challenge is being tested with students. |
| Approved | Challenge is ready for classroom use. |
| Retired | Challenge is no longer recommended for use. |

## Metadata Quality Rules

- Every required field must be filled before release.
- Mapping fields must include evidence, not only codes.
- Estimated time must be verified during pilot use.
- Version must change after meaningful content revision.
- Approval status must reflect the actual review state.
- Metadata must remain consistent across faculty notes, rubric, and student materials.

