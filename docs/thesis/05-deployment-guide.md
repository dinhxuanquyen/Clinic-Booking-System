# 05 - Deployment Guide

## Yeu Cau Moi Truong

- Node.js 20+
- MongoDB 7+
- npm
- Git

## Cau Truc Thu Muc

```text
clinic-booking/
  backend/
  frontend/
  uploads/
  docs/
```

## Backend Setup

```powershell
cd backend
npm install
copy .env.example .env
npm run seed
npm run seed:demo
npm run dev
```

Backend mac dinh chay tai:

```text
http://localhost:5000
```

Health check:

```text
GET /health
```

## Frontend Setup

```powershell
cd frontend
npm install
npm run dev
```

Frontend mac dinh chay tai:

```text
http://localhost:5173
```

## Bien Moi Truong Backend

Can cau hinh trong `.env`:

```text
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/clinic-booking
JWT_SECRET=your-secret
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

## Tai Khoan Demo

Sau khi chay `npm run seed:demo`:

- Admin: `admin@example.com / 123456`
- Doctor: `demo.doctor01@clinic.test / 123456`
- Patient: `demo.patient01@clinic.test / 123456`

## Len Production

Checklist:

- Doi `JWT_SECRET`.
- Doi MongoDB URI sang production.
- Cau hinh SMTP that.
- Cau hinh reverse proxy HTTPS.
- Gan `FRONTEND_URL` dung domain.
- Bao ve thu muc uploads.
- Chay seed co kiem soat, khong chay demo seed tren production that.

## Backup

Khuyen nghi backup MongoDB hang ngay:

```powershell
mongodump --uri "mongodb://127.0.0.1:27017/clinic-booking" --out backups/
```

## Rollback

- Giu lai ban build frontend gan nhat.
- Backup database truoc khi deploy.
- Neu deployment loi, restore build cu va backup database gan nhat.
