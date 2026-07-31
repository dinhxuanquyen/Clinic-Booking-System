import copy
import os
import zipfile
import xml.etree.ElementTree as ET

NS = {
    "w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
    "wp14": "http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing",
    "wp": "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing",
    "w10": "urn:schemas-microsoft-com:office:word",
    "w14": "http://schemas.microsoft.com/office/word/2010/wordml",
}

for prefix, uri in NS.items():
    ET.register_namespace(prefix, uri)

W = f"{{{NS['w']}}}"


def paragraph_text(paragraph):
    return "".join(node.text or "" for node in paragraph.findall(".//w:t", NS)).strip()


def clone_with_text(template, text):
    paragraph = copy.deepcopy(template)
    p_pr = paragraph.find("w:pPr", NS)
    for child in list(paragraph):
        if child is not p_pr:
            paragraph.remove(child)

    run = ET.SubElement(paragraph, W + "r")
    template_run = template.find("w:r", NS)
    if template_run is not None:
        template_r_pr = template_run.find("w:rPr", NS)
        if template_r_pr is not None:
            run.append(copy.deepcopy(template_r_pr))

    text_node = ET.SubElement(run, W + "t")
    text_node.text = text
    if text.startswith(" ") or text.endswith(" "):
        text_node.set("{http://www.w3.org/XML/1998/namespace}space", "preserve")
    return paragraph


def find_body_paragraphs(root):
    body = root.find(".//w:body", NS)
    paragraphs = [child for child in list(body) if child.tag == W + "p"]
    return body, paragraphs


def remove_after_marker(body, marker_text):
    found = False
    for index, child in enumerate(list(body)):
        if child.tag == W + "p" and paragraph_text(child) == marker_text:
            found = True
            start = index + 1
            break
    if not found:
        raise RuntimeError(f"Marker not found: {marker_text}")

    for child in list(body)[start:]:
        if child.tag != W + "sectPr":
            body.remove(child)


def insert_after_marker(body, marker_text, new_paragraphs):
    for index, child in enumerate(list(body)):
        if child.tag == W + "p" and paragraph_text(child) == marker_text:
            insert_at = index + 1
            break
    else:
        raise RuntimeError(f"Marker not found: {marker_text}")

    for offset, paragraph in enumerate(new_paragraphs):
        body.insert(insert_at + offset, paragraph)


def main():
    input_path = r"C:\Users\DELL\Documents\Codex\2026-05-27\clinic-booking\22010342_Dinh_Xuan_Quyen_4_5.docm"
    output_path = r"C:\Users\DELL\Documents\Codex\2026-05-27\clinic-booking\22010342_Dinh_Xuan_Quyen_4_6_rich_clean.docm"
    marker = "4.6. Xây dựng ứng dụng và kết quả đạt được"

    content = [
        ("body", "Giai đoạn xây dựng ứng dụng đã biến toàn bộ phân tích nghiệp vụ, thiết kế dữ liệu, thiết kế API và thiết kế luồng trình tự thành một hệ thống web hoàn chỉnh. Ứng dụng được tổ chức thành ba lớp chính: frontend ReactJS, backend Node.js/Express và cơ sở dữ liệu MongoDB. Trên nền đó, hệ thống còn tích hợp email, thông báo realtime, upload tệp, xuất PDF, đánh giá bác sĩ, hàng chờ khám, nhật ký hệ thống và tư vấn triệu chứng bằng AI."),
        ("body", "Kết quả xây dựng ứng dụng cho thấy các màn hình giao diện và API không tồn tại rời rạc mà liên kết trực tiếp với nhau theo từng vai trò sử dụng. Khách truy cập và bệnh nhân đi qua các màn hình công khai để tra cứu và đặt lịch; bác sĩ sử dụng cổng làm việc riêng để xử lý hàng đợi và lập hồ sơ; quản trị viên thao tác trên khu vực quản trị để quản lý dữ liệu nền và giám sát vận hành."),
        ("body", "Tên ảnh đề xuất: Hinh_4_19_Tong_quan_trang_chu_va_dieu_huong_he_thong.png"),
        ("body", "Nhóm chức năng xác thực đã hoàn thiện đầy đủ các luồng đăng ký tài khoản, xác thực email bằng OTP, đăng nhập, lấy thông tin người dùng hiện tại, quên mật khẩu, đặt lại mật khẩu, đổi mật khẩu và đổi mật khẩu bắt buộc trong lần đăng nhập đầu tiên. Các API tương ứng được triển khai qua /api/auth/register, /api/auth/verify-email, /api/auth/login, /api/auth/forgot-password, /api/auth/reset-password, /api/auth/change-initial-password, /api/auth/change-password và /api/auth/me."),
        ("body", "Trên giao diện, các màn hình Login, Register, ForgotPassword, ChangeInitialPassword và Profile được liên kết với bộ xử lý xác thực để tạo trải nghiệm thống nhất. Backend dùng bcrypt để mã hóa mật khẩu, JWT để duy trì phiên đăng nhập và express-validator để kiểm tra dữ liệu đầu vào. Khi người dùng đăng nhập thành công, frontend điều hướng theo vai trò patient, doctor hoặc admin."),
        ("body", "Phần phân quyền được tổ chức chặt chẽ ở cả hai lớp giao diện và máy chủ. Backend sử dụng auth middleware và role middleware để giới hạn quyền truy cập, còn frontend sử dụng ProtectedRoute và các layout chuyên biệt để tách khu vực công khai, khu vực bệnh nhân, khu vực bác sĩ và khu vực quản trị. Nhờ đó, các trang như DoctorDashboardPage, AdminDashboard hay trang hồ sơ cá nhân chỉ hiện đúng với nhóm người dùng được phép."),
        ("body", "Tên ảnh đề xuất: Hinh_4_20_Man_hinh_dang_nhap_dang_ky_va_xac_thuc_OTP.png"),
        ("body", "Tên ảnh đề xuất: Hinh_4_21_Man_hinh_doi_mat_khau_lan_dau_cua_bac_si.png"),
        ("body", "Khối giao diện công khai đã được triển khai đầy đủ gồm HomePage, BookingPage, ClinicsPage, ClinicDetail, DoctorsPage, DoctorDetail, SpecialtiesPage, SpecialtyDetailPage, PackagesPage, PackageDetailPage, ArticlesPage, ArticleDetailPage và SymptomCheckerPage. Những màn hình này dùng các API công khai như /api/clinics, /api/clinics/:clinicId, /api/doctors, /api/doctors/:doctorId, /api/specialties, /api/specialties/:specialtyId, /api/service-packages, /api/articles, /api/available-slots và /api/ai/symptom-checker để người dùng có thể tra cứu trước khi đặt lịch."),
        ("body", "Chức năng đặt lịch là trung tâm của phía bệnh nhân. Người dùng chọn cơ sở, chuyên khoa, bác sĩ, ngày khám và khung giờ còn trống, sau đó gửi request đến /api/appointments. Backend kiểm tra lịch trùng, slot trùng, lịch trong quá khứ, điều kiện tái khám và dữ liệu liên quan đến danh sách chờ trước khi tạo lịch. Màn hình MyAppointments cho phép theo dõi lịch sắp tới, lịch hôm nay và lịch sử khám, đồng thời hỗ trợ tải phiếu đặt lịch, phiếu số thứ tự, đổi lịch, hủy lịch và xem chi tiết."),
        ("body", "Trang MedicalRecordsPage và các modal chi tiết giúp bệnh nhân xem lại toàn bộ kết quả khám bệnh. Dữ liệu được lấy từ /api/medical-records/my, /api/medical-records/:id, /api/medical-records/:id/pdf và /api/appointments/:id/pdf. Tại đây bệnh nhân có thể xem chẩn đoán, chỉ số sinh tồn, đơn thuốc, lời dặn, tệp đính kèm và kế hoạch tái khám. Những thông báo liên quan đến lịch hẹn và hồ sơ được nhận qua /api/notifications/my, /api/notifications/:id/read và /api/notifications/read-all."),
        ("body", "Tên ảnh đề xuất: Hinh_4_22_Man_hinh_dat_lich_kham_cua_benh_nhan.png"),
        ("body", "Tên ảnh đề xuất: Hinh_4_23_Man_hinh_lich_hen_ca_nhan_va_chi_tiet_lich.png"),
        ("body", "Tên ảnh đề xuất: Hinh_4_24_Man_hinh_ho_so_kham_benh_va_tai_PDF.png"),
        ("body", "Khu vực bác sĩ được triển khai thành DoctorLayout với các màn hình chính gồm DoctorDashboardPage, DoctorQueuePage, DoctorAppointmentsPage, DoctorMedicalRecordsPage, DoctorSchedulesPage, DoctorArticlesPage, DoctorReviewsPage, DoctorServicePackagesPage và DoctorProfilePage. Dashboard hiển thị lịch trong ngày, bệnh nhân tiếp theo, trạng thái xử lý, đánh giá gần đây và các khối thống kê phục vụ bác sĩ theo dõi công việc nhanh."),
        ("body", "Màn hình hàng đợi khám sử dụng /api/doctor/queue/today và /api/appointments/:id/consultation-status để bác sĩ gọi bệnh nhân vào khám, cập nhật trạng thái đang khám, bỏ qua hoặc hoàn tất. Giao diện được thiết kế theo dạng bảng và thẻ tổng quan để bác sĩ xem ngay số lượng đang chờ, đang khám, đã hoàn thành và đã bỏ qua. Khi trạng thái thay đổi, hệ thống phát sự kiện realtime để các màn hình liên quan cập nhật kịp thời."),
        ("body", "Chức năng hồ sơ khám bệnh liên kết giữa /api/medical-records, /api/medical-records/:id, /api/medical-records/:id/pdf và các API upload tệp. Bác sĩ nhập triệu chứng, bệnh sử, sinh hiệu, chẩn đoán, kết luận, đơn thuốc, lời dặn và lịch tái khám để tạo hồ sơ khám hoàn chỉnh. Sau khi lưu, lịch hẹn được chuyển sang hoàn thành, bệnh nhân nhận thông báo và có thể tải lại PDF kết quả khám. Các trang lịch làm việc, bài viết và đánh giá giúp bác sĩ quản lý thêm nội dung chuyên môn và theo dõi phản hồi của bệnh nhân."),
        ("body", "Tên ảnh đề xuất: Hinh_4_25_Man_hinh_dashboard_bac_si.png"),
        ("body", "Tên ảnh đề xuất: Hinh_4_26_Man_hinh_hang_doi_kham_cua_bac_si.png"),
        ("body", "Tên ảnh đề xuất: Hinh_4_27_Man_hinh_tao_ho_so_kham_benh.png"),
        ("body", "Khu vực quản trị được xây dựng trên AdminLayout với các màn hình AdminDashboard, AdminClinicsPage, AdminSpecialtiesPage, AdminDoctorsPage, AdminAccountsPage, AdminArticlesPage, AdminServicePackagesPage, AdminSchedulesPage, AdminAppointmentsPage và AdminAuditLogsPage. Dashboard quản trị tổng hợp các chỉ số lớn như lịch hẹn, bệnh nhân, bác sĩ, cơ sở, danh sách chờ, hồ sơ khám và các yêu cầu cần xử lý."),
        ("body", "Các API quản trị như /api/admin/dashboard, /api/admin/users, /api/admin/doctor-users, /api/admin/audit-logs, /api/admin/audit-logs/:id, /api/admin/clinics, /api/admin/specialties, /api/admin/services, /api/admin/doctors và /api/admin/schedules cho phép quản trị viên thêm, sửa, xóa hoặc cập nhật trạng thái dữ liệu nền. Giao diện bảng, bộ lọc và modal giúp thao tác nhanh với cơ sở khám, chuyên khoa, bác sĩ, tài khoản bác sĩ, gói dịch vụ, lịch làm việc và bài viết."),
        ("body", "Riêng với lịch hẹn, AdminAppointmentsPage hỗ trợ lọc theo ngày, bác sĩ và trạng thái, sau đó mở chi tiết lịch để xác nhận, hủy hoặc xử lý yêu cầu đổi lịch. Hệ thống còn cho phép tải phiếu đặt lịch, phiếu số thứ tự và phiếu kết quả khám nếu lịch đã phát sinh hồ sơ. Trang AuditLog giúp quản trị viên tra cứu các thao tác quan trọng để phục vụ kiểm soát và truy vết khi cần."),
        ("body", "Tên ảnh đề xuất: Hinh_4_28_Man_hinh_dashboard_quan_tri_vien.png"),
        ("body", "Tên ảnh đề xuất: Hinh_4_29_Man_hinh_quan_ly_bac_si_co_so_chuyen_khoa.png"),
        ("body", "Tên ảnh đề xuất: Hinh_4_30_Man_hinh_quan_ly_lich_hen_va_xu_ly_yeu_cau.png"),
        ("body", "Tên ảnh đề xuất: Hinh_4_31_Man_hinh_nhat_ky_he_thong_AuditLog.png"),
        ("body", "Nhóm chức năng hỗ trợ được triển khai xuyên suốt hệ thống để đảm bảo trải nghiệm hoàn chỉnh. Thông báo được tạo cho các sự kiện đặt lịch, xác nhận lịch, đổi lịch, hủy lịch, gọi bệnh nhân vào khám, cập nhật hồ sơ và mời từ danh sách chờ. Người dùng có thể xem, đánh dấu đã đọc từng thông báo hoặc đánh dấu tất cả đã đọc ngay trong giao diện."),
        ("body", "Các API upload như /api/uploads/clinic-image, /api/uploads/clinic-images, /api/uploads/doctor-avatar, /api/uploads/specialty-image, /api/uploads/package-image, /api/uploads/article-cover, /api/uploads/medical-record-attachments và /api/uploads/user-avatar giúp hệ thống tiếp nhận ảnh và tài liệu cho nhiều loại dữ liệu khác nhau. Nhờ vậy, hồ sơ phòng khám, hồ sơ bác sĩ, bài viết và hồ sơ khám bệnh đều hiển thị đầy đủ trên giao diện."),
        ("body", "Chức năng xuất PDF đã được hoàn thiện cho phiếu đặt lịch, phiếu số thứ tự và phiếu kết quả khám bệnh. Backend dựng file bằng PDF service và trả về cho frontend qua các endpoint /api/appointments/:id/pdf, /api/appointments/:id/queue-ticket/pdf và /api/medical-records/:id/pdf. Đây là phần rất quan trọng vì giúp người dùng lưu được tài liệu chính thức sau khi thao tác trên hệ thống."),
        ("body", "Chức năng tư vấn triệu chứng bằng AI sử dụng /api/ai/symptom-checker và /api/ai/symptom-assistant để phân tích nội dung người dùng nhập vào, gợi ý chuyên khoa phù hợp và đưa ra kết quả tham khảo. Khi dịch vụ AI gặp lỗi, hệ thống có cơ chế fallback để vẫn trả được gợi ý cơ bản thay vì ngắt toàn bộ trải nghiệm người dùng."),
        ("body", "Tên ảnh đề xuất: Hinh_4_32_Man_hinh_chuong_thong_bao_va_danh_dau_da_doc.png"),
        ("body", "Tên ảnh đề xuất: Hinh_4_33_Man_hinh_upload_tep_dinh_kem_ho_so_kham.png"),
        ("body", "Tên ảnh đề xuất: Hinh_4_34_Mau_phieu_dat_lich_va_phieu_so_thu_tu_PDF.png"),
        ("body", "Tên ảnh đề xuất: Hinh_4_35_Mau_phieu_ket_qua_kham_benh_PDF.png"),
        ("body", "Tên ảnh đề xuất: Hinh_4_36_Man_hinh_tu_van_trieu_chung_bang_AI.png"),
        ("body", "Tổng thể, hệ thống đã đáp ứng được các chức năng cốt lõi của một nền tảng đặt lịch khám cho phòng khám nhỏ. Người dùng có thể tra cứu thông tin, đặt lịch, theo dõi lịch hẹn, xem hồ sơ khám và nhận thông báo; bác sĩ có thể xử lý hàng đợi và lập hồ sơ; quản trị viên có thể quản lý dữ liệu nền và kiểm tra nhật ký hệ thống."),
        ("body", "Về mặt kỹ thuật, ứng dụng tổ chức kiến trúc frontend - backend - database rõ ràng, sử dụng RESTful API cho giao tiếp, JWT cho xác thực, middleware cho phân quyền, MongoDB/Mongoose cho lưu trữ, Socket.IO cho cập nhật realtime và PDFKit cho sinh PDF. Các phần này kết hợp chặt chẽ với thiết kế giao diện và nghiệp vụ đã trình bày ở các mục trước."),
        ("body", "Kết quả kiểm thử smoke test gần nhất ghi nhận 24 trên 24 luồng nghiệp vụ cốt lõi đạt yêu cầu, bao gồm đăng ký OTP, đăng nhập, đổi mật khẩu, đặt lịch, chặn trùng slot, workflow lịch hẹn, tạo hồ sơ khám, phân quyền xem hồ sơ, tải PDF, danh sách chờ, thông báo và AuditLog. Điều này cho thấy hệ thống đã đạt mức ổn định đủ để tiếp tục hoàn thiện phần kiểm thử, triển khai và mở rộng trong các giai đoạn sau."),
        ("body", "Tên ảnh đề xuất: Hinh_4_37_Bang_tong_hop_ket_qua_kiem_thu_24_24.png"),
    ]

    with zipfile.ZipFile(input_path, "r") as zin:
        root = ET.fromstring(zin.read("word/document.xml"))
        body, paragraphs = find_body_paragraphs(root)
        heading_template = next(p for p in paragraphs if paragraph_text(p) == marker)
        body_template = next(
            p for p in paragraphs if paragraph_text(p).startswith("Sau giai đoạn phân tích yêu cầu")
        )

        remove_after_marker(body, marker)
        new_paragraphs = [
            clone_with_text(heading_template if kind == "heading" else body_template, text)
            for kind, text in content
        ]
        insert_after_marker(body, marker, new_paragraphs)

        updated_document = ET.tostring(root, encoding="utf-8", xml_declaration=True)
        with zipfile.ZipFile(output_path, "w", compression=zipfile.ZIP_DEFLATED) as zout:
            for item in zin.infolist():
                data = updated_document if item.filename == "word/document.xml" else zin.read(item.filename)
                zout.writestr(item, data)

    print(output_path)


if __name__ == "__main__":
    main()
