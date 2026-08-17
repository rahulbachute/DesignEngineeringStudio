# Google Sheets Setup Guide

## Purpose

This guide supports connecting DES to Google Sheets through the Apps Script integration layer.

## Recommended Setup

1. Create a spreadsheet with separate sheets for dashboard data, submissions, evaluations, outcomes, analytics, and reports.
2. Grant the Apps Script project permission to read and write the sheet data.
3. Keep each sheet schema consistent with the service-layer expectations.
4. Test each endpoint using mock data first and then switch the application to live mode.

## Validation Checklist

- Headers and sheet names match the expected endpoint payloads.
- The Apps Script URL is configured correctly.
- Error responses are surfaced in a user-friendly way.
