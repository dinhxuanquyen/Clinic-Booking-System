# KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN

Trong suốt quá trình thực hiện đồ án, tôi đã xây dựng được hệ thống "Ứng dụng đặt lịch khám bệnh cho phòng khám nhỏ" nhằm hỗ trợ số hóa quy trình đặt lịch, quản lý lượt khám và theo dõi hồ sơ khám bệnh. Hệ thống được phát triển theo mô hình ứng dụng web với frontend sử dụng ReactJS, backend sử dụng Node.js/Express và cơ sở dữ liệu MongoDB. Các chức năng được tổ chức theo ba nhóm vai trò chính gồm bệnh nhân, bác sĩ và quản trị viên, qua đó đáp ứng được các nghiệp vụ cơ bản của một phòng khám nhỏ.

Đối với bệnh nhân, hệ thống hỗ trợ xem thông tin cơ sở khám, chuyên khoa, bác sĩ, gói khám, bài viết sức khỏe, tư vấn triệu chứng bằng AI ở mức tham khảo, đặt lịch khám, quản lý lịch hẹn cá nhân, gửi yêu cầu đổi hoặc hủy lịch, xem hồ sơ khám bệnh và tải các phiếu PDF liên quan. Đối với bác sĩ, hệ thống cung cấp khu vực làm việc riêng để theo dõi dashboard, xem lịch hẹn, xử lý hàng đợi khám, cập nhật trạng thái lượt khám và tạo hồ sơ khám bệnh với các thông tin như triệu chứng, sinh hiệu, chẩn đoán, đơn thuốc, lời dặn, tệp đính kèm và kế hoạch tái khám. Đối với quản trị viên, hệ thống hỗ trợ quản lý cơ sở khám, chuyên khoa, bác sĩ, tài khoản, lịch làm việc, gói khám, bài viết, lịch hẹn, hàng đợi và nhật ký hệ thống.

Một kết quả quan trọng của đồ án là thiết kế được cơ chế quản lý lịch hẹn theo trạng thái. Lịch hẹn được kiểm soát qua các trạng thái như chờ xác nhận, đã xác nhận, đang khám, hoàn thành, đã hủy, không đến khám, yêu cầu hủy và yêu cầu đổi lịch. Cách tổ chức này giúp hạn chế thao tác sai luồng, tránh trùng khung giờ, hỗ trợ danh sách chờ khi có slot trống và tạo nền tảng cho các chức năng liên quan như hàng đợi khám, thông báo, xuất PDF và hồ sơ khám bệnh.

Ngoài các chức năng nghiệp vụ chính, hệ thống đã tích hợp một số thành phần hỗ trợ như xác thực và phân quyền bằng JWT, ProtectedRoute ở frontend, middleware kiểm tra vai trò ở backend, thông báo realtime bằng Socket.IO, gửi email, upload tệp, xuất PDF và kiểm thử smoke test cho các luồng quan trọng. Kết quả kiểm thử cho thấy các chức năng cốt lõi đã hoạt động ổn định ở mức cơ bản, đáp ứng được mục tiêu đề ra trong phạm vi đồ án.

Tuy nhiên, do giới hạn về thời gian và phạm vi thực hiện, hệ thống vẫn còn một số hạn chế. Chức năng thanh toán trực tuyến, hóa đơn điện tử và quản lý doanh thu chưa được triển khai. Phần thống kê mới dừng ở mức tổng quan, chưa có các báo cáo phân tích chuyên sâu như hiệu suất bác sĩ, tỷ lệ hủy lịch, tỷ lệ bệnh nhân không đến khám hoặc xu hướng đặt lịch theo thời gian. Hệ thống cũng chưa tích hợp với các dịch vụ bên ngoài như bảo hiểm y tế, SMS, Zalo OA, cổng thanh toán hoặc hệ thống hồ sơ bệnh án điện tử chuẩn hóa. Về bảo mật, hệ thống mới đáp ứng các yêu cầu cơ bản như xác thực, phân quyền và kiểm tra dữ liệu đầu vào, chưa triển khai các cơ chế nâng cao như xác thực hai lớp, mã hóa dữ liệu nhạy cảm hoặc giám sát bất thường.

Thông qua quá trình thực hiện đồ án, tôi đã củng cố được kiến thức về phân tích nghiệp vụ, thiết kế cơ sở dữ liệu, xây dựng RESTful API, phát triển giao diện ReactJS, tổ chức phân quyền, xử lý trạng thái nghiệp vụ, kiểm thử phần mềm và triển khai hệ thống web. Bên cạnh kiến thức kỹ thuật, tôi cũng nhận thấy tầm quan trọng của việc thiết kế quy trình rõ ràng, kiểm thử thường xuyên và đặt trải nghiệm người dùng vào trung tâm khi xây dựng một ứng dụng phục vụ lĩnh vực y tế.

Trong thời gian tới, hệ thống có thể tiếp tục được hoàn thiện và mở rộng theo một số hướng sau:

- Bổ sung thanh toán trực tuyến, hóa đơn điện tử và quản lý doanh thu cho phòng khám.
- Tích hợp SMS, Zalo OA hoặc thông báo đẩy để nhắc lịch khám, đổi lịch, hủy lịch và tái khám.
- Nâng cấp dashboard với các báo cáo về lượt khám, hiệu suất bác sĩ, tỷ lệ hủy lịch và xu hướng đặt lịch.
- Mở rộng hồ sơ khám bệnh theo hướng gần với hồ sơ bệnh án điện tử, bổ sung xét nghiệm, chỉ định cận lâm sàng và lịch sử điều trị.
- Tăng cường bảo mật bằng xác thực hai lớp, mã hóa dữ liệu nhạy cảm, sao lưu tự động và giám sát truy cập bất thường.
- Phát triển AI ở mức hỗ trợ như gợi ý chuyên khoa, tóm tắt lịch sử khám hoặc hỗ trợ bác sĩ soạn thảo hồ sơ.
- Hoàn thiện kiểm thử tự động và tối ưu triển khai production bằng CI/CD, quản lý log, tác vụ nền và tối ưu chỉ mục MongoDB.

Nhìn chung, đồ án đã đạt được mục tiêu xây dựng một ứng dụng web hỗ trợ đặt lịch khám bệnh cho phòng khám nhỏ với các chức năng có tính ứng dụng thực tế. Mặc dù còn một số hạn chế cần tiếp tục hoàn thiện, hệ thống đã tạo được nền tảng quan trọng để phát triển thành một giải pháp quản lý lịch khám, hồ sơ khám bệnh và chăm sóc bệnh nhân toàn diện hơn trong tương lai.
