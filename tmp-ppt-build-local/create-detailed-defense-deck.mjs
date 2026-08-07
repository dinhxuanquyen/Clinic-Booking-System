import fs from "node:fs/promises";
import path from "node:path";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const W = 1280;
const H = 720;
const ROOT = "C:\\Users\\DELL\\Documents\\Codex\\2026-05-27\\clinic-booking";
const MEDIA = path.join(ROOT, "tmp-ppt-build", "docm", "word", "media");
const OUT = path.join(ROOT, "tmp-ppt-build-local", "rendered-detailed");
const FINAL = path.join(ROOT, "Clinic_Booking_Bao_Ve_Hoi_Dong_Chi_Tiet.pptx");

const c = {
  ink: "#101827",
  muted: "#475569",
  faint: "#E2E8F0",
  soft: "#F6F8FB",
  blueSoft: "#EAF6FB",
  greenSoft: "#ECFDF5",
  orangeSoft: "#FFF7ED",
  blue: "#0284C7",
  teal: "#0F766E",
  green: "#16A34A",
  orange: "#EA580C",
  red: "#DC2626",
  white: "#FFFFFF",
};

async function img(name) {
  const bytes = await fs.readFile(path.join(MEDIA, name));
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

function typeOf(name) {
  const ext = path.extname(name).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".svg") return "image/svg+xml";
  return "image/png";
}

function text(slide, value, box, style = {}) {
  const shape = slide.shapes.add({
    geometry: "textbox",
    position: box,
    fill: "none",
    line: { style: "solid", fill: "none", width: 0 },
  });
  shape.text = value;
  shape.text.style = {
    fontSize: style.size ?? 20,
    bold: style.bold ?? false,
    color: style.color ?? c.ink,
    alignment: style.align ?? "left",
    verticalAlignment: style.valign ?? "top",
    wrap: "square",
    insets: style.insets ?? { left: 0, top: 0, right: 0, bottom: 0 },
  };
  return shape;
}

function panel(slide, x, y, w, h, fill = c.soft) {
  return slide.shapes.add({
    geometry: "rect",
    position: { left: x, top: y, width: w, height: h },
    fill,
    line: { style: "solid", fill: "#D7DEE8", width: 1 },
  });
}

function bullets(slide, items, x, y, w, h, opts = {}) {
  return text(slide, items.map((item) => `• ${item}`).join("\n"), { left: x, top: y, width: w, height: h }, {
    size: opts.size ?? 18,
    color: opts.color ?? c.ink,
  });
}

function footer(slide, n) {
  slide.shapes.add({
    geometry: "rect",
    position: { left: 72, top: 650, width: 1136, height: 1 },
    fill: c.faint,
    line: { style: "solid", fill: c.faint, width: 0 },
  });
  text(slide, `Clinic Booking | ${String(n).padStart(2, "0")}`, { left: 72, top: 668, width: 260, height: 24 }, { size: 13, color: "#64748B" });
}

function title(slide, n, heading, sub = "") {
  text(slide, heading, { left: 72, top: 44, width: 1060, height: 86 }, { size: 36, bold: true });
  if (sub) text(slide, sub, { left: 72, top: 126, width: 950, height: 54 }, { size: 19, color: c.muted });
  footer(slide, n);
}

async function image(slide, name, box, fit = "contain", alt = name) {
  slide.images.add({
    blob: await img(name),
    contentType: typeOf(name),
    alt,
    fit,
    position: box,
  });
}

async function imageCard(slide, name, box, label, fit = "contain") {
  panel(slide, box.left - 10, box.top - 10, box.width + 20, box.height + 20, c.white);
  await image(slide, name, box, fit, label);
  text(slide, label, { left: box.left, top: box.top + box.height + 8, width: box.width, height: 28 }, { size: 14, color: c.muted, align: "center" });
}

function metric(slide, value, label, x, y, w, color, fill = "#F8FAFC") {
  panel(slide, x, y, w, 118, fill);
  text(slide, value, { left: x + 18, top: y + 20, width: w - 36, height: 40 }, { size: 33, bold: true, color });
  text(slide, label, { left: x + 18, top: y + 68, width: w - 36, height: 40 }, { size: 15, color: c.muted });
}

function note(slide, lines) {
  slide.speakerNotes.textFrame.setText(lines);
  slide.speakerNotes.setVisible(true);
}

function roleBox(slide, role, desc, x, y, fill, color) {
  panel(slide, x, y, 330, 138, fill);
  text(slide, role, { left: x + 24, top: y + 20, width: 260, height: 32 }, { size: 27, bold: true, color });
  text(slide, desc, { left: x + 24, top: y + 66, width: 278, height: 52 }, { size: 16, color: c.muted });
}

async function main() {
  await fs.rm(OUT, { recursive: true, force: true });
  await fs.mkdir(OUT, { recursive: true });
  const deck = Presentation.create({ slideSize: { width: W, height: H } });
  let n = 1;

  {
    const s = deck.slides.add();
    s.background.fill = c.white;
    await image(s, "image1.jpeg", { left: 72, top: 42, width: 145, height: 104 }, "contain", "Logo Phenikaa University");
    await image(s, "image46.png", { left: 646, top: 92, width: 560, height: 312 }, "contain", "Trang chủ BookingCare Mini");
    text(s, "Clinic Booking", { left: 72, top: 190, width: 560, height: 78 }, { size: 56, bold: true });
    text(s, "Hệ thống đặt lịch khám và quản lý hồ sơ khám trực tuyến", { left: 72, top: 282, width: 610, height: 92 }, { size: 29, bold: true, color: c.blue });
    text(s, "Báo cáo đồ án tốt nghiệp\nSinh viên: Đinh Xuân Quyền\nMã sinh viên: 22010342", { left: 72, top: 430, width: 520, height: 112 }, { size: 20, color: c.muted });
    footer(s, n++);
    note(s, ["[Sources]", "Báo cáo Word: ảnh logo và ảnh trang chủ.", "Dự án clinic-booking: README, docs/thesis/12-slide-outline.md."]);
  }

  {
    const s = deck.slides.add();
    s.background.fill = c.white;
    title(s, n++, "Mạch trình bày đi từ bài toán đến sản phẩm có thể demo", "Deck chi tiết hơn để vừa trình bày được tổng thể, vừa có slide dự phòng khi hội đồng hỏi sâu.");
    const rows = [
      ["01", "Bối cảnh và mục tiêu", "Vấn đề, phạm vi, vai trò người dùng."],
      ["02", "Phân tích nghiệp vụ", "Use case, luồng đặt lịch, luồng khám, tài liệu PDF."],
      ["03", "Thiết kế hệ thống", "Kiến trúc, API, dữ liệu, bảo mật, realtime."],
      ["04", "Kết quả triển khai", "Giao diện Patient, Doctor, Admin và mô hình deploy."],
      ["05", "Kiểm thử và kết luận", "24/24 smoke test, giới hạn và hướng phát triển."],
    ];
    rows.forEach(([id, head, body], i) => {
      const y = 212 + i * 74;
      text(s, id, { left: 96, top: y, width: 72, height: 34 }, { size: 22, bold: true, color: c.blue });
      panel(s, 184, y - 8, 914, 52, i % 2 ? "#FFFFFF" : c.soft);
      text(s, head, { left: 214, top: y + 1, width: 260, height: 28 }, { size: 20, bold: true });
      text(s, body, { left: 510, top: y + 3, width: 520, height: 26 }, { size: 17, color: c.muted });
    });
    note(s, ["[Sources]", "Dự án: docs/thesis/12-slide-outline.md và docs/thesis/08-presentation-script.md."]);
  }

  {
    const s = deck.slides.add();
    s.background.fill = c.white;
    title(s, n++, "Bài toán xuất phát từ quy trình phòng khám nhỏ còn rời rạc", "Nhu cầu không chỉ là đặt lịch online, mà là quản lý được trạng thái, hồ sơ, thông báo và giám sát vận hành.");
    panel(s, 72, 220, 338, 280, "#FFF1F2");
    text(s, "Hiện trạng", { left: 104, top: 250, width: 250, height: 32 }, { size: 27, bold: true, color: c.red });
    bullets(s, ["Đặt lịch thủ công mất thời gian.", "Dễ trùng lịch hoặc bỏ sót yêu cầu.", "Hồ sơ và kết quả khám khó tra cứu.", "Người vận hành thiếu dashboard."], 104, 310, 258, 138, { size: 18 });
    panel(s, 472, 220, 338, 280, c.blueSoft);
    text(s, "Yêu cầu đặt ra", { left: 504, top: 250, width: 250, height: 32 }, { size: 27, bold: true, color: c.blue });
    bullets(s, ["Đặt lịch theo cơ sở, chuyên khoa, bác sĩ.", "Kiểm soát slot và trạng thái lịch.", "Tạo hồ sơ khám và PDF.", "Phân quyền theo vai trò."], 504, 310, 258, 138, { size: 18 });
    panel(s, 872, 220, 338, 280, c.greenSoft);
    text(s, "Kỳ vọng", { left: 904, top: 250, width: 250, height: 32 }, { size: 27, bold: true, color: c.green });
    bullets(s, ["Quy trình liền mạch trước - trong - sau khám.", "Thông báo kịp thời cho đúng người.", "Có dữ liệu để kiểm thử và trình diễn.", "Có nền tảng mở rộng thực tế."], 904, 310, 258, 138, { size: 18 });
    note(s, ["[Sources]", "Báo cáo: Chương 1, Chương 2, Chương 5.", "Dự án: docs/thesis/03-use-cases.md."]);
  }

  {
    const s = deck.slides.add();
    s.background.fill = c.white;
    title(s, n++, "Mục tiêu được cụ thể hóa thành năm nhóm chức năng", "Các chức năng được thiết kế để hỗ trợ đầy đủ vòng đời đặt lịch - khám - hồ sơ - quản trị.");
    const items = [
      ["Đặt lịch", "Tìm cơ sở, chuyên khoa, bác sĩ, slot; gửi yêu cầu đặt lịch."],
      ["Xử lý lịch", "Xác nhận, đổi lịch, hủy lịch, hàng đợi, danh sách chờ."],
      ["Hồ sơ khám", "Triệu chứng, sinh hiệu, chẩn đoán, đơn thuốc, tái khám."],
      ["Tài liệu", "Phiếu đặt lịch, phiếu khám/số thứ tự, kết quả khám PDF."],
      ["Quản trị", "Dashboard, danh mục, tài khoản, audit log, thông báo."],
    ];
    items.forEach(([head, body], i) => {
      const x = 92 + (i % 3) * 372;
      const y = i < 3 ? 222 : 410;
      panel(s, x, y, 310, 128, i % 2 ? c.blueSoft : c.soft);
      text(s, head, { left: x + 22, top: y + 18, width: 250, height: 28 }, { size: 24, bold: true, color: i % 2 ? c.blue : c.teal });
      text(s, body, { left: x + 22, top: y + 58, width: 250, height: 50 }, { size: 16, color: c.muted });
    });
    note(s, ["[Sources]", "Báo cáo: Chương 3 và Chương 4.", "Dự án: docs/thesis/12-slide-outline.md."]);
  }

  {
    const s = deck.slides.add();
    s.background.fill = c.white;
    title(s, n++, "Hệ thống được chia thành bốn nhóm tác nhân rõ ràng", "Guest tra cứu thông tin; Patient quản lý lịch và hồ sơ; Doctor xử lý khám; Admin giám sát toàn hệ thống.");
    await imageCard(s, "image8.png", { left: 72, top: 202, width: 440, height: 348 }, "Use case tổng quan", "contain");
    roleBox(s, "Guest", "Xem thông tin công khai, đăng ký và đăng nhập.", 584, 220, c.soft, c.muted);
    roleBox(s, "Patient", "Đặt lịch, quản lý lịch hẹn, xem hồ sơ, tải PDF.", 584, 390, c.blueSoft, c.blue);
    roleBox(s, "Doctor", "Xử lý hàng đợi, tạo hồ sơ, quản lý lịch làm việc.", 918, 220, c.greenSoft, c.teal);
    roleBox(s, "Admin", "Quản lý danh mục, xử lý vận hành, xem audit log.", 918, 390, c.orangeSoft, c.orange);
    note(s, ["[Sources]", "Báo cáo: hình use case tổng quan.", "Dự án: docs/thesis/03-use-cases.md."]);
  }

  {
    const s = deck.slides.add();
    s.background.fill = c.white;
    title(s, n++, "Use case Patient tập trung vào tự phục vụ và theo dõi sau khám", "Bệnh nhân không chỉ đặt lịch, mà còn có thể theo dõi trạng thái, tải tài liệu và xem lại hồ sơ.");
    await imageCard(s, "image9.png", { left: 78, top: 214, width: 420, height: 336 }, "Use case bệnh nhân", "contain");
    panel(s, 590, 226, 526, 254, c.blueSoft);
    bullets(s, ["Đặt lịch với bác sĩ theo ngày và khung giờ còn trống.", "Theo dõi lịch hẹn theo trạng thái: pending, confirmed, in_progress, completed.", "Gửi yêu cầu hủy hoặc đổi lịch khi đủ điều kiện.", "Xem hồ sơ khám, tải PDF kết quả và đánh giá bác sĩ."], 624, 260, 450, 166, { size: 19 });
    note(s, ["[Sources]", "Báo cáo: hình use case bệnh nhân.", "Dự án: docs/thesis/03-use-cases.md, frontend/src/pages/BookingPage.jsx, frontend/src/pages/MyAppointments.jsx."]);
  }

  {
    const s = deck.slides.add();
    s.background.fill = c.white;
    title(s, n++, "Use case Doctor xoay quanh hàng đợi, trạng thái khám và hồ sơ", "Bác sĩ cần thao tác nhanh trong ngày nhưng vẫn phải bảo đảm đúng luồng nghiệp vụ.");
    await imageCard(s, "image10.png", { left: 78, top: 214, width: 420, height: 336 }, "Use case bác sĩ", "contain");
    panel(s, 590, 226, 526, 254, c.greenSoft);
    bullets(s, ["Xem dashboard và danh sách bệnh nhân hôm nay.", "Xác nhận lịch, bắt đầu khám, hoàn thành hoặc đánh dấu không đến.", "Tạo hồ sơ khám gồm chẩn đoán, kết luận, đơn thuốc, tái khám.", "Quản lý lịch làm việc và xem đánh giá từ bệnh nhân."], 624, 260, 450, 166, { size: 19 });
    note(s, ["[Sources]", "Báo cáo: hình use case bác sĩ.", "Dự án: docs/thesis/03-use-cases.md, frontend/src/pages/DoctorQueuePage.jsx."]);
  }

  {
    const s = deck.slides.add();
    s.background.fill = c.white;
    title(s, n++, "Use case Admin bảo đảm hệ thống có thể vận hành và truy vết", "Admin quản lý dữ liệu nền, xử lý yêu cầu phát sinh và giám sát hoạt động qua dashboard/audit log.");
    await imageCard(s, "image11.png", { left: 78, top: 214, width: 420, height: 336 }, "Use case quản trị viên", "contain");
    panel(s, 590, 226, 526, 254, c.orangeSoft);
    bullets(s, ["Quản lý cơ sở, chuyên khoa, bác sĩ, tài khoản, lịch làm việc, gói khám.", "Xử lý lịch chờ xác nhận, yêu cầu hủy/đổi lịch và waiting list.", "Theo dõi dashboard tổng quan, phân bố trạng thái và hoạt động gần đây.", "Xem AuditLog để truy vết thao tác quan trọng."], 624, 260, 450, 166, { size: 19 });
    note(s, ["[Sources]", "Báo cáo: hình use case quản trị viên.", "Dự án: docs/thesis/03-use-cases.md, frontend/src/pages/admin."]);
  }

  {
    const s = deck.slides.add();
    s.background.fill = c.white;
    title(s, n++, "Stack kỹ thuật phù hợp với ứng dụng web full-stack", "Frontend React/Vite, backend Node/Express, cơ sở dữ liệu MongoDB/Mongoose, realtime Socket.IO và xuất PDF.");
    const logos = [
      ["image14.jpg", "React", 100, 240],
      ["image15.png", "Vite", 330, 230],
      ["image20.png", "Express", 560, 242],
      ["image19.png", "Node.js", 790, 248],
      ["image21.png", "MongoDB", 1020, 232],
    ];
    for (const [name, label, x, y] of logos) {
      await imageCard(s, name, { left: x, top: y, width: 150, height: 100 }, label, "contain");
    }
    panel(s, 116, 438, 1048, 92, c.soft);
    bullets(s, ["React Router, TanStack React Query, Axios, Recharts cho giao diện.", "Express, Mongoose, JWT, Socket.IO, PDFKit, Nodemailer cho backend.", "MongoDB lưu dữ liệu tài khoản, lịch hẹn, hồ sơ, thông báo và audit log."], 150, 462, 960, 48, { size: 17 });
    note(s, ["[Sources]", "Báo cáo: hình logo công nghệ.", "Dự án: README.md, docs/thesis/01-architecture.md, frontend/package.json, backend/package.json."]);
  }

  {
    const s = deck.slides.add();
    s.background.fill = c.white;
    title(s, n++, "Kiến trúc tổng thể tách rõ UI, API, dữ liệu và dịch vụ phụ trợ", "Cấu trúc này giúp luồng nghiệp vụ đi qua backend để kiểm soát quyền, trạng thái và tính nhất quán dữ liệu.");
    await imageCard(s, "image13.png", { left: 72, top: 210, width: 480, height: 342 }, "Kiến trúc tổng quan", "contain");
    panel(s, 638, 224, 486, 272, c.blueSoft);
    bullets(s, ["Frontend gọi REST API và nhận notification qua Socket.IO.", "API đi qua middleware xác thực, phân quyền và validate.", "Service xử lý nghiệp vụ đặt lịch, hồ sơ, PDF, email, notification.", "MongoDB lưu dữ liệu trung tâm và dữ liệu vận hành."], 672, 260, 420, 166, { size: 19 });
    note(s, ["[Sources]", "Báo cáo: hình kiến trúc tổng quan.", "Dự án: docs/thesis/01-architecture.md."]);
  }

  {
    const s = deck.slides.add();
    s.background.fill = c.white;
    title(s, n++, "Backend được tổ chức theo lớp để dễ kiểm soát nghiệp vụ", "Route nhận request; middleware xác thực/validate; controller điều phối; service xử lý nghiệp vụ; model làm việc với MongoDB.");
    await imageCard(s, "image26.png", { left: 70, top: 214, width: 548, height: 320 }, "Sơ đồ xử lý API", "contain");
    panel(s, 690, 228, 432, 252, c.soft);
    bullets(s, ["Routes: auth, appointment, doctor, admin, medical-record, notification.", "Middleware: auth, role, validate, upload, rate limit, error handler.", "Services: appointment attendance, waiting list, PDF, email, Socket.IO, Gemini AI.", "Models: User, Doctor, Appointment, MedicalRecord, Notification, AuditLog."], 722, 260, 368, 160, { size: 17 });
    note(s, ["[Sources]", "Báo cáo: sơ đồ xử lý API.", "Dự án: backend/src/routes, backend/src/middleware, backend/src/services, backend/src/models."]);
  }

  {
    const s = deck.slides.add();
    s.background.fill = c.white;
    title(s, n++, "Frontend được chia theo cổng sử dụng để giảm rối khi thao tác", "Public, Patient, Doctor và Admin có layout riêng, nhưng dùng chung API client, auth context và các component nền.");
    await imageCard(s, "image46.png", { left: 78, top: 212, width: 340, height: 198 }, "Public portal", "contain");
    await imageCard(s, "image52.png", { left: 470, top: 212, width: 340, height: 198 }, "Patient portal", "contain");
    await imageCard(s, "image55.png", { left: 862, top: 212, width: 340, height: 198 }, "Doctor portal", "contain");
    panel(s, 140, 492, 1000, 74, c.soft);
    bullets(s, ["PublicLayout, DoctorLayout, AdminLayout định hình trải nghiệm từng vai trò.", "Các tiện ích chung: auth, dateTime, status, downloadFile, medicalRecordPdf, appointmentView."], 170, 512, 930, 38, { size: 17 });
    note(s, ["[Sources]", "Báo cáo: ảnh giao diện hệ thống.", "Dự án: frontend/src/App.jsx, frontend/src/components, frontend/src/utils."]);
  }

  {
    const s = deck.slides.add();
    s.background.fill = c.white;
    title(s, n++, "Mô hình dữ liệu lấy Appointment làm trục của nghiệp vụ", "Từ lịch hẹn có thể đi đến hàng đợi, hồ sơ khám, tái khám, PDF, notification và audit log.");
    await imageCard(s, "image27.png", { left: 70, top: 206, width: 590, height: 340 }, "Sơ đồ dữ liệu tổng quan", "contain");
    panel(s, 730, 224, 408, 260, c.greenSoft);
    bullets(s, ["User liên kết Appointment, Notification, MedicalRecord, DoctorReview.", "Clinic, Specialty, Doctor phân loại lịch và dữ liệu khám.", "Appointment sinh MedicalRecord và có thể mở WaitingList.", "Unique index chặn trùng slot theo clinic, doctor, date, timeSlot."], 762, 260, 344, 158, { size: 18 });
    note(s, ["[Sources]", "Báo cáo: sơ đồ dữ liệu tổng quan.", "Dự án: docs/thesis/02-database-diagram.md, backend/src/models."]);
  }

  {
    const s = deck.slides.add();
    s.background.fill = c.white;
    title(s, n++, "Lịch hẹn được quản lý như một state machine", "Ràng buộc trạng thái giúp tránh thao tác sai, ví dụ hoàn thành lịch khi chưa bắt đầu khám hoặc hủy lịch đã hoàn tất.");
    await imageCard(s, "image22.png", { left: 78, top: 214, width: 420, height: 334 }, "Luồng trạng thái lịch hẹn", "contain");
    panel(s, 590, 226, 526, 254, c.orangeSoft);
    bullets(s, ["Trạng thái chính: pending, confirmed, in_progress, completed, cancelled, no_show.", "Nhánh phát sinh: cancel_requested, reschedule_requested, waiting list.", "Backend kiểm tra trạng thái hợp lệ trước khi cập nhật.", "Hoàn tất hồ sơ khám sẽ đồng bộ trạng thái lịch hẹn."], 624, 260, 450, 166, { size: 19 });
    note(s, ["[Sources]", "Báo cáo: activity/state diagram lịch hẹn.", "Dự án: backend/src/constants/appointmentStatus.js, backend/src/controllers/appointmentController.js."]);
  }

  {
    const s = deck.slides.add();
    s.background.fill = c.white;
    title(s, n++, "Luồng đặt lịch đi qua kiểm tra slot, quyền và dữ liệu đầu vào", "Điểm quan trọng là backend mới là nơi quyết định slot có hợp lệ và có bị trùng hay không.");
    await imageCard(s, "image28.png", { left: 68, top: 216, width: 560, height: 314 }, "Luồng API đặt lịch", "contain");
    panel(s, 704, 226, 420, 254, c.blueSoft);
    bullets(s, ["Patient chọn cơ sở, chuyên khoa, bác sĩ, ngày và slot.", "Backend kiểm tra lịch làm việc, trạng thái giữ slot và unique index.", "Tạo appointment ở trạng thái ban đầu phù hợp.", "Gửi notification/email cho các bên liên quan."], 736, 260, 354, 150, { size: 19 });
    note(s, ["[Sources]", "Báo cáo: hình luồng xử lý API đặt lịch.", "Dự án: backend/src/controllers/appointmentController.js, backend/src/utils/slotUtils.js."]);
  }

  {
    const s = deck.slides.add();
    s.background.fill = c.white;
    title(s, n++, "Luồng khám nối lịch hẹn với hồ sơ và tài liệu sau khám", "Khi bác sĩ tạo hồ sơ, hệ thống hoàn tất lịch, lưu dữ liệu chuyên môn và cho phép bệnh nhân tải kết quả.");
    await imageCard(s, "image40.png", { left: 72, top: 206, width: 520, height: 340 }, "Luồng tạo hồ sơ khám", "contain");
    panel(s, 666, 224, 456, 260, c.greenSoft);
    bullets(s, ["Bác sĩ mở lịch đang khám và nhập dữ liệu chuyên môn.", "MedicalRecord lưu triệu chứng, sinh hiệu, chẩn đoán, đơn thuốc, lời dặn, tái khám.", "Appointment chuyển sang completed sau khi hồ sơ được tạo.", "Patient xem lại hồ sơ và tải PDF kết quả khám."], 698, 260, 388, 158, { size: 18 });
    note(s, ["[Sources]", "Báo cáo: sequence diagram tạo hồ sơ khám.", "Dự án: backend/src/controllers/medicalRecordController.js, backend/src/models/medicalRecordModel.js."]);
  }

  {
    const s = deck.slides.add();
    s.background.fill = c.white;
    title(s, n++, "Patient portal đã triển khai đủ luồng tự phục vụ", "Các màn hình trọng tâm gồm trang chủ, đăng nhập, đặt lịch, lịch hẹn, chi tiết lịch và hồ sơ khám.");
    await imageCard(s, "image47.png", { left: 70, top: 208, width: 348, height: 192 }, "Đăng nhập", "contain");
    await imageCard(s, "image52.png", { left: 466, top: 208, width: 348, height: 192 }, "Đặt lịch", "contain");
    await imageCard(s, "image53.png", { left: 862, top: 208, width: 348, height: 192 }, "Lịch hẹn", "contain");
    await imageCard(s, "image54.png", { left: 270, top: 448, width: 348, height: 132 }, "Chi tiết lịch", "contain");
    await imageCard(s, "image75.png", { left: 714, top: 432, width: 210, height: 156 }, "Hồ sơ/PDF", "contain");
    note(s, ["[Sources]", "Báo cáo: ảnh giao diện Patient portal.", "Dự án: frontend/src/pages/AuthPage.jsx, BookingPage.jsx, MyAppointments.jsx, MedicalRecordsPage.jsx."]);
  }

  {
    const s = deck.slides.add();
    s.background.fill = c.white;
    title(s, n++, "Doctor portal tập trung vào thao tác khám trong ngày", "Bác sĩ có thể xem tổng quan, hàng đợi, lịch hẹn, hồ sơ, lịch làm việc và thông tin cá nhân/chuyên môn.");
    await imageCard(s, "image55.png", { left: 70, top: 208, width: 348, height: 192 }, "Dashboard bác sĩ", "contain");
    await imageCard(s, "image56.png", { left: 466, top: 208, width: 348, height: 192 }, "Hàng đợi", "contain");
    await imageCard(s, "image57.png", { left: 862, top: 208, width: 348, height: 192 }, "Lịch hẹn", "contain");
    await imageCard(s, "image58.png", { left: 270, top: 448, width: 348, height: 132 }, "Hồ sơ khám", "contain");
    await imageCard(s, "image61.png", { left: 714, top: 448, width: 348, height: 132 }, "Thông tin bác sĩ", "contain");
    note(s, ["[Sources]", "Báo cáo: ảnh giao diện Doctor portal.", "Dự án: frontend/src/pages/DoctorDashboardPage.jsx, DoctorQueuePage.jsx, DoctorAppointmentsPage.jsx, DoctorMedicalRecordsPage.jsx."]);
  }

  {
    const s = deck.slides.add();
    s.background.fill = c.white;
    title(s, n++, "Admin portal bao phủ dữ liệu nền và giám sát vận hành", "Admin có thể quản lý danh mục, lịch, bác sĩ, tài khoản, gói khám, bài viết và audit log.");
    await imageCard(s, "image62.png", { left: 70, top: 204, width: 348, height: 190 }, "Dashboard admin", "contain");
    await imageCard(s, "image64.png", { left: 466, top: 204, width: 348, height: 190 }, "Lịch hẹn", "contain");
    await imageCard(s, "image65.png", { left: 862, top: 204, width: 348, height: 190 }, "Tài khoản", "contain");
    await imageCard(s, "image66.png", { left: 70, top: 444, width: 348, height: 130 }, "Bác sĩ", "contain");
    await imageCard(s, "image68.png", { left: 466, top: 444, width: 348, height: 130 }, "Gói khám", "contain");
    await imageCard(s, "image70.png", { left: 862, top: 444, width: 348, height: 130 }, "Audit log", "contain");
    note(s, ["[Sources]", "Báo cáo: ảnh giao diện Admin portal.", "Dự án: frontend/src/pages/admin."]);
  }

  {
    const s = deck.slides.add();
    s.background.fill = c.white;
    title(s, n++, "PDF giúp hệ thống có đầu ra giống tài liệu nghiệp vụ thực tế", "Tài liệu có thể lưu trữ, in ra hoặc gửi cho bệnh nhân sau khi đặt lịch và sau khi khám.");
    await imageCard(s, "image73.png", { left: 96, top: 190, width: 274, height: 398 }, "Phiếu đặt lịch", "contain");
    await imageCard(s, "image74.png", { left: 504, top: 190, width: 274, height: 398 }, "Phiếu khám/số thứ tự", "contain");
    await imageCard(s, "image76.png", { left: 912, top: 190, width: 274, height: 398 }, "Kết quả khám", "contain");
    note(s, ["[Sources]", "Báo cáo: ảnh mẫu PDF.", "Dự án: backend/src/services/pdfService.js, docs/sample-medical-record.pdf."]);
  }

  {
    const s = deck.slides.add();
    s.background.fill = c.white;
    title(s, n++, "Bảo mật được triển khai ở cả frontend và backend", "Frontend điều hướng đúng vai trò; backend vẫn xác thực token, kiểm tra role và kiểm tra quyền sở hữu dữ liệu.");
    metric(s, "JWT", "Xác thực API bằng token, đổi mật khẩu ban đầu, OTP email.", 92, 224, 300, c.blue, c.blueSoft);
    metric(s, "Role", "Patient, Doctor, Admin có route và endpoint riêng.", 490, 224, 300, c.green, c.greenSoft);
    metric(s, "Ownership", "Người dùng chỉ xem hoặc xử lý dữ liệu thuộc phạm vi.", 888, 224, 300, c.orange, c.orangeSoft);
    panel(s, 144, 430, 992, 86, c.soft);
    bullets(s, ["Doctor không được xử lý lịch của bác sĩ khác; Patient không được xem hồ sơ của người khác.", "Admin có quyền quản trị và có AuditLog để truy vết thao tác quan trọng."], 174, 454, 930, 38, { size: 17 });
    note(s, ["[Sources]", "Báo cáo: phần bảo mật và phân quyền.", "Dự án: backend/src/middleware/authMiddleware.js, roleMiddleware.js, frontend/src/components/ProtectedRoute.jsx."]);
  }

  {
    const s = deck.slides.add();
    s.background.fill = c.white;
    title(s, n++, "Realtime, email và AI là các tiện ích làm hệ thống gần sản phẩm thực tế", "Các thành phần phụ trợ được thiết kế để hỗ trợ nghiệp vụ nhưng không làm hỏng luồng chính nếu có lỗi phụ trợ.");
    await imageCard(s, "image71.png", { left: 72, top: 210, width: 510, height: 282 }, "Notification realtime", "contain");
    await imageCard(s, "image78.png", { left: 654, top: 210, width: 510, height: 282 }, "AI tư vấn triệu chứng", "contain");
    panel(s, 134, 560, 1010, 50, c.soft);
    text(s, "Notification lưu trong MongoDB và phát qua Socket.IO; email dùng cho OTP, quên mật khẩu và xác nhận lịch; AI chỉ đóng vai trò gợi ý ban đầu.", { left: 160, top: 575, width: 960, height: 24 }, { size: 17, color: c.muted, align: "center" });
    note(s, ["[Sources]", "Báo cáo: ảnh notification và AI.", "Dự án: backend/src/services/socketService.js, emailService.js, geminiService.js."]);
  }

  {
    const s = deck.slides.add();
    s.background.fill = c.white;
    title(s, n++, "Mô hình triển khai tách frontend, backend, database và dịch vụ ngoài", "Cấu hình triển khai đủ để trình bày kiến trúc vận hành, dù production thực tế còn cần hardening thêm.");
    await imageCard(s, "image79.png", { left: 88, top: 210, width: 560, height: 348 }, "Mô hình triển khai hệ thống", "contain");
    panel(s, 724, 226, 408, 254, c.orangeSoft);
    bullets(s, ["Frontend deploy trên dịch vụ static hosting.", "Backend chạy Node/Express với biến môi trường riêng.", "MongoDB lưu dữ liệu ứng dụng.", "SMTP/Brevo, Gemini API và upload storage là dịch vụ tích hợp."], 756, 260, 344, 150, { size: 18 });
    note(s, ["[Sources]", "Báo cáo: hình mô hình triển khai.", "Dự án: 4.8_trien_khai_he_thong.md, render.yaml."]);
  }

  {
    const s = deck.slides.add();
    s.background.fill = c.white;
    title(s, n++, "Kiểm thử xác nhận các luồng nghiệp vụ cốt lõi đã chạy đúng", "Kết hợp smoke test backend, kiểm thử thủ công giao diện và kiểm tra responsive trên nhiều kích thước.");
    metric(s, "24/24", "Smoke test backend đạt yêu cầu trong lần chạy gần nhất.", 92, 224, 280, c.green, c.greenSoft);
    metric(s, "TC01-TC24", "Bao phủ xác thực, đặt lịch, quyền, hồ sơ, PDF, notification, audit.", 408, 224, 400, c.blue, c.blueSoft);
    metric(s, "6 viewport", "375, 430, 768, 1024, 1366 và 1440 px.", 844, 224, 280, c.orange, c.orangeSoft);
    panel(s, 120, 430, 1040, 88, c.soft);
    bullets(s, ["Kết quả cho thấy hệ thống đủ điều kiện để trình diễn đồ án và minh họa quy trình vận hành.", "Giới hạn: chưa kiểm thử tải lớn, kiểm thử bảo mật chuyên sâu và automation UI toàn diện."], 150, 456, 980, 38, { size: 17 });
    note(s, ["[Sources]", "Báo cáo: mục 4.7 Kiểm thử phần mềm.", "Dự án: 4.7_kiem_thu_phan_mem.md, backend/src/scripts/e2eSmokeTest.js."]);
  }

  {
    const s = deck.slides.add();
    s.background.fill = c.white;
    title(s, n++, "Kịch bản demo nên kể một câu chuyện liên tục", "Đi theo một bệnh nhân từ lúc đặt lịch đến khi có hồ sơ, rồi cho hội đồng thấy bác sĩ và admin xử lý phần vận hành.");
    const steps = [
      ["1", "Patient đặt lịch", "Chọn cơ sở, chuyên khoa, bác sĩ, ngày, slot và lý do khám."],
      ["2", "Doctor xử lý", "Xác nhận, chuyển đang khám, tạo hồ sơ và hoàn tất lịch."],
      ["3", "Patient xem kết quả", "Mở hồ sơ, tải PDF, xem kế hoạch tái khám."],
      ["4", "Admin giám sát", "Xem dashboard, lịch cần xử lý, audit log và danh mục."],
    ];
    steps.forEach(([id, head, body], i) => {
      const x = 82 + i * 296;
      panel(s, x, 244, 242, 236, i % 2 ? c.soft : c.blueSoft);
      text(s, id, { left: x + 22, top: 266, width: 50, height: 46 }, { size: 38, bold: true, color: c.blue });
      text(s, head, { left: x + 22, top: 332, width: 190, height: 32 }, { size: 23, bold: true });
      text(s, body, { left: x + 22, top: 384, width: 190, height: 70 }, { size: 16, color: c.muted });
    });
    text(s, "Thông điệp cần nhấn mạnh: hệ thống đã nối được đặt lịch - khám - hồ sơ - PDF - quản trị trong cùng một sản phẩm.", { left: 126, top: 548, width: 1028, height: 48 }, { size: 22, bold: true, align: "center", color: c.teal });
    note(s, ["[Sources]", "Dự án: docs/thesis/08-presentation-script.md."]);
  }

  {
    const s = deck.slides.add();
    s.background.fill = c.white;
    title(s, n++, "Đóng góp chính nằm ở cách nối nghiệp vụ thành một quy trình hoàn chỉnh", "Đồ án không dừng ở form đặt lịch, mà mở rộng sang vận hành, hồ sơ sau khám, tài liệu và giám sát.");
    const items = [
      ["Lịch hẹn", "State machine, chống trùng slot, đổi/hủy, hàng đợi, waiting list."],
      ["Hồ sơ khám", "Chẩn đoán, đơn thuốc, sinh hiệu, tệp đính kèm, tái khám, PDF."],
      ["Phân quyền", "JWT, role middleware, ProtectedRoute, ownership check."],
      ["Vận hành", "Dashboard, notification realtime, email, AuditLog, dữ liệu mẫu."],
    ];
    items.forEach(([head, body], i) => {
      const x = i % 2 ? 674 : 128;
      const y = i < 2 ? 226 : 398;
      panel(s, x, y, 430, 126, i % 2 ? c.greenSoft : c.blueSoft);
      text(s, head, { left: x + 24, top: y + 18, width: 280, height: 30 }, { size: 25, bold: true, color: i % 2 ? c.teal : c.blue });
      text(s, body, { left: x + 24, top: y + 60, width: 360, height: 44 }, { size: 16, color: c.muted });
    });
    note(s, ["[Sources]", "Báo cáo: Chương 5 Các giải pháp và đóng góp nổi bật.", "Dự án: 5_chuong_5_giai_phap_va_dong_gop.md."]);
  }

  {
    const s = deck.slides.add();
    s.background.fill = c.white;
    title(s, n++, "Giới hạn hiện tại là cơ sở cho hướng phát triển tiếp theo", "Phần này nên trình bày chủ động để hội đồng thấy phạm vi đồ án và năng lực mở rộng của hệ thống.");
    panel(s, 92, 224, 480, 270, "#FFF1F2");
    text(s, "Giới hạn", { left: 124, top: 254, width: 260, height: 34 }, { size: 28, bold: true, color: c.red });
    bullets(s, ["Chưa kiểm thử tải lớn với nhiều người dùng đồng thời.", "Chưa có kiểm thử bảo mật chuyên sâu.", "Automation UI chưa bao phủ toàn bộ luồng.", "Triển khai production cần hardening thêm."], 124, 316, 390, 126, { size: 18 });
    panel(s, 696, 224, 480, 270, c.greenSoft);
    text(s, "Hướng phát triển", { left: 728, top: 254, width: 300, height: 34 }, { size: 28, bold: true, color: c.green });
    bullets(s, ["Thanh toán online và hóa đơn.", "Ký số PDF, tích hợp HIS/LIS.", "Telemedicine, SMS/Zalo nhắc lịch.", "Báo cáo phân tích nâng cao và test tự động UI."], 728, 316, 390, 126, { size: 18 });
    note(s, ["[Sources]", "Báo cáo: Chương 5, Kết luận và hướng phát triển.", "Dự án: ket_luan_va_huong_phat_trien.md."]);
  }

  {
    const s = deck.slides.add();
    s.background.fill = c.white;
    text(s, "Xin cảm ơn hội đồng", { left: 88, top: 182, width: 620, height: 88 }, { size: 52, bold: true });
    text(s, "Clinic Booking\nHệ thống đặt lịch khám và quản lý hồ sơ khám trực tuyến", { left: 92, top: 304, width: 560, height: 90 }, { size: 26, color: c.blue, bold: true });
    await image(s, "image46.png", { left: 720, top: 172, width: 430, height: 250 }, "contain", "Trang chủ hệ thống");
    text(s, "Sẵn sàng trao đổi thêm về nghiệp vụ, kiến trúc, kiểm thử và hướng mở rộng.", { left: 92, top: 496, width: 760, height: 34 }, { size: 21, color: c.muted });
    footer(s, n++);
    note(s, ["[Sources]", "Báo cáo Word và dự án clinic-booking."]);
  }

  for (const [index, slide] of deck.slides.items.entries()) {
    const stem = `slide-${String(index + 1).padStart(2, "0")}`;
    const png = await deck.export({ slide, format: "png", scale: 1 });
    await fs.writeFile(path.join(OUT, `${stem}.png`), Buffer.from(await png.arrayBuffer()));
    const layout = await slide.export({ format: "layout" });
    await fs.writeFile(path.join(OUT, `${stem}.layout.json`), await layout.text(), "utf8");
  }
  const montage = await deck.export({ format: "webp", montage: true, scale: 1 });
  await fs.writeFile(path.join(OUT, "deck-montage.webp"), Buffer.from(await montage.arrayBuffer()));
  const inspect = await deck.inspect({ kind: "slide,textbox,shape,image,notes", maxChars: 30000 });
  await fs.writeFile(path.join(OUT, "inspect.ndjson"), inspect.ndjson, "utf8");
  const pptx = await PresentationFile.exportPptx(deck);
  await pptx.save(FINAL);
  return { final: FINAL, out: OUT, slides: deck.slides.items.length };
}

try {
  const result = await main();
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(error);
  throw error;
}
