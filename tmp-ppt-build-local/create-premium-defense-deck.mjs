import fs from "node:fs/promises";
import path from "node:path";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const W = 1280;
const H = 720;
const ROOT = "C:\\Users\\DELL\\Documents\\Codex\\2026-05-27\\clinic-booking";
const MEDIA = path.join(ROOT, "tmp-ppt-build", "docm", "word", "media");
const OUT = path.join(ROOT, "tmp-ppt-build-local", "rendered-premium-defense");
const FINAL = path.join(ROOT, "Clinic_Booking_Thiet_Ke_Lai_Day_Du.pptx");

const C = {
  navy: "#073763",
  deep: "#08243A",
  ink: "#172033",
  text: "#526173",
  mute: "#7B8794",
  teal: "#0FB9B1",
  mint: "#E8FAF8",
  blue: "#1E63D6",
  blueSoft: "#EDF5FF",
  coral: "#FF6B57",
  coralSoft: "#FFF0ED",
  amber: "#F59E0B",
  amberSoft: "#FFF7E6",
  green: "#16A34A",
  greenSoft: "#ECFDF3",
  slate: "#F5F8FB",
  line: "#D9E3EE",
  white: "#FFFFFF",
};

async function bytes(name) {
  const data = await fs.readFile(path.join(MEDIA, name));
  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
}

function mime(name) {
  const ext = path.extname(name).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".svg") return "image/svg+xml";
  return "image/png";
}

function addText(slide, text, box, style = {}) {
  const shape = slide.shapes.add({
    geometry: "textbox",
    position: box,
    fill: "none",
    line: { style: "solid", fill: "none", width: 0 },
  });
  shape.text = text;
  shape.text.style = {
    fontSize: style.size ?? 20,
    bold: style.bold ?? false,
    color: style.color ?? C.ink,
    alignment: style.align ?? "left",
    verticalAlignment: style.valign ?? "top",
    wrap: "square",
    insets: style.insets ?? { left: 0, top: 0, right: 0, bottom: 0 },
  };
  return shape;
}

function addShape(slide, geometry, box, fill, line = "none", extra = {}) {
  slide.shapes.add({
    geometry,
    position: box,
    fill,
    line: { style: "solid", fill: line === "none" ? fill : line, width: line === "none" ? 0 : 1 },
    ...extra,
  });
}

async function addLogo(slide, x = 1098, y = 34, w = 122, h = 48) {
  slide.images.add({
    blob: await bytes("image1.jpeg"),
    contentType: mime("image1.jpeg"),
    alt: "Phenikaa University",
    fit: "contain",
    position: { left: x, top: y, width: w, height: h },
  });
}

async function addImage(slide, name, box, fit = "contain", alt = name) {
  slide.images.add({
    blob: await bytes(name),
    contentType: mime(name),
    alt,
    fit,
    position: box,
  });
}

async function shot(slide, name, box, label, fit = "contain") {
  addShape(slide, "roundRect", { left: box.left - 10, top: box.top - 10, width: box.width + 20, height: box.height + 20 }, C.white, C.line, { borderRadius: "rounded-lg", shadow: "shadow-sm" });
  await addImage(slide, name, box, fit, label);
  if (label) addText(slide, label, { left: box.left, top: box.top + box.height + 10, width: box.width, height: 22 }, { size: 14, color: C.mute, align: "center" });
}

function footer(slide, page) {
  addShape(slide, "rect", { left: 0, top: 674, width: W, height: 46 }, C.deep);
  addShape(slide, "rect", { left: 0, top: 666, width: W, height: 8 }, C.teal);
  addShape(slide, "rect", { left: 0, top: 666, width: 166, height: 8 }, C.coral);
  addText(slide, "Clinic Booking", { left: 64, top: 686, width: 180, height: 18 }, { size: 13, bold: true, color: C.white });
  addText(slide, "Đồ án tốt nghiệp - Đinh Xuân Quyền", { left: 485, top: 686, width: 310, height: 18 }, { size: 13, color: C.white, align: "center" });
  addText(slide, String(page).padStart(2, "0"), { left: 1205, top: 684, width: 34, height: 20 }, { size: 15, bold: true, color: C.white, align: "right" });
}

function header(slide, title, subtitle = "") {
  addText(slide, "CLINIC BOOKING", { left: 64, top: 34, width: 210, height: 18 }, { size: 12, bold: true, color: C.teal });
  addText(slide, title, { left: 64, top: 61, width: 880, height: 52 }, { size: 38, bold: true, color: C.navy });
  addShape(slide, "rect", { left: 64, top: 126, width: 292, height: 5 }, C.teal);
  addShape(slide, "rect", { left: 368, top: 126, width: 68, height: 5 }, C.coral);
  if (subtitle) addText(slide, subtitle, { left: 64, top: 145, width: 950, height: 34 }, { size: 18, color: C.text });
}

function pill(slide, text, x, y, w, fill = C.mint, color = C.navy) {
  addShape(slide, "roundRect", { left: x, top: y, width: w, height: 30 }, fill, fill, { borderRadius: "rounded-full" });
  addText(slide, text, { left: x + 14, top: y + 7, width: w - 28, height: 16 }, { size: 13, bold: true, color, align: "center" });
}

function card(slide, x, y, w, h, title, body, fill = C.white, accent = C.teal) {
  addShape(slide, "roundRect", { left: x, top: y, width: w, height: h }, fill, C.line, { borderRadius: "rounded-lg", shadow: "shadow-sm" });
  addShape(slide, "rect", { left: x, top: y, width: 6, height: h }, accent);
  const compact = h < 76;
  addText(slide, title, { left: x + 22, top: y + (compact ? 8 : 18), width: w - 44, height: compact ? 18 : 28 }, { size: compact ? 15 : 22, bold: true, color: fill === "#0D304D" ? C.white : C.navy });
  addText(slide, body, { left: x + 22, top: y + (compact ? 28 : 58), width: w - 44, height: Math.max(18, h - (compact ? 34 : 70)) }, { size: compact ? 13 : 16, color: fill === "#0D304D" ? "#D7E6F0" : C.ink });
}

function metric(slide, value, label, x, y, w, h, fill = C.blueSoft) {
  addShape(slide, "roundRect", { left: x, top: y, width: w, height: h }, fill, "#B8CCE8", { borderRadius: "rounded-lg" });
  addText(slide, value, { left: x + 12, top: y + 16, width: w - 24, height: 34 }, { size: 28, bold: true, color: C.navy, align: "center" });
  addText(slide, label, { left: x + 18, top: y + 58, width: w - 36, height: h - 64 }, { size: 15, color: C.ink, align: "center" });
}

function bullets(slide, items, box, size = 17, color = C.ink) {
  addText(slide, items.map((v) => `• ${v}`).join("\n"), box, { size, color });
}

function step(slide, n, title, body, x, y, w, accent = C.teal) {
  addShape(slide, "ellipse", { left: x, top: y, width: 44, height: 44 }, accent);
  addText(slide, String(n), { left: x, top: y + 10, width: 44, height: 22 }, { size: 18, bold: true, color: C.white, align: "center" });
  addText(slide, title, { left: x + 60, top: y, width: w - 60, height: 24 }, { size: 20, bold: true, color: C.navy });
  addText(slide, body, { left: x + 60, top: y + 30, width: w - 60, height: 44 }, { size: 15, color: C.text });
}

function notes(slide, lines) {
  slide.speakerNotes.textFrame.setText(["[Sources]", ...lines].join("\n"));
  slide.speakerNotes.setVisible(true);
}

async function section(slide, num, title, lead, points, image, page) {
  slide.background.fill = C.deep;
  addShape(slide, "rect", { left: 0, top: 0, width: 700, height: 720 }, C.deep);
  addShape(slide, "rect", { left: 700, top: 0, width: 580, height: 720 }, "#F2FBFC");
  addShape(slide, "roundRect", { left: 748, top: 118, width: 446, height: 420 }, C.white, "#BEE7EC", { borderRadius: "rounded-lg", shadow: "shadow-sm" });
  await addImage(slide, image, { left: 770, top: 150, width: 402, height: 340 }, "contain", title);
  addShape(slide, "rect", { left: 700, top: 0, width: 10, height: 666 }, C.teal);
  addText(slide, String(num).padStart(2, "0"), { left: 78, top: 70, width: 120, height: 64 }, { size: 54, bold: true, color: C.teal });
  addText(slide, title, { left: 78, top: 164, width: 560, height: 70 }, { size: 50, bold: true, color: C.white });
  addShape(slide, "rect", { left: 80, top: 258, width: 300, height: 6 }, C.teal);
  addShape(slide, "rect", { left: 394, top: 258, width: 76, height: 6 }, C.coral);
  addText(slide, lead, { left: 80, top: 294, width: 530, height: 62 }, { size: 22, color: "#D7E6F0" });
  points.forEach((p, i) => card(slide, 80, 388 + i * 74, 530, 54, p[0], p[1], "#0D304D", i % 2 ? C.coral : C.teal));
  footer(slide, page);
}

async function build() {
  await fs.rm(OUT, { recursive: true, force: true });
  await fs.mkdir(OUT, { recursive: true });
  const deck = Presentation.create({ slideSize: { width: W, height: H } });
  let p = 1;

  // 1
  {
    const s = deck.slides.add();
    s.background.fill = C.deep;
    await addImage(s, "image46.png", { left: 646, top: 72, width: 548, height: 420 }, "cover", "Trang chủ hệ thống");
    addShape(s, "roundRect", { left: 612, top: 112, width: 616, height: 418 }, { color: C.white, transparency: 9000 }, C.teal, { borderRadius: "rounded-lg" });
    await addLogo(s, 82, 54, 250, 88);
    pill(s, "ĐỒ ÁN TỐT NGHIỆP", 82, 194, 170, C.mint, C.navy);
    addText(s, "Clinic Booking", { left: 82, top: 246, width: 520, height: 70 }, { size: 58, bold: true, color: C.white });
    addText(s, "Hệ thống đặt lịch khám và quản lý hồ sơ khám trực tuyến", { left: 86, top: 328, width: 510, height: 72 }, { size: 25, color: "#DCECF4" });
    addText(s, "Sinh viên: Đinh Xuân Quyền   |   Mã SV: 22010342", { left: 86, top: 462, width: 560, height: 26 }, { size: 18, color: C.white });
    addText(s, "08/2026", { left: 86, top: 506, width: 150, height: 34 }, { size: 27, bold: true, color: C.teal });
    footer(s, p++);
    notes(s, ["Báo cáo Word; ảnh trang chủ hệ thống và logo Phenikaa trong báo cáo."]);
  }

  // 2
  {
    const s = deck.slides.add();
    s.background.fill = C.white;
    header(s, "Nội dung trình bày", "Bố cục được mở rộng để hội đồng thấy đủ bài toán, giải pháp, triển khai và kiểm thử.");
    await addLogo(s);
    await shot(s, "image46.png", { left: 760, top: 130, width: 360, height: 270 }, "Sản phẩm đã triển khai", "cover");
    const items = [
      ["01", "Mở đầu", "Lý do chọn đề tài, mục tiêu, phạm vi."],
      ["02", "Phân tích thiết kế", "Actor, use case, luồng nghiệp vụ và mô hình dữ liệu."],
      ["03", "Kiến trúc triển khai", "Frontend, backend, database, realtime, PDF, bảo mật."],
      ["04", "Sản phẩm & kiểm thử", "Giao diện theo vai trò, chức năng nổi bật, kết quả test."],
      ["05", "Kết luận", "Đóng góp, hạn chế, hướng phát triển."],
    ];
    items.forEach((it, i) => {
      const y = 184 + i * 82;
      addShape(s, "roundRect", { left: 86, top: y, width: 70, height: 54 }, i === 0 ? C.navy : C.blueSoft, i === 0 ? C.navy : "#B8CCE8", { borderRadius: "rounded-lg" });
      addText(s, it[0], { left: 86, top: y + 13, width: 70, height: 24 }, { size: 20, bold: true, color: i === 0 ? C.white : C.navy, align: "center" });
      addText(s, it[1], { left: 180, top: y + 2, width: 460, height: 26 }, { size: 23, bold: true, color: C.navy });
      addText(s, it[2], { left: 180, top: y + 34, width: 480, height: 22 }, { size: 15, color: C.text });
    });
    footer(s, p++);
    notes(s, ["Cấu trúc lấy tinh thần từ mẫu PPTX tham chiếu, nhưng thiết kế và nội dung đã viết lại cho Clinic Booking."]);
  }

  // 3
  {
    const s = deck.slides.add();
    await section(s, 1, "Mở đầu", "Bài toán xuất phát từ nhu cầu số hóa quy trình đặt lịch, khám và trả kết quả trong một hệ thống thống nhất.", [
      ["Vấn đề", "Lịch hẹn và hồ sơ rời rạc"],
      ["Mục tiêu", "Tự phục vụ cho bệnh nhân, vận hành cho bác sĩ"],
      ["Kết quả", "Có sản phẩm chạy được và kiểm thử luồng lõi"],
    ], "image46.png", p++);
    notes(s, ["Báo cáo chương 1; ảnh trang chủ trong báo cáo."]);
  }

  // 4
  {
    const s = deck.slides.add();
    s.background.fill = C.white;
    header(s, "Bài toán cần giải quyết", "Quy trình khám không chỉ là đặt một slot, mà là chuỗi thao tác từ tìm kiếm đến hồ sơ và theo dõi sau khám.");
    await addLogo(s);
    card(s, 70, 222, 340, 124, "Đặt lịch thủ công", "Dễ trùng khung giờ, khó kiểm tra lịch bác sĩ, thiếu xác nhận tự động.", C.coralSoft, C.coral);
    card(s, 70, 374, 340, 124, "Dữ liệu phân tán", "Lịch hẹn, hồ sơ khám, PDF và thông báo thường bị tách thành nhiều quy trình.", C.amberSoft, C.amber);
    card(s, 70, 526, 340, 102, "Thiếu góc nhìn vận hành", "Bác sĩ và admin cần dashboard, hàng đợi, audit log để xử lý trong ngày.", C.blueSoft, C.blue);
    await shot(s, "image52.png", { left: 512, top: 220, width: 626, height: 300 }, "Luồng đặt lịch được số hóa", "contain");
    metric(s, "409", "Chặn trùng slot bằng kiểm tra nghiệp vụ và unique index.", 532, 548, 250, 84, C.mint);
    metric(s, "Role", "Patient, Doctor, Admin có quyền thao tác khác nhau.", 812, 548, 250, 84, C.blueSoft);
    footer(s, p++);
    notes(s, ["README: luồng đặt lịch, unique index, phân quyền theo role; ảnh đặt lịch trong báo cáo."]);
  }

  // 5
  {
    const s = deck.slides.add();
    s.background.fill = C.white;
    header(s, "Mục tiêu và phạm vi", "Đồ án tập trung xây dựng hệ thống full-stack có thể trình diễn end-to-end.");
    await addLogo(s);
    const goals = [
      ["Người dùng", "Đăng ký, xác thực OTP, đăng nhập, đổi mật khẩu và quản lý hồ sơ cá nhân.", C.blueSoft, C.blue],
      ["Đặt lịch", "Chọn cơ sở, chuyên khoa, bác sĩ, ngày, khung giờ; kiểm tra slot và trạng thái.", C.mint, C.teal],
      ["Khám bệnh", "Bác sĩ xử lý hàng đợi, tạo hồ sơ khám, đơn thuốc, tái khám và tệp đính kèm.", C.amberSoft, C.amber],
      ["Quản trị", "Quản lý danh mục, lịch hẹn, tài khoản, dashboard và nhật ký audit.", C.coralSoft, C.coral],
      ["Tài liệu", "Xuất phiếu đặt lịch, phiếu khám, kết quả khám PDF và thông báo email/realtime.", C.greenSoft, C.green],
      ["Mở rộng", "Đặt nền cho thanh toán, ký số PDF, HIS/LIS, SMS/Zalo và kiểm thử tự động UI.", C.slate, C.navy],
    ];
    goals.forEach((g, i) => {
      const x = 74 + (i % 3) * 386;
      const y = 212 + Math.floor(i / 3) * 174;
      card(s, x, y, 330, 128, g[0], g[1], g[2], g[3]);
    });
    footer(s, p++);
    notes(s, ["Báo cáo chương 1, chương 4 và chương 5; README mô tả các module chính."]);
  }

  // 6
  {
    const s = deck.slides.add();
    await section(s, 2, "Phân tích thiết kế", "Phần này cho thấy hệ thống được thiết kế quanh bốn vai trò và các luồng nghiệp vụ chính.", [
      ["Actor", "Guest, Patient, Doctor, Admin"],
      ["Use case", "Đặt lịch, khám, hồ sơ, quản trị"],
      ["Dữ liệu", "Lịch hẹn là trung tâm liên kết nhiều collection"],
    ], "image8.png", p++);
    notes(s, ["docs/thesis/03-use-cases.md; sơ đồ use case tổng quan trong báo cáo."]);
  }

  // 7
  {
    const s = deck.slides.add();
    s.background.fill = C.white;
    header(s, "Bốn vai trò tạo thành phạm vi hệ thống", "Mỗi actor có mục tiêu sử dụng, màn hình và quyền thao tác riêng.");
    await addLogo(s);
    await shot(s, "image8.png", { left: 70, top: 220, width: 470, height: 330 }, "Use case tổng quan", "contain");
    card(s, 610, 210, 250, 118, "Guest", "Tìm cơ sở, chuyên khoa, bác sĩ, gói khám, bài viết; đăng ký và đăng nhập.", C.blueSoft, C.blue);
    card(s, 890, 210, 250, 118, "Patient", "Đặt lịch, xem lịch hẹn, gửi yêu cầu đổi/hủy, xem hồ sơ và PDF.", C.mint, C.teal);
    card(s, 610, 372, 250, 118, "Doctor", "Xử lý hàng đợi, cập nhật trạng thái, tạo hồ sơ và quản lý lịch làm việc.", C.amberSoft, C.amber);
    card(s, 890, 372, 250, 118, "Admin", "Quản trị danh mục, người dùng, lịch hẹn, dashboard và audit log.", C.coralSoft, C.coral);
    addText(s, "Điểm quan trọng khi bảo vệ: phân quyền không chỉ nằm ở giao diện mà được kiểm tra ở middleware và service backend.", { left: 620, top: 540, width: 500, height: 46 }, { size: 18, color: C.navy, align: "center" });
    footer(s, p++);
    notes(s, ["docs/thesis/03-use-cases.md; báo cáo phần use case."]);
  }

  // 8
  {
    const s = deck.slides.add();
    s.background.fill = C.white;
    header(s, "Luồng bệnh nhân đi từ tìm kiếm đến kết quả khám", "Trải nghiệm bệnh nhân được thiết kế ngắn, rõ trạng thái và có tài liệu đi kèm.");
    await addLogo(s);
    await shot(s, "image46.png", { left: 72, top: 222, width: 300, height: 170 }, "Tìm thông tin", "contain");
    await shot(s, "image52.png", { left: 490, top: 222, width: 300, height: 170 }, "Đặt lịch", "contain");
    await shot(s, "image53.png", { left: 908, top: 222, width: 300, height: 170 }, "Theo dõi lịch", "contain");
    step(s, 1, "Chọn thông tin khám", "Cơ sở, chuyên khoa, bác sĩ, ngày và slot còn trống.", 78, 470, 330, C.blue);
    step(s, 2, "Tạo lịch và nhận xác nhận", "Backend kiểm tra trùng slot, tạo trạng thái pending và gửi thông báo.", 488, 470, 340, C.teal);
    step(s, 3, "Xem hồ sơ/PDF", "Sau khám, bệnh nhân xem kết quả, đơn thuốc, tái khám và tải PDF.", 906, 470, 330, C.coral);
    footer(s, p++);
    notes(s, ["docs/thesis/03-use-cases.md UC03-UC05; ảnh patient portal trong báo cáo."]);
  }

  // 9
  {
    const s = deck.slides.add();
    s.background.fill = C.white;
    header(s, "Doctor portal tập trung vào ca khám trong ngày", "Bác sĩ cần ít thao tác, trạng thái rõ, và có đủ thông tin để hoàn tất hồ sơ.");
    await addLogo(s);
    await shot(s, "image55.png", { left: 72, top: 212, width: 330, height: 200 }, "Dashboard bác sĩ", "contain");
    await shot(s, "image56.png", { left: 474, top: 212, width: 330, height: 200 }, "Hàng đợi khám", "contain");
    await shot(s, "image57.png", { left: 876, top: 212, width: 330, height: 200 }, "Lịch hẹn bác sĩ", "contain");
    card(s, 90, 476, 330, 108, "Xử lý hàng đợi", "Xác nhận, bắt đầu khám, hoàn thành hoặc đánh dấu bệnh nhân không đến.", C.blueSoft, C.blue);
    card(s, 475, 476, 330, 108, "Tạo hồ sơ khám", "Nhập triệu chứng, sinh hiệu, chẩn đoán, đơn thuốc, tái khám và file đính kèm.", C.mint, C.teal);
    card(s, 860, 476, 330, 108, "Bảo vệ quyền dữ liệu", "Bác sĩ chỉ xử lý lịch hẹn thuộc phạm vi được phân quyền.", C.coralSoft, C.coral);
    footer(s, p++);
    notes(s, ["docs/thesis/03-use-cases.md UC07-UC09; ảnh doctor portal trong báo cáo."]);
  }

  // 10
  {
    const s = deck.slides.add();
    s.background.fill = C.white;
    header(s, "Admin portal là trung tâm vận hành", "Admin theo dõi tình hình, xử lý yêu cầu và quản lý dữ liệu nền của phòng khám.");
    await addLogo(s);
    await shot(s, "image62.png", { left: 70, top: 210, width: 350, height: 205 }, "Dashboard quản trị", "contain");
    await shot(s, "image64.png", { left: 466, top: 210, width: 350, height: 205 }, "Quản lý lịch hẹn", "contain");
    await shot(s, "image70.png", { left: 862, top: 210, width: 350, height: 205 }, "Audit log", "contain");
    bullets(s, [
      "Quản lý cơ sở, chuyên khoa, bác sĩ, gói khám, bài viết và lịch làm việc.",
      "Xem lịch theo trạng thái, xử lý yêu cầu đổi/hủy, waiting list và thống kê hoạt động.",
      "Audit log giúp truy vết thao tác quan trọng khi vận hành hệ thống.",
    ], { left: 118, top: 498, width: 1020, height: 96 }, 20);
    footer(s, p++);
    notes(s, ["docs/thesis/03-use-cases.md UC10-UC12; ảnh admin portal trong báo cáo."]);
  }

  // 11
  {
    const s = deck.slides.add();
    s.background.fill = C.white;
    header(s, "Mô hình dữ liệu xoay quanh lịch hẹn", "Appointment là nút trung tâm liên kết bệnh nhân, bác sĩ, cơ sở, chuyên khoa và hồ sơ khám.");
    await addLogo(s);
    await shot(s, "image13.png", { left: 74, top: 220, width: 480, height: 330 }, "Sơ đồ dữ liệu tổng quan", "contain");
    const rows = [
      ["Central DB", "users, clinics, specialties, services, schedules, appointments dùng chung"],
      ["Clinic DB", "doctors, patients, appointments, medicalRecords, notifications theo chi nhánh"],
      ["Unique index", "clinicId + doctorId + date + timeSlot chặn lịch trùng"],
      ["Audit", "lưu hành động quản trị và các thay đổi nghiệp vụ cần truy vết"],
    ];
    rows.forEach((r, i) => card(s, 625, 206 + i * 90, 510, 68, r[0], r[1], i % 2 ? C.slate : C.blueSoft, i % 2 ? C.teal : C.blue));
    footer(s, p++);
    notes(s, ["README phần Database schema và phân tán dữ liệu; hình dữ liệu tổng quan trong báo cáo."]);
  }

  // 12
  {
    const s = deck.slides.add();
    s.background.fill = C.white;
    header(s, "API và bảo mật được kiểm soát theo vai trò", "Backend không chỉ nhận request mà còn chịu trách nhiệm xác thực, phân quyền và kiểm tra trạng thái hợp lệ.");
    await addLogo(s);
    card(s, 78, 220, 345, 138, "Authentication", "JWT bảo vệ API; OTP email cho đăng ký và forgot password; password policy chặn mật khẩu yếu.", C.blueSoft, C.blue);
    card(s, 466, 220, 345, 138, "Authorization", "ProtectedRoute ở frontend và auth/role middleware ở backend phân tách Patient, Doctor, Admin.", C.mint, C.teal);
    card(s, 854, 220, 345, 138, "Validation", "Kiểm tra dữ liệu đầu vào, lịch làm việc, slot trống và quyền sở hữu tài nguyên.", C.amberSoft, C.amber);
    addShape(s, "roundRect", { left: 110, top: 438, width: 1020, height: 116 }, C.deep, C.deep, { borderRadius: "rounded-lg" });
    addText(s, "Ví dụ luồng đặt lịch", { left: 150, top: 462, width: 260, height: 30 }, { size: 24, bold: true, color: C.white });
    addText(s, "Patient token → chọn clinic/doctor/date/slot → backend kiểm tra schedule → unique index chặn trùng → tạo appointment pending → gửi email và notification.", { left: 150, top: 502, width: 920, height: 34 }, { size: 19, color: "#D8EAF3" });
    footer(s, p++);
    notes(s, ["README phần Backend, Appointment API, Schedule API; docs/thesis/01-architecture.md Security Model."]);
  }

  // 13
  {
    const s = deck.slides.add();
    await section(s, 3, "Kiến trúc triển khai", "Hệ thống được tổ chức theo các lớp rõ ràng để dễ bảo trì và mở rộng chức năng.", [
      ["Frontend", "React, Router, Query, Socket client"],
      ["Backend", "Express, middleware, controller, service"],
      ["Hạ tầng", "MongoDB, PDFKit, Nodemailer, Socket.IO"],
    ], "image26.png", p++);
    notes(s, ["docs/thesis/01-architecture.md; hình kiến trúc xử lý API trong báo cáo."]);
  }

  // 14
  {
    const s = deck.slides.add();
    s.background.fill = C.white;
    header(s, "Kiến trúc 3 lớp giúp tách rõ trách nhiệm", "Frontend hiển thị theo vai trò, backend xử lý nghiệp vụ, MongoDB lưu dữ liệu vận hành.");
    await addLogo(s);
    await shot(s, "image26.png", { left: 70, top: 215, width: 560, height: 345 }, "Kiến trúc xử lý API", "contain");
    card(s, 690, 210, 410, 92, "Frontend React", "Trang public, patient portal, doctor portal và admin portal dùng chung API client.", C.blueSoft, C.blue);
    card(s, 690, 330, 410, 92, "Backend Express", "Routes, middleware, controllers, services và Mongoose models.", C.mint, C.teal);
    card(s, 690, 450, 410, 92, "Service tích hợp", "Socket.IO realtime, PDFKit xuất tài liệu, Nodemailer gửi email.", C.amberSoft, C.amber);
    footer(s, p++);
    notes(s, ["docs/thesis/01-architecture.md; README phần phân tích kiến trúc."]);
  }

  // 15
  {
    const s = deck.slides.add();
    s.background.fill = C.white;
    header(s, "Stack công nghệ phục vụ trực tiếp cho nghiệp vụ", "Mỗi công nghệ được chọn để giải quyết một nhóm vấn đề cụ thể trong hệ thống.");
    await addLogo(s);
    const tech = [
      ["React 19", "UI theo vai trò", C.blueSoft],
      ["Vite", "Build/dev nhanh", C.mint],
      ["React Query", "Cache dữ liệu API", C.amberSoft],
      ["Node.js", "Runtime backend", C.coralSoft],
      ["Express", "REST API", C.blueSoft],
      ["MongoDB", "Dữ liệu nghiệp vụ", C.mint],
      ["Socket.IO", "Realtime notification", C.amberSoft],
      ["PDFKit", "Phiếu PDF", C.coralSoft],
      ["Nodemailer", "OTP và email", C.greenSoft],
      ["JWT", "Xác thực API", C.slate],
    ];
    tech.forEach((t, i) => {
      const x = 74 + (i % 5) * 230;
      const y = 220 + Math.floor(i / 5) * 156;
      addShape(s, "roundRect", { left: x, top: y, width: 190, height: 106 }, t[2], "#B8CCE8", { borderRadius: "rounded-lg" });
      addText(s, t[0], { left: x + 16, top: y + 20, width: 158, height: 24 }, { size: 22, bold: true, color: C.navy, align: "center" });
      addText(s, t[1], { left: x + 14, top: y + 56, width: 162, height: 34 }, { size: 15, color: C.ink, align: "center" });
    });
    addText(s, "Điểm nhấn khi thuyết trình: đây không phải danh sách thư viện, mà là bản đồ trách nhiệm kỹ thuật của hệ thống.", { left: 220, top: 552, width: 840, height: 34 }, { size: 19, color: C.navy, align: "center" });
    footer(s, p++);
    notes(s, ["README và docs/thesis/01-architecture.md Technology Stack."]);
  }

  // 16
  {
    const s = deck.slides.add();
    s.background.fill = C.white;
    header(s, "State machine bảo vệ quy trình lịch hẹn", "Mọi thay đổi trạng thái phải đi qua luồng hợp lệ để tránh thao tác sai trong lúc khám.");
    await addLogo(s);
    await shot(s, "image22.png", { left: 70, top: 214, width: 560, height: 360 }, "Luồng trạng thái lịch hẹn", "contain");
    card(s, 690, 214, 420, 94, "Trạng thái chính", "pending, confirmed, in_progress, completed, cancelled, no_show.", C.blueSoft, C.blue);
    card(s, 690, 336, 420, 94, "Nhánh phát sinh", "cancel_requested, reschedule_requested và waiting list.", C.amberSoft, C.amber);
    card(s, 690, 458, 420, 94, "Đồng bộ hồ sơ", "Khi tạo MedicalRecord thành công, appointment được hoàn tất theo đúng quy trình.", C.mint, C.teal);
    footer(s, p++);
    notes(s, ["Báo cáo phần activity/state machine; docs/thesis/07-test-report.md workflow appointment."]);
  }

  // 17
  {
    const s = deck.slides.add();
    s.background.fill = C.white;
    header(s, "Triển khai tách dữ liệu theo chi nhánh", "Thiết kế Central DB và Clinic DB giúp hệ thống phù hợp mô hình nhiều cơ sở khám.");
    await addLogo(s);
    await shot(s, "image79.png", { left: 70, top: 224, width: 470, height: 330 }, "Mô hình triển khai", "contain");
    metric(s, "Central", "Dữ liệu dùng chung: user, clinic, specialty, service.", 640, 224, 220, 102, C.blueSoft);
    metric(s, "Clinic DB", "Dữ liệu vận hành từng chi nhánh: bác sĩ, lịch, hồ sơ.", 900, 224, 220, 102, C.mint);
    metric(s, "Cache", "getClinicConnection cache kết nối theo clinicId.", 640, 372, 220, 102, C.amberSoft);
    metric(s, "Scale", "Dễ tách dữ liệu và mở rộng khi số cơ sở tăng.", 900, 372, 220, 102, C.coralSoft);
    addText(s, "Khi bảo vệ, phần này giúp chứng minh đồ án có tư duy kiến trúc chứ không chỉ dừng ở CRUD.", { left: 650, top: 536, width: 470, height: 44 }, { size: 18, color: C.navy, align: "center" });
    footer(s, p++);
    notes(s, ["README phần phân tán dữ liệu theo chi nhánh; hình mô hình triển khai trong báo cáo."]);
  }

  // 18
  {
    const s = deck.slides.add();
    await section(s, 4, "Sản phẩm & kiểm thử", "Phần triển khai chứng minh các thiết kế phía trước đã trở thành giao diện và luồng chạy được.", [
      ["Patient", "Đặt lịch và theo dõi hồ sơ"],
      ["Doctor", "Hàng đợi, khám và tạo hồ sơ"],
      ["Admin", "Quản trị, audit và dashboard"],
    ], "image55.png", p++);
    notes(s, ["Báo cáo chương 4; ảnh giao diện triển khai trong báo cáo."]);
  }

  // 19
  {
    const s = deck.slides.add();
    s.background.fill = C.white;
    header(s, "Giao diện public và patient portal", "Nhóm màn hình này phục vụ việc tìm kiếm thông tin, đặt lịch và tự theo dõi sau khám.");
    await addLogo(s);
    await shot(s, "image46.png", { left: 70, top: 210, width: 520, height: 235 }, "Trang chủ", "contain");
    await shot(s, "image52.png", { left: 690, top: 210, width: 520, height: 235 }, "Form đặt lịch", "contain");
    card(s, 86, 500, 320, 92, "Tìm kiếm trước khi đặt", "Người dùng có thể xem cơ sở, chuyên khoa, bác sĩ, gói khám và bài viết.", C.blueSoft, C.blue);
    card(s, 480, 500, 320, 92, "Đặt lịch có kiểm tra", "Slot được lấy theo lịch làm việc và được backend kiểm tra trước khi tạo.", C.mint, C.teal);
    card(s, 874, 500, 320, 92, "Theo dõi sau khám", "Bệnh nhân xem lịch, hồ sơ, tải PDF và gửi đánh giá bác sĩ.", C.amberSoft, C.amber);
    footer(s, p++);
    notes(s, ["Ảnh giao diện public/patient trong báo cáo; docs/thesis/09-user-manual.md."]);
  }

  // 20
  {
    const s = deck.slides.add();
    s.background.fill = C.white;
    header(s, "Doctor và Admin portal hỗ trợ vận hành", "Hai nhóm giao diện này giúp hệ thống vận hành trong ngày khám và kiểm soát dữ liệu.");
    await addLogo(s);
    await shot(s, "image55.png", { left: 70, top: 210, width: 348, height: 188 }, "Doctor dashboard", "contain");
    await shot(s, "image56.png", { left: 466, top: 210, width: 348, height: 188 }, "Doctor queue", "contain");
    await shot(s, "image62.png", { left: 862, top: 210, width: 348, height: 188 }, "Admin dashboard", "contain");
    await shot(s, "image64.png", { left: 70, top: 452, width: 348, height: 130 }, "Admin appointments", "contain");
    await shot(s, "image70.png", { left: 466, top: 452, width: 348, height: 130 }, "Audit log", "contain");
    await shot(s, "image71.png", { left: 862, top: 452, width: 348, height: 130 }, "Notification", "contain");
    footer(s, p++);
    notes(s, ["Ảnh doctor/admin portal trong báo cáo; docs/thesis/10-doctor-manual.md và 11-admin-manual.md."]);
  }

  // 21
  {
    const s = deck.slides.add();
    s.background.fill = C.white;
    header(s, "PDF, thông báo và AI làm hệ thống hoàn chỉnh hơn", "Các chức năng hỗ trợ giúp quy trình không dừng ở CRUD mà gần với vận hành thực tế.");
    await addLogo(s);
    await shot(s, "image73.png", { left: 76, top: 210, width: 230, height: 346 }, "Phiếu đặt lịch", "contain");
    await shot(s, "image74.png", { left: 338, top: 210, width: 230, height: 346 }, "Phiếu khám", "contain");
    await shot(s, "image76.png", { left: 600, top: 210, width: 230, height: 346 }, "Kết quả khám", "contain");
    card(s, 892, 220, 300, 94, "Realtime", "Socket.IO cập nhật notification theo user hoặc vai trò.", C.mint, C.teal);
    card(s, 892, 344, 300, 94, "Email", "Nodemailer gửi OTP, xác nhận lịch và thông báo liên quan.", C.blueSoft, C.blue);
    card(s, 892, 468, 300, 94, "AI", "Tư vấn triệu chứng hỗ trợ người dùng mô tả nhu cầu khám ban đầu.", C.coralSoft, C.coral);
    footer(s, p++);
    notes(s, ["docs/thesis/01-architecture.md PDF/Reatime Model; ảnh PDF, notification và AI trong báo cáo."]);
  }

  // 22
  {
    const s = deck.slides.add();
    s.background.fill = C.white;
    header(s, "Kiểm thử tập trung vào luồng nghiệp vụ lõi", "Mục tiêu kiểm thử là bảo đảm các luồng bảo vệ đồ án có thể chạy từ đầu đến cuối.");
    await addLogo(s);
    const tests = [
      ["Auth", "Đăng ký, OTP, đăng nhập, đổi mật khẩu, forgot password cooldown"],
      ["Booking", "Đặt lịch, chặn trùng slot, chặn đặt lịch quá khứ"],
      ["Workflow", "pending → confirmed → in_progress; chặn chuyển trạng thái sai"],
      ["MedicalRecord", "Tạo hồ sơ, chặn tạo trùng, phân quyền xem/tải PDF"],
      ["Operation", "Waiting list, notification persistence, audit log, filter lịch bác sĩ"],
    ];
    tests.forEach((t, i) => card(s, 100, 208 + i * 76, 760, 56, t[0], t[1], i % 2 ? C.slate : C.blueSoft, i % 2 ? C.teal : C.blue));
    metric(s, "24/24", "Automated smoke test passed", 930, 236, 210, 104, C.mint);
    metric(s, "0", "Failed case trong lần chạy gần nhất", 930, 372, 210, 104, C.coralSoft);
    metric(s, "6", "Viewport trong checklist responsive", 930, 508, 210, 104, C.amberSoft);
    footer(s, p++);
    notes(s, ["docs/thesis/07-test-report.md: Automated Smoke Test và Covered Flows."]);
  }

  // 23
  {
    const s = deck.slides.add();
    s.background.fill = C.white;
    header(s, "Bảng kết quả kiểm thử", "Các nhóm chức năng quan trọng đều đạt trong phạm vi kiểm thử của đồ án.");
    await addLogo(s);
    const rows = [
      ["1", "Xác thực", "Đăng ký, OTP, login, password policy", "Đạt"],
      ["2", "Đặt lịch", "Slot, trạng thái, chặn trùng và chặn ngày quá khứ", "Đạt"],
      ["3", "Khám bệnh", "Hàng đợi, hồ sơ khám, hoàn tất lịch", "Đạt"],
      ["4", "PDF", "Phiếu đặt lịch, phiếu khám, kết quả khám", "Đạt"],
      ["5", "Phân quyền", "Patient, Doctor, Admin và ownership dữ liệu", "Đạt"],
      ["6", "Vận hành", "Notification, waiting list, audit log", "Đạt"],
    ];
    const x = [82, 150, 360, 908];
    const w = [68, 210, 548, 150];
    ["STT", "Nhóm", "Nội dung", "Kết quả"].forEach((h, i) => {
      addShape(s, "rect", { left: x[i], top: 220, width: w[i], height: 46 }, C.navy, C.navy);
      addText(s, h, { left: x[i] + 8, top: 233, width: w[i] - 16, height: 20 }, { size: 16, bold: true, color: C.white, align: "center" });
    });
    rows.forEach((r, ri) => {
      const y = 266 + ri * 48;
      const fill = ri % 2 ? C.slate : C.white;
      r.forEach((v, i) => {
        addShape(s, "rect", { left: x[i], top: y, width: w[i], height: 48 }, fill, C.line);
        addText(s, v, { left: x[i] + 10, top: y + 14, width: w[i] - 20, height: 20 }, { size: 15, color: C.ink, align: i === 2 ? "left" : "center" });
      });
    });
    addText(s, "Kết quả kiểm thử dùng để chứng minh hệ thống đã vượt qua các rủi ro chính: trùng lịch, sai trạng thái, sai quyền và lỗi tài liệu PDF.", { left: 150, top: 584, width: 880, height: 38 }, { size: 18, color: C.navy, align: "center" });
    footer(s, p++);
    notes(s, ["docs/thesis/07-test-report.md: Covered Flows và kết quả 24/24."]);
  }

  // 24
  {
    const s = deck.slides.add();
    s.background.fill = C.white;
    header(s, "Đóng góp chính của đồ án", "Clinic Booking hoàn thiện một chuỗi nghiệp vụ khám bệnh trực tuyến thay vì chỉ một chức năng đặt lịch đơn lẻ.");
    await addLogo(s);
    card(s, 80, 214, 340, 190, "Nghiệp vụ end-to-end", "Từ tìm kiếm, đặt lịch, xác nhận, khám, tạo hồ sơ, xuất PDF đến đánh giá bác sĩ.", C.blueSoft, C.blue);
    card(s, 470, 214, 340, 190, "Kiến trúc có phân lớp", "Frontend, API, service, model, realtime, PDF và email được tách trách nhiệm rõ ràng.", C.mint, C.teal);
    card(s, 860, 214, 340, 190, "Kiểm soát vận hành", "Phân quyền, trạng thái lịch hẹn, audit log và dashboard hỗ trợ quản trị hệ thống.", C.amberSoft, C.amber);
    addShape(s, "roundRect", { left: 160, top: 470, width: 960, height: 96 }, C.deep, C.deep, { borderRadius: "rounded-lg" });
    addText(s, "Thông điệp kết luận", { left: 200, top: 492, width: 260, height: 26 }, { size: 22, bold: true, color: C.teal });
    addText(s, "Đồ án đã xây dựng được nền tảng khả thi cho một hệ thống đặt lịch khám trực tuyến có thể tiếp tục mở rộng theo hướng sản phẩm thực tế.", { left: 200, top: 526, width: 880, height: 28 }, { size: 19, color: C.white });
    footer(s, p++);
    notes(s, ["Báo cáo chương 5; docs/thesis/README.md tổng hợp phạm vi tài liệu."]);
  }

  // 25
  {
    const s = deck.slides.add();
    s.background.fill = C.white;
    header(s, "Hạn chế hiện tại và hướng phát triển", "Phần này thể hiện nhận thức về phạm vi đồ án và kế hoạch nâng cấp hợp lý.");
    await addLogo(s);
    card(s, 90, 220, 500, 310, "Hạn chế", "• Chưa kiểm thử tải lớn với nhiều người dùng đồng thời.\n• Chưa có kiểm thử bảo mật chuyên sâu.\n• Automation UI chưa bao phủ toàn bộ luồng.\n• Triển khai production cần hardening thêm về log, backup, monitoring và secrets.", C.coralSoft, C.coral);
    card(s, 690, 220, 500, 310, "Hướng phát triển", "• Thanh toán online và hóa đơn điện tử.\n• Ký số PDF và tích hợp HIS/LIS.\n• SMS/Zalo nhắc lịch, telemedicine.\n• Báo cáo phân tích nâng cao, test UI tự động và quan sát hệ thống.", C.mint, C.teal);
    footer(s, p++);
    notes(s, ["Báo cáo chương 5: hạn chế và hướng phát triển."]);
  }

  // 26
  {
    const s = deck.slides.add();
    s.background.fill = C.deep;
    await addLogo(s, 466, 58, 348, 112);
    addText(s, "Xin cảm ơn hội đồng", { left: 170, top: 274, width: 940, height: 76 }, { size: 56, bold: true, color: C.white, align: "center" });
    addText(s, "Clinic Booking - hệ thống đặt lịch khám và quản lý hồ sơ khám trực tuyến", { left: 220, top: 370, width: 840, height: 38 }, { size: 25, color: "#DCECF4", align: "center" });
    addShape(s, "rect", { left: 420, top: 454, width: 300, height: 6 }, C.teal);
    addShape(s, "rect", { left: 736, top: 454, width: 80, height: 6 }, C.coral);
    addText(s, "Sẵn sàng trao đổi thêm về nghiệp vụ, kiến trúc, dữ liệu và kiểm thử.", { left: 250, top: 510, width: 780, height: 30 }, { size: 20, color: C.white, align: "center" });
    footer(s, p++);
    notes(s, ["Slide kết thúc do tác giả tạo mới cho deck bảo vệ."]);
  }

  for (let i = 0; i < deck.slides.items.length; i++) {
    const slide = deck.slides.items[i];
    const stem = `slide-${String(i + 1).padStart(2, "0")}`;
    const png = await deck.export({ slide, format: "png", scale: 1 });
    await fs.writeFile(path.join(OUT, `${stem}.png`), Buffer.from(await png.arrayBuffer()));
    const layout = await slide.export({ format: "layout" });
    await fs.writeFile(path.join(OUT, `${stem}.layout.json`), await layout.text(), "utf8");
  }
  const montage = await deck.export({ format: "webp", montage: true, scale: 1 });
  await fs.writeFile(path.join(OUT, "deck-montage.webp"), Buffer.from(await montage.arrayBuffer()));
  const inspect = await deck.inspect({ kind: "slide,textbox,shape,image,notes", maxChars: 50000 });
  await fs.writeFile(path.join(OUT, "inspect.ndjson"), inspect.ndjson, "utf8");
  const pptx = await PresentationFile.exportPptx(deck);
  await pptx.save(FINAL);
  return { final: FINAL, slides: deck.slides.items.length, out: OUT };
}

export default build;
