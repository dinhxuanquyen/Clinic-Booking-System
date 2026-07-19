# 08 - Presentation Script

## Muc Tieu Trinh Bay

Chung minh he thong Clinic Booking ho tro day du vong doi dat lich kham:

1. Benh nhan dat lich.
2. Bac si xu ly kham.
3. Tao ho so kham.
4. Benh nhan xem ket qua va PDF.
5. Admin giam sat van hanh.

## Chuan Bi

Chay backend:

```powershell
cd backend
npm run dev
```

Chay frontend:

```powershell
cd frontend
npm run dev
```

Tai khoan:

- Admin: `admin@example.com / 123456`
- Doctor: `doctor01@clinic.test / 123456`
- Patient: `patient01@clinic.test / 123456`

## Flow 1 - Patient Booking

1. Dang nhap Patient.
2. Vao Dat lich kham.
3. Chon co so, chuyen khoa, bac si, ngay va slot.
4. Nhap ly do kham.
5. Xac nhan dat lich.
6. Mo MyAppointments de xem lich moi.

Thong diep can nhan manh:

- He thong kiem tra slot.
- Co trang thai lich hen ro rang.
- Co PDF phieu dat lich va phieu kham.

## Flow 2 - Doctor Operation

1. Dang nhap Doctor.
2. Xem Doctor Dashboard.
3. Mo Hang doi kham.
4. Chuyen lich tu cho xac nhan sang da xac nhan/dang kham.
5. Tao ho so kham.
6. Hoan thanh lich.

Thong diep can nhan manh:

- Doctor co dashboard van hanh rieng.
- Co quy trinh lich hen ro rang.
- Ho so kham co chan doan, ket luan, don thuoc, tai kham.

## Flow 3 - Patient Medical Records

1. Dang nhap Patient.
2. Vao Ho so kham benh.
3. Mo chi tiet ho so.
4. Tai PDF ket qua kham.
5. In ho so neu can.

Thong diep can nhan manh:

- PDF ket qua kham chuyen nghiep.
- Thong tin nhay cam duoc gioi han theo quyen.

## Flow 4 - Admin Dashboard

1. Dang nhap Admin.
2. Vao Dashboard.
3. Xem tong quan van hanh, task center, analytics.
4. Mo danh sach lich hen can xu ly.
5. Mo audit log.

Thong diep can nhan manh:

- Admin co goc nhin toan he thong.
- Co audit log va thong ke phuc vu quan tri.

## Flow 5 - Waiting List / Reschedule

1. Patient gui yeu cau doi lich hoac vao waiting list.
2. Doctor/Admin xem yeu cau can xu ly.
3. Xu ly va cap nhat trang thai.

## Ket Bai Trinh Bay

Tom tat:

- 3 vai tro ro rang.
- Nghiep vu dat lich - kham - ho so - PDF da lien ket.
- UI/UX da polish theo huong san pham.
- Co sample dataset, smoke test va tai lieu bao ve.
