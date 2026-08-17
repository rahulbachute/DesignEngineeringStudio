# Developer Guide

## Architecture Summary

The DES front end uses static HTML, Bootstrap, and modular JavaScript.

## Service Layer

- The faculty workspace uses repository and service modules under faculty/js/data and faculty/js/services.
- The student workspace uses the existing student-facing scripts and shared configuration.
- The service layer is the single integration point for live data.

## Development Notes

- Keep UI markup and navigation unchanged unless required for a critical fix.
- Reuse existing modules rather than creating duplicate implementations.
- Use the shared configuration to switch between development, mock, and live modes.
