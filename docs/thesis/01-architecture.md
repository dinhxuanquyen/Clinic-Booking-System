# 01 - Architecture

## Tong quan

Clinic Booking la he thong dat lich kham truc tuyen gom 3 cong thong tin:

- Patient Portal: dat lich, quan ly lich hen, ho so kham, tai PDF, danh gia bac si.
- Doctor Portal: dashboard van hanh, hang doi kham, xu ly lich hen, tao ho so kham, quan ly lich lam viec.
- Admin Portal: quan tri co so, chuyen khoa, bac si, lich hen, goi kham, bai viet, audit log.

## Technology Stack

Frontend:

- React 19
- React Router
- TanStack React Query
- Axios
- Socket.IO Client
- Recharts
- Vite

Backend:

- Node.js
- Express
- Mongoose
- MongoDB
- Socket.IO
- PDFKit
- Nodemailer
- JWT Authentication

## System Context

```mermaid
flowchart LR
  Patient["Patient Browser"] --> Frontend["React Frontend"]
  Doctor["Doctor Browser"] --> Frontend
  Admin["Admin Browser"] --> Frontend
  Frontend --> API["Express REST API"]
  Frontend <--> Socket["Socket.IO Realtime"]
  API --> Mongo["MongoDB"]
  API --> PDF["PDFKit Service"]
  API --> Email["Email Service"]
  API --> Uploads["Uploads Storage"]
  Socket --> API
```

## Backend Layers

```mermaid
flowchart TD
  Route["Routes"] --> Middleware["Auth / Role / Validate Middleware"]
  Middleware --> Controller["Controllers"]
  Controller --> Service["Services"]
  Service --> Model["Mongoose Models"]
  Model --> DB["MongoDB"]
  Service --> PDF["PDF Service"]
  Service --> Mail["Email Service"]
  Service --> Socket["Socket Service"]
```

## Frontend Layers

```mermaid
flowchart TD
  App["App Routes"] --> Layout["Public / Doctor / Admin Layouts"]
  Layout --> Pages["Pages"]
  Pages --> Components["Reusable Components"]
  Pages --> APIClient["Axios API Client"]
  Components --> Utils["Status / DateTime / Download Utils"]
  APIClient --> Backend["Backend API"]
  Pages <--> SocketClient["Socket Client"]
```

## Security Model

- JWT dung cho xac thuc API.
- `ProtectedRoute` bao ve route frontend theo role.
- Backend middleware `authMiddleware` va `roleMiddleware` bao ve endpoint.
- Doctor chi xu ly lich hen thuoc bac si do.
- Patient chi xem lich hen, ho so, PDF cua chinh minh.
- Admin co quyen quan tri va xem audit log.

## Realtime Model

- Socket.IO phat notification theo user hoac role.
- Cac thay doi lich hen, huy lich, doi lich, ho so kham co the cap nhat UI thong qua notification/status refresh.

## PDF Model

PDF duoc render o backend bang PDFKit:

- Appointment confirmation document.
- Queue ticket.
- Medical record result PDF.

Frontend tai PDF qua API va lay filename tu `Content-Disposition`.
