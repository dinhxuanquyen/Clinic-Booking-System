# Follow-up Management - Phase 1 to Phase 9

Tài liệu này ghi lại phạm vi đã hoàn thiện cho module tái khám trong Clinic Booking. Mục tiêu là giúp trình bày, kiểm thử và bảo trì nghiệp vụ tái khám mà không làm thay đổi luồng đặt lịch thường.

## 1. Mục tiêu nghiệp vụ

- Bác sĩ có thể chỉ định bệnh nhân cần tái khám khi tạo hồ sơ khám bệnh.
- Bác sĩ có thể chọn ngày tái khám khuyến nghị hoặc chỉ định tái khám nhưng để bệnh nhân tự chọn ngày.
- Bệnh nhân nhìn thấy các hồ sơ cần tái khám trong khu vực hồ sơ khám bệnh.
- Bệnh nhân đặt lịch tái khám từ hồ sơ cũ, hệ thống giữ liên kết với `followUpRecordId`.
- Bác sĩ theo dõi được bệnh nhân đã đặt tái khám, quá hạn tái khám hoặc đã hoàn thành tái khám.
- Hệ thống tự nhắc tái khám, đánh dấu quá hạn và cập nhật realtime.

## 2. Trạng thái tái khám

Các trạng thái nằm trong `backend/src/constants/followUpStatus.js`:

- `none`: Hồ sơ không yêu cầu tái khám.
- `recommended`: Bác sĩ khuyến nghị tái khám, bệnh nhân chưa đặt lịch tái khám.
- `scheduled`: Bệnh nhân đã đặt lịch tái khám và lịch còn hiệu lực.
- `completed`: Lịch tái khám đã hoàn thành.
- `overdue`: Quá ngày tái khám khuyến nghị nhưng chưa có lịch tái khám hiệu lực.

## 3. Luồng chuẩn

1. Bác sĩ khám bệnh và tạo Medical Record.
2. Nếu cần tái khám, hệ thống lưu:
   - `followUpRequired = true`
   - `followUpDate = ngày khuyến nghị` hoặc `null`
   - `followUpStatus = recommended`
3. Patient mở `/medical-records` và thấy mục “Tái khám cần xử lý”.
4. Patient bấm đặt tái khám.
5. BookingPage nhận `followUpRecordId`, tự điền cơ sở, chuyên khoa, bác sĩ và ngày nếu có.
6. Patient chọn khung giờ và xác nhận.
7. Appointment mới được tạo với:
   - `isFollowUp = true`
   - `followUpRecordId`
   - `originalAppointmentId`
8. Medical Record gốc chuyển `followUpStatus = scheduled`.
9. Khi lịch tái khám hoàn thành, record chuyển `completed`.

## 4. Edge cases Phase 9

### Bác sĩ không chọn ngày tái khám

- `followUpDate = null`.
- Patient vẫn đặt lịch tái khám được.
- BookingPage tự điền bác sĩ, cơ sở, chuyên khoa và dùng ngày hiện tại làm ngày bắt đầu.
- Patient được tự chọn ngày và khung giờ phù hợp.

### Bác sĩ có chọn ngày nhưng ngày đó hết slot

- BookingPage prefill ngày khuyến nghị.
- Nếu ngày đó hết slot, patient được đổi sang ngày khác.
- `followUpRecordId` vẫn được gửi khi submit, nên liên kết với hồ sơ gốc không mất.

### Patient đặt tái khám rồi hủy

- Nếu lịch tái khám `pending` bị hủy trực tiếp, hệ thống sync record về:
  - `recommended` nếu chưa quá hạn.
  - `overdue` nếu đã qua ngày khuyến nghị.
- Nếu lịch tái khám `confirmed` chuyển thành `cancel_requested`, record chưa đổi ngay vì lịch chưa bị hủy thật.
- Khi bác sĩ/admin duyệt hủy và appointment thành `cancelled`, record mới quay về `recommended` hoặc `overdue`.
- Nếu lịch tái khám bị `no_show`, record cũng quay về `recommended` hoặc `overdue`.

### Patient đặt tái khám với bác sĩ khác

- Mặc định hệ thống khóa theo bác sĩ đã chỉ định trong hồ sơ.
- Nếu bác sĩ cũ vẫn hoạt động, patient không được đổi bác sĩ.
- Nếu bác sĩ cũ đã xóa hoặc ngừng hoạt động, patient được chọn bác sĩ khác cùng cơ sở và chuyên khoa.
- Đây là ngoại lệ vận hành để bệnh nhân vẫn được tiếp tục chăm sóc.

### Bác sĩ xóa hoặc ngừng hoạt động

- BookingPage hiển thị cảnh báo cho patient.
- Hệ thống không tự chọn bác sĩ thay thế.
- Patient phải chủ động chọn bác sĩ khác cùng chuyên khoa.
- Backend chỉ cho phép bác sĩ thay thế nếu cùng clinic và specialty với hồ sơ gốc.

## 5. API đã hỗ trợ

### Patient

- `GET /api/medical-records/my`
- `GET /api/medical-records/my/follow-ups`
- `GET /api/medical-records/follow-ups/my`
- `GET /api/medical-records/:id`
- `POST /api/appointments` với `followUpRecordId`

### Doctor

- `GET /api/doctor/medical-records`
- Query hỗ trợ:
  - `followUpOnly=true`
  - `followUpStatus=recommended|scheduled|completed|overdue`
  - `followUpFrom`
  - `followUpTo`

## 6. Realtime, notification, email

### Events

- `follow-up:updated`: gửi cho patient và doctor liên quan.
- `appointment:updated`: gửi khi appointment tái khám đổi trạng thái.
- `notification:new`: gửi khi có notification tái khám.

### Notification types

- `follow_up_recommended`
- `follow_up_due_soon`
- `follow_up_overdue`

### Email

- Email nhắc sắp đến ngày tái khám.
- Email báo quá hạn tái khám.
- Không gửi email nếu không có địa chỉ phù hợp; lỗi email không làm hỏng API chính.

## 7. Job tự động

Service: `backend/src/services/followUpService.js`

- Chạy khi server start.
- Lặp lại mỗi 1 giờ.
- Đồng bộ lịch tái khám đã đặt.
- Đánh dấu quá hạn nếu qua ngày khuyến nghị.
- Gửi nhắc tái khám trong vòng 24 giờ trước ngày khuyến nghị.

Script sửa dữ liệu cũ:

- `backend/src/scripts/syncFollowUpStatuses.js`

## 8. UI đã hỗ trợ

### Patient

- `/medical-records` có danh sách hồ sơ khám và section tái khám cần xử lý.
- MedicalRecordDetailModal có kế hoạch tái khám và CTA đặt lịch.
- BookingPage có banner mode tái khám.
- MyAppointments hiển thị badge “Lịch tái khám”.
- AppointmentDetailModal hiển thị liên kết hồ sơ gốc của lịch tái khám.

### Doctor

- `/doctor/medical-records` có bộ lọc trạng thái tái khám.
- Summary card cho:
  - cần đặt
  - quá hạn
  - đã đặt
  - chưa có ngày
  - đã hoàn thành
- Realtime cập nhật khi patient đặt/hủy/no-show lịch tái khám.

## 9. Checklist kiểm thử trình bày

### Case 1 - Có ngày tái khám

1. Doctor tạo hồ sơ, bật tái khám và chọn ngày.
2. Patient mở hồ sơ.
3. BookingPage tự điền ngày khuyến nghị.
4. Patient chọn slot và đặt lịch.
5. Hồ sơ gốc chuyển “Đã đặt lịch tái khám”.

### Case 2 - Không có ngày tái khám

1. Doctor tạo hồ sơ, bật tái khám nhưng không chọn ngày.
2. Patient mở hồ sơ.
3. BookingPage cho patient tự chọn ngày.
4. Đặt lịch thành công và vẫn liên kết `followUpRecordId`.

### Case 3 - Ngày khuyến nghị hết slot

1. Doctor chọn ngày tái khám.
2. Patient mở BookingPage, thấy ngày được điền sẵn.
3. Nếu không còn slot, patient đổi ngày khác.
4. Đặt lịch thành công.

### Case 4 - Hủy lịch tái khám

1. Patient đặt lịch tái khám.
2. Patient hủy khi lịch còn pending.
3. Hồ sơ gốc quay lại “Cần đặt tái khám” hoặc “Quá hạn”.

### Case 5 - Bác sĩ cũ ngừng hoạt động

1. Admin khóa/ngừng hoạt động bác sĩ đã chỉ định.
2. Patient mở link đặt tái khám.
3. BookingPage cảnh báo chọn bác sĩ khác cùng chuyên khoa.
4. Patient chọn bác sĩ khác cùng clinic/specialty và đặt lịch.

### Case 6 - Quá hạn tái khám

1. Hồ sơ có `followUpDate` trong quá khứ và chưa có lịch tái khám.
2. Job chạy.
3. Hồ sơ chuyển `overdue`.
4. Patient nhận notification.
5. Doctor thấy trong tab/quẻ “Quá hạn”.

## 10. Lưu ý bảo trì

- Không đổi `followUpRecordId` trong BookingPage khi user đổi ngày hoặc slot.
- Không cho đổi clinic/specialty khi đặt tái khám vì đây là ràng buộc hồ sơ gốc.
- Chỉ mở đổi doctor khi bác sĩ cũ không còn hoạt động.
- Khi appointment tái khám chuyển `cancelled` hoặc `no_show`, luôn gọi `syncFollowUpStatusForAppointment`.
- Khi appointment tái khám chuyển `completed`, record gốc phải chuyển `completed`.
