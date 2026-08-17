# Rubric Template

Use this structure for every assessed activity.

```json
{
  "activityId": "activity-id",
  "activityNumber": 1,
  "title": "Criterion Title",
  "marks": 2,
  "coMapping": "CO1",
  "poMapping": ["PO1", "PO2"],
  "psoMapping": ["PSO1"],
  "bloomLevel": "L3 Apply",
  "facultyRemarks": "",
  "commonErrors": ["Common error 1"],
  "outcomeAttainment": {
    "coEvidence": "",
    "poEvidence": "",
    "psoEvidence": ""
  },
  "autoEvaluation": {
    "enabled": false,
    "futureRule": ""
  }
}
```

## Marking Rules

- Rubric marks must total the configured CCE marks.
- Every assessed workflow activity needs a rubric entry.
- Bloom levels should match the activity requirement.
