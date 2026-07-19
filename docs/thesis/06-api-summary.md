# 06 - API Summary

## Auth

- `POST /api/auth/register`
- `POST /api/auth/verify-email`
- `POST /api/auth/login`
- `POST /api/auth/forgot-password`
- `PATCH /api/auth/change-password`
- `POST /api/auth/change-initial-password`

## Public

- `GET /api/clinics`
- `GET /api/clinics/:clinicId`
- `GET /api/specialties`
- `GET /api/specialties/:specialtyId`
- `GET /api/doctors`
- `GET /api/doctors/:doctorId`
- `GET /api/articles`
- `GET /api/service-packages`
- `POST /api/ai/*`

## Appointment

- `GET /api/appointments/my`
- `POST /api/appointments`
- `GET /api/appointments/:id`
- `PATCH /api/appointments/:id/status`
- `PATCH /api/appointments/:id/cancel-request`
- `PATCH /api/appointments/:id/reschedule-request`
- `GET /api/appointments/:id/pdf`
- `GET /api/appointments/:id/queue-ticket/pdf`

## Waiting List

- `GET /api/waiting-list`
- `POST /api/waiting-list`
- `POST /api/waiting-list/:id/accept`
- `DELETE /api/waiting-list/:id`

## Medical Records

- `GET /api/medical-records`
- `GET /api/medical-records/:id`
- `POST /api/medical-records`
- `GET /api/medical-records/:id/pdf`

## Reviews

- `POST /api/reviews`
- `GET /api/doctors/:doctorId/reviews`
- `GET /api/doctor/reviews`

## Doctor Portal

- `GET /api/doctors/:doctorId/appointments`
- `GET /api/doctor/queue`
- `GET /api/doctor/medical-records`
- `GET /api/doctor/profile`
- `GET /api/doctor/service-packages`
- `GET /api/doctor/articles`
- `GET /api/doctor/schedules`

## Admin Portal

- `GET /api/admin/dashboard`
- `GET /api/admin/appointments`
- `GET /api/admin/audit-logs`
- `GET/POST/PATCH/DELETE /api/admin/articles`
- `GET/POST/PATCH/DELETE /api/admin/service-packages`
- `GET/POST/PATCH/DELETE /api/clinics`
- `GET/POST/PATCH/DELETE /api/specialties`
- `GET/POST/PATCH/DELETE /api/doctors`
- `GET/POST/PATCH/DELETE /api/schedules`

## Uploads

- `POST /api/uploads`
- Static files served from `/uploads`.

## Response Convention

- Success: JSON object or PDF buffer.
- Error: JSON with message, status code handled by error middleware.
- PDF: `Content-Type: application/pdf`, `Content-Disposition` includes user-friendly filename.
