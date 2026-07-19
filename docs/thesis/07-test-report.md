# 07 - Test Report

## Test Objective

Kiem thu cac luong nghiep vu cot loi cua Clinic Booking truoc khi bao ve do an.

## Automated Smoke Test

Command:

```powershell
$env:NODE_ENV='test'
node backend/src/scripts/e2eSmokeTest.js
```

Ket qua gan nhat:

- Passed: 24/24
- Failed: 0/24

## Covered Flows

- Dang nhap doctor lan dau va `mustChangePassword`.
- Chan mat khau yeu.
- Dang ky patient, verify OTP, dang nhap.
- OTP cooldown.
- Forgot password cooldown.
- Doctor doi mat khau ban dau.
- Patient dat lich.
- Chan dat trung slot.
- Chan dat lich qua khu.
- Doctor khong duoc xu ly lich cua bac si khac.
- Workflow appointment: pending -> confirmed -> in_progress.
- Chan workflow sai: confirmed -> completed truc tiep.
- Tao MedicalRecord va complete appointment.
- Chan tao trung MedicalRecord.
- Patient permission khi xem ho so.
- Permission khi tai PDF ho so kham.
- Review sau kham va chan review trung.
- Waiting list join, duplicate, ownership.
- Appointment PDF va queue ticket PDF.
- Notification persistence.
- Audit log accessible.
- Doctor appointment status filter.

## Manual Browser QA Checklist

### Patient

- Login patient demo.
- Xem MyAppointments.
- Xem chi tiet lich hen.
- Tai phieu dat lich.
- Tai phieu kham/so thu tu.
- Doi lich, huy lich neu du dieu kien.
- Xem MedicalRecords.
- Tai PDF ket qua kham.
- Gui review bac si cho lich da hoan thanh.

### Doctor

- Login doctor demo.
- Xem dashboard.
- Xem hang doi.
- Xu ly appointment.
- Tao medical record.
- Xem lich lam viec.
- Xem review.

### Admin

- Login admin.
- Xem dashboard.
- Quan ly co so, chuyen khoa, bac si.
- Xem appointment.
- Xu ly yeu cau huy/doi lich.
- Xem audit log.

## Responsive QA Matrix

Can test:

- 375px
- 430px
- 768px
- 1024px
- 1366px
- 1440px

Checklist:

- Khong horizontal scroll.
- Khong double scroll trong modal.
- Button khong tran.
- Badge khong vo.
- Table co overflow xu ly hop ly.
- Sidebar khong che noi dung.
- Sticky header khong che section dau.

## Known Environment Notes

- Trong `NODE_ENV=test`, email sending duoc skip de tranh phu thuoc SMTP/network.
- Console co the hien stack trace cua negative test case; day la expected neu summary van pass.
