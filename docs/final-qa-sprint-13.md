# Sprint 13 Final QA Report

Date: 19/07/2026

## Scope

Final QA focuses on core Clinic Booking flows after the Patient, Doctor, Admin, PDF, demo data and modal/form polish sprints.

Covered by automated smoke test:

- Authentication and OTP flows
- Password policy and doctor first-login password change
- Patient booking flow
- Duplicate and invalid booking protection
- Doctor appointment workflow
- Medical record creation and duplicate protection
- Patient/doctor permission checks
- Appointment, queue and medical record PDF access
- Review submission and duplicate protection
- Waiting list ownership and duplicate protection
- Notification persistence
- Audit log availability
- Doctor appointment status filtering

## Automated Result

Command:

```powershell
$env:NODE_ENV='test'
& 'C:\Users\DELL\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' backend/src/scripts/e2eSmokeTest.js
```

Result:

- Passed: 24/24
- Failed: 0/24
- SMTP sending was skipped only in `NODE_ENV=test` to avoid external network dependency during QA.
- Negative-case controller error logs appeared as expected because the smoke test intentionally verifies rejected requests.

## Static Checks

Commands:

```powershell
node --check backend/src/services/emailService.js
node --check backend/src/seed/seedDemoData.js
node --check backend/src/scripts/e2eSmokeTest.js
```

Result:

- All checked files passed JavaScript syntax validation.

## Demo Dataset

The demo dataset script was run successfully before QA.

Generated data:

- Clinics: 5
- Specialties: 40
- Doctors: 15
- Patients: 30
- Schedules: 210
- Appointments: 129
- Medical records: 30

Demo accounts:

- `admin@example.com / 123456`
- `demo.doctor01@clinic.test / 123456`
- `demo.patient01@clinic.test / 123456`

## Environment Notes

- The SMTP guard only affects test environment. Development and production email behavior remains unchanged.
- Browser responsive QA still needs a signed-in browser session for protected routes.
- Frontend Vite build may be blocked in the current sandbox by host filesystem permission errors unrelated to source code.

## Manual QA Checklist Remaining

Recommended browser pass:

- Patient: booking, cancel, reschedule, waiting list, medical records, PDF download, review
- Doctor: queue, appointment processing, medical record creation, schedule, reviews
- Admin: dashboard, clinics, doctors, specialties, schedules, appointments, packages, articles, audit log
- Responsive widths: 375, 430, 768, 1024, 1366, 1440
- Accessibility: focus order, escape modal, return focus, readable contrast, non-color-only statuses

## Residual Risk

Automated backend smoke coverage is strong for business-critical flows, but final acceptance should still include a browser walkthrough because several recent sprints changed UI layout, modal behavior and responsive CSS.
