# Design Engineering Studio (DES / MEILP)

A web-based Design Engineering Studio (DES) platform for engineering education, challenge-based learning, and continuous comprehensive evaluation.

Design Engineering Studio is a production-ready academic operations workspace for engineering education. The current release focuses on faculty workflow support, submission management, evaluation, outcomes, analytics, and reporting while preserving the existing student workspace.

## Release Overview

- Version: 1.0.0
- Status: Release Candidate
- Scope: Production readiness, stability, documentation, and deployment preparation

## Included Areas

- Student workspace
- Faculty workspace
- Challenge and submission workflows
- Evaluation and outcome tracking
- Analytics and reporting
- Google Apps Script and Google Sheets integration support

## Project Structure

- faculty/ - Faculty workspace HTML, CSS, and JavaScript modules
- outputs/meilp/ - Static web application assets and documentation
- templates/ - Reusable templates and guides
- knowledge base/ - Standards and institutional documentation

## Run Locally

1. Open the repository root in a browser.
2. Launch the faculty workspace from the faculty folder.
3. Open the static outputs/meilp site for the student-facing experience.

## Deployment Notes

- The platform is designed as a static web application.
- GitHub Pages is suitable for the front-end experience.
- Google Apps Script should be deployed separately for live data integration.

## Documentation

- Faculty user guide is available in the Faculty Resources folder.
- Developer documentation is available in the outputs/meilp/docs folder.

## Version History

- 1.0.0 - Release Candidate for production deployment preparation.
