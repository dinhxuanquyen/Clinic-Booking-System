# Hệ thống web đặt lịch khám bệnh

Full-stack project cho phòng khám nhỏ, dùng React + Bootstrap ở frontend, Node.js + Express.js ở backend, MongoDB + Mongoose cho database, JWT cho xác thực và Nodemailer cho email xác nhận.

## 1. Phân tích kiến trúc

Hệ thống chia thành 3 lớp:

- Frontend React hiển thị thông tin cơ sở, chuyên khoa, bác sĩ, khung giờ còn trống, form đặt lịch, lịch hẹn cá nhân, màn hình staff và dashboard admin.
- Backend Express cung cấp REST API theo mô hình MVC, xác thực JWT, phân quyền theo role, validation, error handling và gửi email xác nhận.
- MongoDB được tách thành Central DB và Clinic DB. Central DB lưu dữ liệu dùng chung, còn mỗi chi nhánh phòng khám có một database riêng để lưu dữ liệu vận hành tại chi nhánh đó.

Luồng đặt lịch:

1. Patient đăng nhập bằng JWT.
2. Frontend gọi API lấy lịch làm việc và khung giờ còn trống theo `clinicId`, `doctorId`, `date`.
3. Patient gửi yêu cầu đặt lịch.
4. Backend chọn clinic database bằng `getClinicConnection(clinicId)`.
5. Backend kiểm tra khung giờ có trong schedule.
6. MongoDB unique index chặn 2 lịch trùng `clinicId + doctorId + date + timeSlot`.
7. Nếu trùng lịch, API trả HTTP `409 Conflict`.
8. Nếu thành công, hệ thống gửi email xác nhận bằng Nodemailer.

## 2. Cấu trúc thư mục

```text
backend/
  src/
    config/          # env, central connection, clinic connection cache
    controllers/     # auth, public, appointment, admin
    middleware/      # JWT auth, role guard, validation, error handler
    models/
      central/       # users, clinics, specialties, services
      clinic/        # doctors, patients, appointments, schedules
    routes/          # REST routes
    seed/            # dữ liệu mẫu
    services/        # email service
    utils/           # ApiError, asyncHandler
    app.js
    server.js
frontend/
  public/            # placeholder images
  src/
    api/             # fetch client
    components/      # navbar, protected route
    context/         # auth context
    pages/           # patient, staff, admin screens
    styles/
```

## Thesis-ready documents

The graduation/thesis document pack is available at [`docs/thesis`](docs/thesis/README.md).

Included:

- Architecture
- Database diagram
- Use cases
- Sequence diagrams
- Deployment guide
- API summary
- Test report
- Demo script
- User, Doctor and Admin manuals
- Slide outline

## 3. Database schema

Central DB:

- `users`: `name`, `email`, `phone`, `password`, `role`, `clinicId`, `isActive`
- `clinics`: `name`, `address`, `phone`, `email`, `description`, `image`, `workingHours`, `specialtyIds`, `isActive`
- `specialties`: `name`, `description`, `image`, `clinicId`, `isActive`
- `services`: `name`, `description`, `price`, `specialtyId`, `isActive`

Clinic DB theo từng chi nhánh:

- `doctors`: `name`, `email`, `phone`, `avatar`, `degree`, `experienceYears`, `description`, `clinicId`, `specialtyId`, `workingDays`, `workingHours`, `isActive`
- `patients`: `clinicId`, `userId`, `name`, `email`, `phone`, `dateOfBirth`, `gender`
- `schedules`: `clinicId`, `doctorId`, `date`, `timeSlots`, `isActive`
- Central `schedules`: `doctorId`, `clinicId`, `date`, `workingHours`, `slotDuration`, `isWorkingDay`, `note`
- Clinic DB `appointments`: `clinicId`, `doctorId`, `patientId`, `specialtyId`, `date`, `timeSlot`, `reason`, `status`
- Central `appointments`: `patientId`, `doctorId`, `clinicId`, `specialtyId`, `date`, `timeSlot`, `reason`, `status`

Unique indexes:

- `patients`: `{ clinicId, userId }`
- `schedules`: `{ clinicId, doctorId, date }`
- `appointments`: `{ clinicId, doctorId, date, timeSlot }`

## 4. Phân tán dữ liệu theo chi nhánh

Backend dùng [backend/src/config/db.js](./backend/src/config/db.js):

```js
export async function getClinicConnection(clinicId) {
  if (clinicConnections.has(key)) return clinicConnections.get(key);
  const connection = await mongoose.createConnection(clinicUri).asPromise();
  clinicConnections.set(key, connection);
  return connection;
}
```

Tên database chi nhánh được tạo từ `CLINIC_DB_PREFIX` và `clinicId`, ví dụ:

```text
clinic_branch_6656f...
```

Connection được cache bằng `Map` để tránh reconnect nhiều lần.

## 5. Backend

API chính:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/clinics`
- `GET /api/clinics/:clinicId`
- `POST /api/clinics`
- `PUT /api/clinics/:id`
- `DELETE /api/clinics/:id`
- `GET /api/specialties`
- `GET /api/specialties/:id`
- `GET /api/clinics/:clinicId/specialties`
- `POST /api/specialties`
- `PUT /api/specialties/:id`
- `DELETE /api/specialties/:id`
- `GET /api/services`
- `GET /api/doctors?clinicId=...`
- `GET /api/clinics/:clinicId/doctors/:doctorId`
- `GET /api/doctors`
- `GET /api/doctors/:id`
- `GET /api/doctors?clinicId=...&specialtyId=...`
- `GET /api/clinics/:clinicId/doctors`
- `GET /api/specialties/:specialtyId/doctors`
- `POST /api/doctors`
- `PUT /api/doctors/:id`
- `DELETE /api/doctors/:id`
- `GET /api/available-slots?clinicId=...&doctorId=...&date=YYYY-MM-DD`
- `POST /api/appointments`
- `GET /api/appointments/my`
- `GET /api/appointments`
- `GET /api/doctors/:doctorId/appointments`
- `GET /api/doctors/:doctorId/available-slots?date=YYYY-MM-DD`
- `PATCH /api/appointments/:id/status`
- `GET /api/appointments/mine?clinicId=...`
- `GET /api/appointments/clinic/:clinicId/today?date=YYYY-MM-DD`
- `PATCH /api/appointments/clinic/:clinicId/:appointmentId/status`
- `GET /api/admin/dashboard`
- `GET /api/admin/users`
- `POST/PATCH /api/admin/clinics`
- `POST/PATCH /api/admin/specialties`
- `POST/PATCH /api/admin/services`
- `POST/PATCH /api/admin/doctors`
- `POST /api/admin/schedules`

Appointment API:

```json
{
  "success": true,
  "message": "Appointment booked successfully",
  "data": {}
}
```

Create appointment body, patient token required:

```json
{
  "clinicId": "clinic_object_id",
  "specialtyId": "specialty_object_id",
  "doctorId": "doctor_object_id",
  "date": "2026-05-27",
  "timeSlot": "08:30",
  "reason": "Kham lan dau"
}
```

Booking validates doctor belongs to selected clinic and specialty. Duplicate `clinicId + doctorId + date + timeSlot` returns HTTP `409 Conflict`. Admin can list all appointments and update status. Doctor/staff can view appointments by doctor endpoint.

Schedule API:

```text
GET  /api/doctors/:doctorId/available-slots?date=2026-06-01
GET  /api/schedules
POST /api/schedules
PUT  /api/schedules/:id
```

Available slots is public for guest and patient. Schedule list/create/update requires admin or doctor/staff token.

Create schedule body:

```json
{
  "doctorId": "doctor_object_id",
  "clinicId": "clinic_object_id",
  "date": "2026-06-01",
  "workingHours": { "start": "08:00", "end": "11:00" },
  "slotDuration": 30,
  "isWorkingDay": true,
  "note": "Ca sang"
}
```

Available slots response:

```json
{
  "success": true,
  "message": "Available slots fetched successfully",
  "data": [
    { "timeSlot": "09:00-09:30", "available": false, "label": "Đã có người đặt" },
    { "timeSlot": "09:30-10:00", "available": true, "label": "Còn trống" }
  ]
}
```

If the doctor does not work that day:

```json
{
  "success": true,
  "message": "Bác sĩ không làm việc trong ngày này",
  "data": []
}
```

Clinic API response format:

```json
{
  "success": true,
  "message": "Clinics fetched successfully",
  "data": []
}
```

Admin-only Clinic endpoints require:

```http
Authorization: Bearer <admin_jwt_token>
```

Create Clinic body:

```json
{
  "name": "Ha Noi Clinic",
  "address": "12 Tran Duy Hung, Cau Giay, Ha Noi",
  "phone": "02430000001",
  "email": "hanoi@clinic.test",
  "description": "Phong kham da khoa tai Ha Noi.",
  "image": "/placeholder-clinic.svg",
  "workingHours": [
    { "dayOfWeek": "monday", "open": "08:00", "close": "17:00" }
  ]
}
```

Specialty API response format:

```json
{
  "success": true,
  "message": "Specialties fetched successfully",
  "data": []
}
```

Admin-only Specialty endpoints require:

```http
Authorization: Bearer <admin_jwt_token>
```

Create Specialty body:

```json
{
  "name": "Tim mach",
  "description": "Kham va theo doi cac benh ly tim mach.",
  "image": "/placeholder-specialty.svg",
  "clinicId": "clinic_object_id"
}
```

Seed specialty mẫu gồm `Tim mach`, `Da lieu`, `Nhi khoa`, `Tai mui hong`, được phân bổ khác nhau cho `Ha Noi Clinic`, `Bac Ninh Clinic`, `Hai Phong Clinic`.

Doctor API response format:

```json
{
  "success": true,
  "message": "Doctors fetched successfully",
  "data": []
}
```

Admin-only Doctor endpoints require:

```http
Authorization: Bearer <admin_jwt_token>
```

Create Doctor body:

```json
{
  "name": "BS. Nguyen Minh Khoa",
  "email": "doctor@clinic.test",
  "phone": "0901000001",
  "avatar": "/placeholder-doctor.svg",
  "degree": "Thac si, Bac si",
  "experienceYears": 8,
  "description": "Bac si tim mach.",
  "clinicId": "clinic_object_id",
  "specialtyId": "specialty_object_id",
  "workingDays": ["monday", "wednesday", "friday"],
  "workingHours": { "start": "08:00", "end": "17:00" }
}
```

Backend validate `clinicId` va `specialtyId` ton tai truoc khi tao doctor, validate `specialtyId` thuoc dung clinic, va chan trung email doctor.

## 6. Frontend

Frontend có:

- Responsive Bootstrap UI
- Navbar
- Card cơ sở, chuyên khoa, bác sĩ
- Chi tiết cơ sở và chi tiết bác sĩ
- Form chọn ngày, khung giờ và đặt lịch
- Trang lịch hẹn của patient
- Trang staff xem lịch trong ngày và cập nhật trạng thái
- Dashboard admin có sidebar

## 7. Cài đặt và chạy

Yêu cầu:

- Node.js 20+
- MongoDB local hoặc MongoDB Atlas

Backend:

```bash
cd backend
cp .env.example .env
# chỉnh MONGO_URI nếu không dùng MongoDB local
npm install
npm run seed
# Optional: add a richer graduation-demo dataset after the base seed
npm run seed:demo
npm run dev
```

Frontend:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Frontend runs at:

```text
http://localhost:5173
```

Main patient booking flow:

```text
/                         Home page
/clinics                  Clinic list
/clinics/:clinicId        Clinic detail with specialties and doctors
/clinics/:clinicId/doctors/:doctorId
                          Doctor detail, date picker, available slots, booking
/login                    Login
/register                 Register
/my-appointments          Patient appointment list
```

Frontend API config:

```env
VITE_API_URL=http://localhost:5000/api
```

If your backend is running on another port, update `frontend/.env` and restart `npm run dev`.

Admin test flow:

```text
1. Run backend and seed data:
   cd backend
   npm run seed
   npm run dev

2. Run frontend:
   cd frontend
   npm run dev

3. Login admin:
   email: admin@example.com
   password: 123456

4. Open admin area:
   http://localhost:5173/admin
```

Admin pages:

```text
/admin                 Dashboard statistics and recent appointments
/admin/clinics         Clinic CRUD
/admin/specialties     Specialty CRUD by clinic
/admin/doctors         Doctor CRUD with clinic/specialty selector
/admin/schedules       Doctor schedule create/update
/admin/appointments    Appointment list, filters, status update
```

Admin forms use Bootstrap tables and modal forms. Delete actions ask for browser confirmation before calling the API.

Tài khoản demo sau khi seed:

- Admin: `admin@example.com` / `123456`
- Doctor/Staff: `staff@example.com` / `123456`
- Patient: `patient@example.com` / `123456`
- Rich demo doctor: `demo.doctor01@clinic.test` / `123456`
- Rich demo patient: `demo.patient01@clinic.test` / `123456`

Auth redirect rules:

```text
admin   -> /admin
doctor  -> /doctor
patient -> returnUrl neu co, neu khong ve /
```

Frontend only stores these localStorage keys:

```text
token
user
```

Sau khi `npm run seed`, terminal backend sẽ in ra `Clinic ID`. Dùng ID này ở trang “Lịch hẹn của tôi” hoặc “Lịch khám trong ngày” nếu cần nhập thủ công.

## 8. Cấu hình email

Hệ thống gửi email xác nhận sau khi patient đặt lịch thành công bằng Nodemailer. Trong `backend/.env`, cấu hình SMTP:

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_user
SMTP_PASS=your_password
EMAIL_FROM="Clinic Booking <no-reply@example.com>"
```

Email xác nhận có subject:

```text
Xác nhận lịch khám bệnh
```

Nội dung email gồm tên bệnh nhân, bác sĩ, cơ sở, chuyên khoa, ngày khám, khung giờ, trạng thái lịch hẹn và lời nhắc đến đúng giờ.

Nếu chưa cấu hình đủ `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, backend vẫn tạo lịch hẹn và log:

```text
Email service skipped because SMTP is not configured
```

## 9. Upload ảnh Clinic và Doctor

Backend dùng Multer để upload ảnh thật lên server.

Thư mục lưu file:

```text
backend/uploads/clinics
backend/uploads/doctors
```

Backend serve static file tại:

```text
http://localhost:5000/uploads/...
```

Admin-only upload APIs:

```http
POST /api/uploads/clinic-image
POST /api/uploads/doctor-avatar
Authorization: Bearer <admin_jwt_token>
Content-Type: multipart/form-data
```

Field file bắt buộc:

```text
image
```

Response thành công:

```json
{
  "success": true,
  "message": "Upload ảnh thành công",
  "data": {
    "url": "/uploads/clinics/filename.jpg"
  }
}
```

Quy định file:

- Chỉ hỗ trợ `image/jpeg`, `image/png`, `image/webp`
- Tối đa `2MB`
- Sai định dạng trả `400`: `Chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP`
- Quá dung lượng trả `400`: `Ảnh không được vượt quá 2MB`

Frontend Admin:

- `/admin/clinics`: chọn file ảnh cơ sở, upload trước, preview ảnh, sau đó lưu URL vào field `image`.
- `/admin/doctors`: chọn file ảnh bác sĩ, upload trước, preview ảnh, sau đó lưu URL vào field `avatar`.

Khi hiển thị ảnh public, frontend tự đổi URL bắt đầu bằng `/uploads` thành backend base URL, ví dụ:

```text
/uploads/clinics/a.jpg -> http://localhost:5000/uploads/clinics/a.jpg
```

Nếu gửi email thành công, backend log:

```text
Email confirmation sent
```

Nếu gửi email lỗi, backend `console.error` lỗi nhưng vẫn trả response đặt lịch thành công, không rollback appointment.

## 9. Test Authentication bằng Postman

Base URL:

```text
http://localhost:5000
```

### Register

Request:

```http
POST /api/auth/register
Content-Type: application/json
```

Body:

```json
{
  "name": "Nguyen Van A",
  "email": "patient1@example.com",
  "password": "123456",
  "role": "patient"
}
```

Response thành công:

```json
{
  "success": true,
  "message": "Register successfully",
  "data": {
    "token": "jwt_token",
    "user": {
      "id": "user_id",
      "name": "Nguyen Van A",
      "email": "patient1@example.com",
      "role": "patient",
      "createdAt": "2026-05-27T00:00:00.000Z"
    }
  }
}
```

Validation cần kiểm tra:

- Email phải hợp lệ.
- Email không được trùng.
- Password tối thiểu 6 ký tự.
- Role chỉ gồm `patient`, `doctor`, `admin`.

### Login

Request:

```http
POST /api/auth/login
Content-Type: application/json
```

Body:

```json
{
  "email": "patient1@example.com",
  "password": "123456"
}
```

Response trả về `data.token`. Copy token này để test API cần đăng nhập.

### Me

Request:

```http
GET /api/auth/me
Authorization: Bearer <jwt_token>
```

Response:

```json
{
  "success": true,
  "message": "Authenticated user",
  "data": {
    "user": {
      "id": "user_id",
      "name": "Nguyen Van A",
      "email": "patient1@example.com",
      "role": "patient",
      "createdAt": "2026-05-27T00:00:00.000Z"
    }
  }
}
```
