import fs from "node:fs/promises";
import path from "node:path";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const W = 1280;
const H = 720;
const ROOT = "C:\\Users\\DELL\\Documents\\Codex\\2026-05-27\\clinic-booking";
const TMP = path.join(ROOT, "tmp-ppt-build");
const MEDIA = path.join(TMP, "docm", "word", "media");
const FINAL = path.join(ROOT, "Clinic_Booking_Bao_Ve_Hoi_Dong.pptx");
const OUT = path.join(TMP, "rendered");

const colors = {
  ink: "#111827",
  muted: "#475569",
  faint: "#E5E7EB",
  panel: "#F4F7FA",
  panel2: "#EAF6FB",
  blue: "#0284C7",
  teal: "#0F766E",
  green: "#16A34A",
  orange: "#EA580C",
  red: "#DC2626",
  white: "#FFFFFF",
};

async function imageBytes(name) {
  const file = path.join(MEDIA, name);
  const bytes = await fs.readFile(file);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

function contentType(name) {
  const ext = path.extname(name).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".svg") return "image/svg+xml";
  return "image/png";
}

function addText(slide, text, position, style = {}) {
  const box = slide.shapes.add({
    geometry: "textbox",
    position,
    fill: "none",
    line: { style: "solid", fill: "none", width: 0 },
  });
  box.text = text;
  box.text.style = {
    fontSize: style.fontSize ?? 22,
    bold: style.bold ?? false,
    color: style.color ?? colors.ink,
    alignment: style.alignment ?? "left",
    verticalAlignment: style.verticalAlignment ?? "top",
    wrap: "square",
    insets: style.insets ?? { left: 0, right: 0, top: 0, bottom: 0 },
  };
  return box;
}

function addFooter(slide, n) {
  addText(slide, `Clinic Booking | ${String(n).padStart(2, "0")}`, {
    left: 72,
    top: 668,
    width: 240,
    height: 24,
  }, { fontSize: 13, color: "#64748B" });
  slide.shapes.add({
    geometry: "rect",
    position: { left: 72, top: 650, width: 1136, height: 1 },
    fill: colors.faint,
    line: { style: "solid", fill: colors.faint, width: 0 },
  });
}

function addTitle(slide, title, subtitle, n) {
  addText(slide, title, { left: 72, top: 48, width: 980, height: 88 }, {
    fontSize: 38,
    bold: true,
    color: colors.ink,
  });
  if (subtitle) {
    addText(slide, subtitle, { left: 72, top: 132, width: 820, height: 52 }, {
      fontSize: 20,
      color: colors.muted,
    });
  }
  addFooter(slide, n);
}

function addPanel(slide, x, y, w, h, fill = colors.panel) {
  return slide.shapes.add({
    geometry: "rect",
    position: { left: x, top: y, width: w, height: h },
    fill,
    line: { style: "solid", fill: "#D6DEE8", width: 1 },
  });
}

function addBulletList(slide, items, x, y, w, h, opts = {}) {
  const text = items.map((item) => `• ${item}`).join("\n");
  return addText(slide, text, { left: x, top: y, width: w, height: h }, {
    fontSize: opts.fontSize ?? 20,
    color: opts.color ?? colors.ink,
  });
}

async function addImage(slide, name, position, fit = "contain", alt = name) {
  slide.images.add({
    blob: await imageBytes(name),
    contentType: contentType(name),
    alt,
    fit,
    position,
  });
}

async function addImagePanel(slide, name, position, label, fit = "contain") {
  addPanel(slide, position.left - 10, position.top - 10, position.width + 20, position.height + 20, colors.white);
  await addImage(slide, name, position, fit, label);
  addText(slide, label, {
    left: position.left,
    top: position.top + position.height + 8,
    width: position.width,
    height: 28,
  }, { fontSize: 15, color: colors.muted, alignment: "center" });
}

function addMetric(slide, value, label, x, y, w, color) {
  addPanel(slide, x, y, w, 118, "#F8FAFC");
  addText(slide, value, { left: x + 18, top: y + 20, width: w - 36, height: 42 }, {
    fontSize: 34,
    bold: true,
    color,
  });
  addText(slide, label, { left: x + 18, top: y + 68, width: w - 36, height: 36 }, {
    fontSize: 16,
    color: colors.muted,
  });
}

function notes(slide, lines) {
  slide.speakerNotes.textFrame.setText(lines);
  slide.speakerNotes.setVisible(true);
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const presentation = Presentation.create({ slideSize: { width: W, height: H } });

  {
    const slide = presentation.slides.add();
    slide.background.fill = colors.white;
    await addImage(slide, "image46.png", { left: 660, top: 96, width: 548, height: 300 }, "contain", "Trang chủ hệ thống");
    await addImage(slide, "image1.jpeg", { left: 72, top: 46, width: 150, height: 110 }, "contain", "Logo Phenikaa University");
    addText(slide, "Clinic Booking", { left: 72, top: 190, width: 560, height: 78 }, { fontSize: 56, bold: true });
    addText(slide, "Hệ thống đặt lịch khám và quản lý hồ sơ khám trực tuyến", { left: 72, top: 282, width: 620, height: 104 }, { fontSize: 29, color: colors.blue, bold: true });
    addText(slide, "Báo cáo đồ án tốt nghiệp\nSinh viên: Đinh Xuân Quyền\nMã sinh viên: 22010342", { left: 72, top: 430, width: 520, height: 112 }, { fontSize: 20, color: colors.muted });
    addFooter(slide, 1);
    notes(slide, ["[Sources]", "Báo cáo 22010342_Đinh_Xuân_Quyền_Final.docm: ảnh logo và ảnh trang chủ.", "Dự án clinic-booking: README và docs/thesis/12-slide-outline.md."]);
  }

  {
    const slide = presentation.slides.add();
    slide.background.fill = colors.white;
    addTitle(slide, "Bài toán là số hóa trọn vòng đời đặt lịch - khám - theo dõi", "Từ một quy trình thủ công rời rạc thành một luồng dữ liệu có trạng thái, có phân quyền và có minh chứng.", 2);
    addPanel(slide, 72, 218, 500, 340);
    addText(slide, "Khó khăn thực tế", { left: 104, top: 244, width: 420, height: 34 }, { fontSize: 26, bold: true, color: colors.red });
    addBulletList(slide, [
      "Đặt lịch thủ công dễ trùng khung giờ.",
      "Lịch hẹn và hồ sơ khám bị phân tán.",
      "Bác sĩ thiếu hàng đợi và dashboard trong ngày.",
      "Quản trị viên khó giám sát trạng thái vận hành.",
    ], 104, 306, 410, 176);
    addPanel(slide, 646, 218, 562, 340, colors.panel2);
    addText(slide, "Mục tiêu hệ thống", { left: 680, top: 244, width: 430, height: 34 }, { fontSize: 26, bold: true, color: colors.teal });
    addBulletList(slide, [
      "Đặt lịch trực tuyến theo cơ sở, chuyên khoa, bác sĩ và slot.",
      "Quản lý trạng thái lịch hẹn, đổi lịch, hủy lịch, danh sách chờ.",
      "Tạo hồ sơ khám, đơn thuốc, tái khám và PDF kết quả.",
      "Cung cấp dashboard riêng cho patient, doctor và admin.",
    ], 680, 306, 460, 190);
    notes(slide, ["[Sources]", "Báo cáo: Chương 1, Chương 2, Chương 5.", "Dự án: docs/thesis/12-slide-outline.md và docs/thesis/03-use-cases.md."]);
  }

  {
    const slide = presentation.slides.add();
    slide.background.fill = colors.white;
    addTitle(slide, "Phạm vi được tổ chức quanh ba vai trò chính", "Mỗi vai trò có một cổng làm việc riêng, nhưng cùng chia sẻ dữ liệu lịch hẹn và hồ sơ.", 3);
    await addImagePanel(slide, "image8.png", { left: 72, top: 214, width: 410, height: 330 }, "Use case tổng quan", "contain");
    addMetric(slide, "Patient", "Đặt lịch, xem lịch, xem hồ sơ, tải PDF, đánh giá bác sĩ.", 546, 224, 280, colors.blue);
    addMetric(slide, "Doctor", "Xử lý hàng đợi, cập nhật trạng thái, tạo hồ sơ khám.", 546, 368, 280, colors.teal);
    addMetric(slide, "Admin", "Quản lý danh mục, lịch hẹn, người dùng, audit log.", 866, 296, 280, colors.orange);
    notes(slide, ["[Sources]", "Báo cáo: biểu đồ use case tổng quan.", "Dự án: docs/thesis/03-use-cases.md."]);
  }

  {
    const slide = presentation.slides.add();
    slide.background.fill = colors.white;
    addTitle(slide, "Kiến trúc tách rõ frontend, API, dịch vụ và dữ liệu", "React đảm nhiệm trải nghiệm người dùng; Express/Mongoose xử lý nghiệp vụ; MongoDB lưu dữ liệu vận hành.", 4);
    await addImagePanel(slide, "image26.png", { left: 70, top: 216, width: 566, height: 326 }, "Sơ đồ kiến trúc xử lý API", "contain");
    addText(slide, "Điểm nhấn kỹ thuật", { left: 710, top: 226, width: 420, height: 36 }, { fontSize: 26, bold: true });
    addBulletList(slide, [
      "REST API theo lớp routes, middleware, controller, service, model.",
      "JWT, role middleware và kiểm tra quyền sở hữu dữ liệu.",
      "Socket.IO cho thông báo realtime theo user hoặc role.",
      "PDFKit, Nodemailer, upload storage phục vụ nghiệp vụ sau khám.",
    ], 710, 292, 430, 180);
    notes(slide, ["[Sources]", "Báo cáo: Hình sơ đồ kiến trúc xử lý API.", "Dự án: docs/thesis/01-architecture.md."]);
  }

  {
    const slide = presentation.slides.add();
    slide.background.fill = colors.white;
    addTitle(slide, "Mô hình dữ liệu giữ liên kết xuyên suốt lịch hẹn và hồ sơ", "Appointment là trục nghiệp vụ, liên kết bệnh nhân, bác sĩ, cơ sở, chuyên khoa, gói khám, hồ sơ và thông báo.", 5);
    await addImagePanel(slide, "image27.png", { left: 72, top: 206, width: 560, height: 334 }, "Sơ đồ dữ liệu tổng quan", "contain");
    addPanel(slide, 698, 220, 454, 294);
    addBulletList(slide, [
      "Appointment có trạng thái nghiệp vụ rõ ràng.",
      "MedicalRecord unique theo appointmentId để tránh tạo trùng.",
      "Unique index theo clinic, doctor, date, timeSlot giúp chặn trùng slot.",
      "Notification và AuditLog lưu lại sự kiện quan trọng.",
    ], 730, 254, 390, 190);
    notes(slide, ["[Sources]", "Báo cáo: sơ đồ dữ liệu tổng quan.", "Dự án: docs/thesis/02-database-diagram.md."]);
  }

  {
    const slide = presentation.slides.add();
    slide.background.fill = colors.white;
    addTitle(slide, "Luồng API bảo đảm mỗi thao tác đều đi qua kiểm tra nghiệp vụ", "Slot, trạng thái, quyền truy cập và dữ liệu PDF được kiểm soát ở backend thay vì chỉ dựa vào giao diện.", 6);
    await addImagePanel(slide, "image28.png", { left: 78, top: 216, width: 548, height: 312 }, "Luồng xử lý API đặt lịch", "contain");
    addText(slide, "Nhóm API chính", { left: 704, top: 224, width: 360, height: 36 }, { fontSize: 26, bold: true, color: colors.blue });
    addBulletList(slide, [
      "Auth: đăng ký, OTP, đăng nhập, đổi mật khẩu.",
      "Appointment: tạo lịch, đổi/hủy, cập nhật trạng thái, xuất PDF.",
      "Medical records: tạo hồ sơ, xem chi tiết, tải PDF kết quả.",
      "Admin/Doctor portal: dashboard, lịch làm việc, audit log.",
    ], 704, 286, 420, 184);
    notes(slide, ["[Sources]", "Báo cáo: sơ đồ kiến trúc xử lý API và luồng đặt lịch.", "Dự án: docs/thesis/06-api-summary.md."]);
  }

  {
    const slide = presentation.slides.add();
    slide.background.fill = colors.white;
    addTitle(slide, "Patient portal giúp bệnh nhân tự chủ từ chọn lịch đến xem kết quả", "Trải nghiệm chính: tìm thông tin, đặt lịch, quản lý lịch hẹn, xem hồ sơ và tải tài liệu.", 7);
    await addImagePanel(slide, "image52.png", { left: 68, top: 218, width: 520, height: 286 }, "Màn hình đặt lịch", "contain");
    await addImagePanel(slide, "image53.png", { left: 640, top: 218, width: 520, height: 286 }, "Lịch hẹn của tôi", "contain");
    addBulletList(slide, [
      "Luồng đặt lịch có chọn cơ sở, chuyên khoa, bác sĩ, ngày và slot.",
      "Bệnh nhân theo dõi trạng thái, gửi yêu cầu hủy/đổi lịch và tải phiếu.",
    ], 106, 560, 980, 54, { fontSize: 18 });
    notes(slide, ["[Sources]", "Báo cáo: ảnh giao diện Patient portal.", "Dự án: frontend/src/pages/BookingPage.jsx và frontend/src/pages/MyAppointments.jsx."]);
  }

  {
    const slide = presentation.slides.add();
    slide.background.fill = colors.white;
    addTitle(slide, "Doctor portal ưu tiên xử lý nhanh công việc trong ngày", "Bác sĩ có dashboard, hàng đợi khám, lịch hẹn, hồ sơ và lịch làm việc theo vai trò.", 8);
    await addImagePanel(slide, "image55.png", { left: 68, top: 216, width: 520, height: 286 }, "Tổng quan lịch khám", "contain");
    await addImagePanel(slide, "image56.png", { left: 640, top: 216, width: 520, height: 286 }, "Hàng đợi của tôi", "contain");
    addBulletList(slide, [
      "Cập nhật trạng thái từ chờ xác nhận đến đang khám và hoàn thành.",
      "Tạo hồ sơ khám ngay trong quy trình, giảm thao tác rời rạc.",
    ], 106, 558, 980, 54, { fontSize: 18 });
    notes(slide, ["[Sources]", "Báo cáo: ảnh giao diện Doctor portal.", "Dự án: frontend/src/pages/DoctorDashboardPage.jsx và frontend/src/pages/DoctorQueuePage.jsx."]);
  }

  {
    const slide = presentation.slides.add();
    slide.background.fill = colors.white;
    addTitle(slide, "Admin portal tạo góc nhìn vận hành toàn hệ thống", "Quản trị viên theo dõi số liệu, xử lý lịch hẹn và quản lý dữ liệu nền theo một giao diện thống nhất.", 9);
    await addImagePanel(slide, "image62.png", { left: 68, top: 214, width: 520, height: 286 }, "Bảng điều khiển quản trị", "contain");
    await addImagePanel(slide, "image64.png", { left: 640, top: 214, width: 520, height: 286 }, "Danh sách lịch hẹn", "contain");
    addBulletList(slide, [
      "Quản lý cơ sở, chuyên khoa, bác sĩ, tài khoản, gói khám và bài viết.",
      "Audit log giúp truy vết thao tác quan trọng trong hệ thống.",
    ], 106, 556, 980, 54, { fontSize: 18 });
    notes(slide, ["[Sources]", "Báo cáo: ảnh giao diện Admin portal.", "Dự án: frontend/src/pages/AdminDashboard.jsx và frontend/src/pages/admin."]);
  }

  {
    const slide = presentation.slides.add();
    slide.background.fill = colors.white;
    addTitle(slide, "PDF biến dữ liệu khám thành tài liệu có thể lưu trữ và in ấn", "Hệ thống xuất phiếu đặt lịch, phiếu khám/số thứ tự và phiếu kết quả khám cho đúng người có quyền.", 10);
    await addImagePanel(slide, "image73.png", { left: 88, top: 194, width: 300, height: 408 }, "Phiếu đặt lịch", "contain");
    await addImagePanel(slide, "image74.png", { left: 490, top: 194, width: 300, height: 408 }, "Phiếu khám", "contain");
    await addImagePanel(slide, "image76.png", { left: 892, top: 194, width: 300, height: 408 }, "Kết quả khám", "contain");
    notes(slide, ["[Sources]", "Báo cáo: ảnh mẫu các tài liệu PDF.", "Dự án: backend/src/services/pdfService.js và docs/sample-medical-record.pdf."]);
  }

  {
    const slide = presentation.slides.add();
    slide.background.fill = colors.white;
    addTitle(slide, "Bảo mật dựa trên xác thực, vai trò và quyền sở hữu dữ liệu", "Giao diện chỉ là lớp đầu; backend vẫn kiểm tra token, role và phạm vi dữ liệu cho từng nghiệp vụ.", 11);
    addPanel(slide, 92, 218, 320, 260, colors.panel2);
    addText(slide, "JWT", { left: 124, top: 250, width: 240, height: 44 }, { fontSize: 34, bold: true, color: colors.blue });
    addBulletList(slide, ["Token cho API bảo vệ.", "Đổi mật khẩu ban đầu.", "OTP email khi đăng ký."], 124, 318, 238, 100, { fontSize: 18 });
    addPanel(slide, 480, 218, 320, 260, "#F0FDF4");
    addText(slide, "Role", { left: 512, top: 250, width: 240, height: 44 }, { fontSize: 34, bold: true, color: colors.green });
    addBulletList(slide, ["Patient, Doctor, Admin.", "ProtectedRoute ở frontend.", "roleMiddleware ở backend."], 512, 318, 238, 100, { fontSize: 18 });
    addPanel(slide, 868, 218, 320, 260, "#FFF7ED");
    addText(slide, "Ownership", { left: 900, top: 250, width: 240, height: 44 }, { fontSize: 34, bold: true, color: colors.orange });
    addBulletList(slide, ["Patient chỉ xem dữ liệu của mình.", "Doctor chỉ xử lý lịch thuộc phạm vi.", "Admin quản trị và audit."], 900, 318, 238, 112, { fontSize: 18 });
    addText(slide, "Kết quả: giảm nguy cơ truy cập sai vai trò và bảo vệ dữ liệu khám bệnh nhạy cảm.", { left: 156, top: 548, width: 960, height: 36 }, { fontSize: 22, bold: true, color: colors.ink, alignment: "center" });
    notes(slide, ["[Sources]", "Báo cáo: phần bảo mật và phân quyền.", "Dự án: backend/src/middleware/authMiddleware.js, backend/src/middleware/roleMiddleware.js, frontend/src/components/ProtectedRoute.jsx."]);
  }

  {
    const slide = presentation.slides.add();
    slide.background.fill = colors.white;
    addTitle(slide, "Realtime và thông báo giúp các vai trò không bỏ lỡ thay đổi", "Thông báo được lưu trong MongoDB và phát theo user hoặc role qua Socket.IO.", 12);
    await addImagePanel(slide, "image71.png", { left: 72, top: 218, width: 530, height: 286 }, "Thông báo trong ứng dụng", "contain");
    await addImagePanel(slide, "image78.png", { left: 654, top: 218, width: 530, height: 286 }, "AI tư vấn triệu chứng", "contain");
    addBulletList(slide, [
      "Sự kiện quan trọng: đặt lịch, xác nhận, đổi/hủy lịch, hoàn tất hồ sơ.",
      "Email hỗ trợ OTP, quên mật khẩu và xác nhận lịch; lỗi phụ trợ không làm hỏng nghiệp vụ chính.",
    ], 106, 558, 980, 54, { fontSize: 18 });
    notes(slide, ["[Sources]", "Báo cáo: ảnh thông báo và AI tư vấn triệu chứng.", "Dự án: backend/src/services/socketService.js, backend/src/controllers/notificationController.js, backend/src/services/geminiService.js."]);
  }

  {
    const slide = presentation.slides.add();
    slide.background.fill = colors.white;
    addTitle(slide, "Kiểm thử xác nhận các luồng cốt lõi đã sẵn sàng trình diễn", "Kết hợp smoke test backend với kiểm thử thủ công giao diện và responsive.", 13);
    addMetric(slide, "24/24", "Luồng nghiệp vụ cốt lõi đạt trong smoke test backend.", 92, 226, 270, colors.green);
    addMetric(slide, "3 vai trò", "Patient, Doctor, Admin đều có kiểm thử thao tác chính.", 396, 226, 270, colors.blue);
    addMetric(slide, "6 viewport", "Kiểm tra giao diện từ mobile đến desktop.", 700, 226, 270, colors.orange);
    addPanel(slide, 92, 402, 878, 114, "#F8FAFC");
    addBulletList(slide, [
      "Bao phủ xác thực, đặt lịch, chống trùng slot, cập nhật trạng thái, hồ sơ khám, PDF, đánh giá, waiting list, thông báo và audit log.",
      "Giới hạn còn lại: chưa có kiểm thử tải lớn, kiểm thử bảo mật chuyên sâu và automation UI toàn diện.",
    ], 122, 426, 818, 56, { fontSize: 18 });
    await addImage(slide, "image15.png", { left: 1038, top: 250, width: 80, height: 80 }, "contain", "Vite logo");
    await addImage(slide, "image19.png", { left: 1036, top: 380, width: 92, height: 60 }, "contain", "Node.js logo");
    notes(slide, ["[Sources]", "Báo cáo: mục 4.7 Kiểm thử phần mềm.", "Dự án: 4.7_kiem_thu_phan_mem.md và backend/src/scripts/e2eSmokeTest.js."]);
  }

  {
    const slide = presentation.slides.add();
    slide.background.fill = colors.white;
    addTitle(slide, "Kịch bản demo nên đi theo một câu chuyện liên tục", "Bắt đầu từ bệnh nhân đặt lịch, sau đó chuyển sang bác sĩ xử lý và kết thúc bằng quản trị giám sát.", 14);
    const steps = [
      ["1", "Patient đặt lịch", "Chọn cơ sở, chuyên khoa, bác sĩ, ngày và slot."],
      ["2", "Doctor xử lý", "Xác nhận, gọi vào khám, tạo hồ sơ và hoàn tất."],
      ["3", "Patient xem kết quả", "Mở hồ sơ, tải PDF và theo dõi tái khám."],
      ["4", "Admin giám sát", "Xem dashboard, lịch cần xử lý và audit log."],
    ];
    steps.forEach(([num, title, body], i) => {
      const x = 92 + i * 288;
      addPanel(slide, x, 246, 236, 230, i % 2 ? "#F8FAFC" : colors.panel2);
      addText(slide, num, { left: x + 22, top: 266, width: 50, height: 46 }, { fontSize: 38, bold: true, color: colors.blue });
      addText(slide, title, { left: x + 22, top: 330, width: 190, height: 34 }, { fontSize: 24, bold: true });
      addText(slide, body, { left: x + 22, top: 382, width: 188, height: 72 }, { fontSize: 17, color: colors.muted });
    });
    addText(slide, "Thông điệp xuyên suốt: hệ thống đã nối được đặt lịch - khám - hồ sơ - PDF - quản trị trong cùng một sản phẩm.", { left: 126, top: 548, width: 1028, height: 48 }, { fontSize: 22, bold: true, alignment: "center", color: colors.teal });
    notes(slide, ["[Sources]", "Dự án: docs/thesis/08-presentation-script.md."]);
  }

  {
    const slide = presentation.slides.add();
    slide.background.fill = colors.white;
    addTitle(slide, "Kết quả đạt được là một hệ thống có thể trình diễn trọn quy trình", "Đồ án không chỉ đặt lịch, mà còn xử lý vận hành sau đặt lịch và dữ liệu sau khám.", 15);
    await addImagePanel(slide, "image79.png", { left: 70, top: 222, width: 520, height: 300 }, "Mô hình triển khai hệ thống", "contain");
    addText(slide, "Đóng góp chính", { left: 676, top: 224, width: 360, height: 34 }, { fontSize: 26, bold: true, color: colors.teal });
    addBulletList(slide, [
      "Quản lý lịch theo trạng thái, chống trùng slot và hỗ trợ đổi/hủy.",
      "Hồ sơ khám, tái khám, PDF và upload file gắn với lịch hẹn.",
      "Phân quyền theo vai trò, notification realtime, email và audit log.",
      "Hướng mở rộng: thanh toán online, chữ ký số, HIS/LIS, telemedicine.",
    ], 676, 286, 440, 184);
    addText(slide, "Xin cảm ơn hội đồng đã lắng nghe.", { left: 676, top: 546, width: 440, height: 44 }, { fontSize: 26, bold: true, color: colors.blue });
    notes(slide, ["[Sources]", "Báo cáo: Chương 5 và hình mô hình triển khai.", "Dự án: 5_chuong_5_giai_phap_va_dong_gop.md và 4.8_trien_khai_he_thong.md."]);
  }

  for (const [index, slide] of presentation.slides.items.entries()) {
    const stem = `slide-${String(index + 1).padStart(2, "0")}`;
    const png = await presentation.export({ slide, format: "png", scale: 1 });
    await fs.writeFile(path.join(OUT, `${stem}.png`), Buffer.from(await png.arrayBuffer()));
    const layout = await slide.export({ format: "layout" });
    await fs.writeFile(path.join(OUT, `${stem}.layout.json`), await layout.text(), "utf8");
  }
  const montage = await presentation.export({ format: "webp", montage: true, scale: 1 });
  await fs.writeFile(path.join(OUT, "deck-montage.webp"), Buffer.from(await montage.arrayBuffer()));

  const inspect = await presentation.inspect({ kind: "slide,textbox,shape,image,notes", maxChars: 20000 });
  await fs.writeFile(path.join(TMP, "final-inspect.ndjson"), inspect.ndjson, "utf8");

  const pptx = await PresentationFile.exportPptx(presentation);
  await pptx.save(FINAL);
  console.log(FINAL);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
