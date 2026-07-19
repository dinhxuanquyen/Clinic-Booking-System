# 03 - Use Cases

## Actors

- Guest: nguoi dung chua dang nhap.
- Patient: benh nhan.
- Doctor: bac si.
- Admin: quan tri vien.

## Guest

### UC01 - Xem thong tin cong khai

Muc tieu: tim co so, chuyen khoa, bac si, goi kham, bai viet.

Luon chinh:

1. Guest truy cap trang cong khai.
2. He thong hien danh sach va bo loc.
3. Guest xem chi tiet bac si/co so/chuyen khoa/goi kham.

### UC02 - Dang ky / Dang nhap

1. Guest dang ky tai khoan.
2. He thong gui OTP email.
3. Guest xac thuc OTP.
4. Guest dang nhap va vao Patient Portal.

## Patient

### UC03 - Dat lich kham

1. Patient chon co so, chuyen khoa, bac si, ngay va khung gio.
2. Patient nhap ly do kham va thong tin BHYT neu co.
3. He thong kiem tra slot.
4. Tao appointment trang thai `pending`.
5. Gui notification/email cho cac ben lien quan.

### UC04 - Quan ly lich hen

1. Patient xem danh sach lich hen.
2. Patient xem chi tiet lich hen.
3. Patient tai phieu dat lich, phieu kham/so thu tu, ket qua PDF neu co.
4. Patient gui yeu cau huy hoac doi lich neu du dieu kien.

### UC05 - Xem ho so kham

1. Patient vao Ho so kham benh.
2. He thong hien lich su chan doan, don thuoc, tai kham.
3. Patient xem chi tiet, in/tai PDF ket qua kham.

### UC06 - Danh gia bac si

1. Patient chon lich da hoan thanh.
2. Gui so sao va nhan xet.
3. He thong chan danh gia trung lich hen.

## Doctor

### UC07 - Xu ly hang doi kham

1. Doctor xem hang doi hom nay.
2. Doctor xac nhan, bat dau kham, hoan thanh hoac danh dau khong den.
3. He thong cap nhat trang thai appointment va notification.

### UC08 - Tao ho so kham

1. Doctor mo lich dang kham.
2. Nhap trieu chung, chan doan, ket luan, don thuoc, tai kham.
3. He thong tao MedicalRecord va hoan thanh appointment.

### UC09 - Quan ly lich lam viec

1. Doctor cau hinh lich mac dinh.
2. Doctor tao ngoai le ngay nghi/doi ca.
3. Calendar view hien lich thuc te.

## Admin

### UC10 - Quan tri danh muc

Admin quan ly co so, chuyen khoa, bac si, lich, goi kham, bai viet.

### UC11 - Xu ly yeu cau van hanh

Admin xem dashboard, lich cho xac nhan, yeu cau huy, doi lich, waiting list.

### UC12 - Giam sat he thong

Admin xem audit log, thong ke dashboard, status distribution va hoat dong gan day.
