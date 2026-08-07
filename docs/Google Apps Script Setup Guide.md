# Google Apps Script Setup Guide

## Purpose

This guide describes the expected deployment shape for the live Google Apps Script backend used by DES.

## Setup Steps

1. Create or open the Apps Script project tied to the Google Sheet.
2. Deploy the script as a Web App.
3. Expose the required endpoints:
   - getDashboard
   - getSubmissions
   - getSubmission
   - saveEvaluation
   - getOutcomeSummary
   - getAnalytics
   - generateReport
4. Update the app configuration with the deployed URL.

## Notes

- Keep the Apps Script URL outside the page markup.
- Use the shared service layer for all requests.
- Validate that responses are JSON-compatible and include clear error messages.
