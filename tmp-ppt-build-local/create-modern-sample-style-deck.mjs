import fs from "node:fs/promises";
import path from "node:path";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const W = 1280;
const H = 720;
const ROOT = "C:\\Users\\DELL\\Documents\\Codex\\2026-05-27\\clinic-booking";
const MEDIA = path.join(ROOT, "tmp-ppt-build", "docm", "word", "media");
const OUT = path.join(ROOT, "tmp-ppt-build-local", "rendered-clinic-own-style");
const FINAL = path.join(ROOT, "Clinic_Booking_Ban_Ra_Soat_Net_Rieng.pptx");

const C = {
  navy: "#123C69",
  deep: "#0B2742",
  teal: "#00A6A6",
  sky: "#EAF7FA",
  coral: "#F9735B",
  orange: "#F9735B",
  ink: "#1F2937",
  text: "#4B5563",
  line: "#D8DEE8",
  soft: "#F7FAFC",
  blueSoft: "#EEF5FF",
  greenSoft: "#ECFDF5",
  amberSoft: "#FFF7E8",
  lilacSoft: "#F5F0FF",
  roseSoft: "#FFF1F2",
  white: "#FFFFFF",
};

async function imageBytes(name) {
  const bytes = await fs.readFile(path.join(MEDIA, name));
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

function mimeType(name) {
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

function addFooter(slide, n) {
  slide.shapes.add({
    geometry: "rect",
    position: { left: 0, top: 670, width: W, height: 50 },
    fill: C.deep,
    line: { style: "solid", fill: C.deep, width: 0 },
  });
  slide.shapes.add({
    geometry: "rect",
    position: { left: 0, top: 662, width: W, height: 8 },
    fill: C.teal,
    line: { style: "solid", fill: C.teal, width: 0 },
  });
  slide.shapes.add({
    geometry: "rect",
    position: { left: 0, top: 662, width: 180, height: 8 },
    fill: C.coral,
    line: { style: "solid", fill: C.coral, width: 0 },
  });
  addText(slide, "Clinic Booking", { left: 72, top: 682, width: 170, height: 20 }, { size: 14, color: C.white, bold: true });
  addText(slide, "Đồ án tốt nghiệp - 08/2026", { left: 505, top: 682, width: 270, height: 20 }, { size: 14, color: C.white, align: "center" });
  addText(slide, String(n), { left: 1214, top: 680, width: 28, height: 22 }, { size: 16, color: C.white, align: "right" });
}

async function addLogo(slide, x, y, w, h) {
  slide.images.add({
    blob: await imageBytes("image1.jpeg"),
    contentType: mimeType("image1.jpeg"),
    alt: "Phenikaa University",
    fit: "contain",
    position: { left: x, top: y, width: w, height: h },
  });
}

async function addImage(slide, name, box, fit = "contain", alt = name) {
  slide.images.add({
    blob: await imageBytes(name),
    contentType: mimeType(name),
    alt,
    fit,
    position: box,
  });
}

function titleBracket(slide, title, subtitle = "", opts = {}) {
  const x = Math.max(opts.x ?? 72, 64);
  const y = Math.max(opts.y ?? 46, 40);
  addText(slide, "CLINIC BOOKING", { left: x, top: y, width: 220, height: 18 }, { size: 13, bold: true, color: C.teal });
  addText(slide, title, { left: x, top: y + 24, width: 920, height: 62 }, { size: opts.size ?? 42, bold: true, color: C.navy });
  slide.shapes.add({ geometry: "rect", position: { left: x, top: y + 96, width: opts.w ?? 360, height: 5 }, fill: C.teal, line: { style: "solid", fill: C.teal, width: 0 } });
  slide.shapes.add({ geometry: "rect", position: { left: x + (opts.w ?? 360) + 10, top: y + 96, width: 70, height: 5 }, fill: C.coral, line: { style: "solid", fill: C.coral, width: 0 } });
  if (subtitle) addText(slide, subtitle, { left: x, top: y + 116, width: 980, height: 44 }, { size: 19, color: C.text });
}

async function sectionDivider(slide, num, title) {
  const meta = {
    3: ["image46.png", "Bối cảnh bài toán và mục tiêu đồ án"],
    6: ["image8.png", "Từ yêu cầu người dùng đến mô hình nghiệp vụ"],
    11: ["image26.png", "Các lớp xử lý giúp hệ thống dễ mở rộng"],
    15: ["image55.png", "Sản phẩm đã triển khai theo từng vai trò sử dụng"],
  }[num] ?? ["image46.png", "Clinic Booking"];
  slide.background.fill = C.white;
  await addLogo(slide, 1100, 22, 150, 58);
  slide.shapes.add({ geometry: "rect", position: { left: 0, top: 0, width: 380, height: 662 }, fill: C.sky, line: { style: "solid", fill: C.sky, width: 0 } });
  await addImage(slide, meta[0], { left: 54, top: 150, width: 300, height: 350 }, "contain", title);
  slide.shapes.add({ geometry: "rect", position: { left: 0, top: 0, width: 380, height: 662 }, fill: { color: C.teal, transparency: 86000 }, line: { style: "solid", fill: "none", width: 0 } });
  slide.shapes.add({ geometry: "roundRect", position: { left: 76, top: 92, width: 112, height: 112 }, fill: C.deep, line: { style: "solid", fill: C.deep, width: 0 }, borderRadius: "rounded-lg" });
  addText(slide, String(num).padStart(2, "0"), { left: 76, top: 119, width: 112, height: 42 }, { size: 38, bold: true, color: C.white, align: "center" });
  addText(slide, "SECTION", { left: 210, top: 126, width: 110, height: 20 }, { size: 14, bold: true, color: C.teal });
  addText(slide, title, { left: 448, top: 228, width: 650, height: 84 }, { size: 58, bold: true, color: C.navy });
  slide.shapes.add({ geometry: "rect", position: { left: 450, top: 332, width: 330, height: 6 }, fill: C.teal, line: { style: "solid", fill: C.teal, width: 0 } });
  slide.shapes.add({ geometry: "rect", position: { left: 792, top: 332, width: 74, height: 6 }, fill: C.coral, line: { style: "solid", fill: C.coral, width: 0 } });
  addText(slide, meta[1], { left: 450, top: 368, width: 650, height: 70 }, { size: 24, color: C.text });
  addFooter(slide, num);
}

function card(slide, x, y, w, h, title, body, fill) {
  slide.shapes.add({
    geometry: "roundRect",
    position: { left: x, top: y, width: w, height: h },
    fill,
    line: { style: "solid", fill: "#B9C8E6", width: 1 },
    borderRadius: "rounded-lg",
  });
  addText(slide, title, { left: x + 18, top: y + 18, width: w - 36, height: 30 }, { size: 24, bold: true, color: C.navy, align: "center" });
  addText(slide, body, { left: x + 16, top: y + 62, width: w - 32, height: h - 76 }, { size: 17, color: C.ink, align: "center" });
}

function panel(slide, x, y, w, h, fill = C.soft) {
  slide.shapes.add({
    geometry: "rect",
    position: { left: x, top: y, width: w, height: h },
    fill,
    line: { style: "solid", fill: C.line, width: 1 },
  });
}

function metricCard(slide, x, y, w, h, value, label, fill) {
  slide.shapes.add({
    geometry: "roundRect",
    position: { left: x, top: y, width: w, height: h },
    fill,
    line: { style: "solid", fill: "#B9C8E6", width: 1 },
    borderRadius: "rounded-lg",
  });
  addText(slide, value, { left: x + 16, top: y + 16, width: w - 32, height: 34 }, { size: 28, bold: true, color: C.navy, align: "center" });
  addText(slide, label, { left: x + 16, top: y + 54, width: w - 32, height: 50 }, { size: 17, color: C.ink, align: "center" });
}

function bullets(slide, items, box, size = 19) {
  addText(slide, items.map((item) => `• ${item}`).join("\n"), box, { size, color: C.ink });
}

function note(slide, lines) {
  slide.speakerNotes.textFrame.setText(lines);
  slide.speakerNotes.setVisible(true);
}

async function imagePanel(slide, name, box, label, fit = "contain") {
  slide.shapes.add({
    geometry: "rect",
    position: { left: box.left - 10, top: box.top - 10, width: box.width + 20, height: box.height + 20 },
    fill: C.white,
    line: { style: "solid", fill: C.line, width: 1 },
  });
  await addImage(slide, name, box, fit, label);
  addText(slide, label, { left: box.left, top: box.top + box.height + 6, width: box.width, height: 24 }, { size: 14, color: C.text, align: "center" });
}

async function main() {
  await fs.rm(OUT, { recursive: true, force: true });
  await fs.mkdir(OUT, { recursive: true });
  const deck = Presentation.create({ slideSize: { width: W, height: H } });
  let n = 1;

  // 1 Cover
  {
    const s = deck.slides.add();
    s.background.fill = C.navy;
    await addLogo(s, 420, 48, 440, 130);
    addText(s, "Clinic Booking", { left: 124, top: 228, width: 1030, height: 84 }, { size: 58, bold: true, color: C.white, align: "center" });
    addText(s, "Hệ thống đặt lịch khám và quản lý hồ sơ khám trực tuyến", { left: 150, top: 320, width: 980, height: 88 }, { size: 30, color: C.white, align: "center" });
    addText(s, "Sinh viên thực hiện: Đinh Xuân Quyền  |  Mã SV: 22010342  |  GVHD: ...", { left: 120, top: 470, width: 1040, height: 36 }, { size: 21, color: C.white, align: "center" });
    addText(s, "08/2026", { left: 520, top: 536, width: 220, height: 40 }, { size: 30, bold: true, color: C.white, align: "center" });
    addText(s, "Hà Nội 2026", { left: 530, top: 630, width: 200, height: 26 }, { size: 24, color: C.white, align: "center" });
    addFooter(s, n++);
    note(s, ["[Sources]", "Báo cáo Word và ảnh logo Phenikaa University trong file báo cáo."]);
  }

  // 2 Agenda
  {
    const s = deck.slides.add();
    s.background.fill = C.white;
    titleBracket(s, "Nội dung trình bày", "", { x: 430, y: 52, w: 310, h: 110, size: 46 });
    await addLogo(s, 1100, 22, 150, 58);
    addFooter(s, n++);
    await imagePanel(s, "image46.png", { left: 0, top: 0, width: 360, height: 660 }, "", "cover");
    const agenda = [
      "Mở đầu",
      "Phân tích thiết kế hệ thống",
      "Kiến trúc triển khai",
      "Triển khai hệ thống",
      "Kết luận",
    ];
    agenda.forEach((item, idx) => {
      const y = 174 + idx * 96;
      s.shapes.add({ geometry: "ellipse", position: { left: 374, top: y + 8, width: 64, height: 64 }, fill: C.navy, line: { style: "solid", fill: C.navy, width: 0 } });
      addText(s, String(idx + 1), { left: 374, top: y + 20, width: 64, height: 28 }, { size: 26, bold: true, color: C.white, align: "center" });
      addText(s, item, { left: 458, top: y + 8, width: 700, height: 50 }, { size: 28, bold: true, color: C.navy });
      s.shapes.add({ geometry: "rect", position: { left: 458, top: y + 72, width: 700, height: 1 }, fill: "#D3D6DA", line: { style: "solid", fill: "#D3D6DA", width: 0 } });
    });
    note(s, ["[Sources]", "Cấu trúc agenda rút từ mẫu Slide_DATN_BuyTheBest_Mac_Duc_Dung.pptx."]);
  }

  // 3 divider
  {
    const s = deck.slides.add();
    await sectionDivider(s, n++, "Mở đầu");
    note(s, ["[Sources]", "Mẫu slide divider trong deck tham chiếu."]);
  }

  // 4 problem/reason
  {
    const s = deck.slides.add();
    s.background.fill = C.white;
    titleBracket(s, "Lý do chọn đề tài", "", { x: 28, y: 28, w: 290, h: 110, size: 46 });
    await addLogo(s, 1100, 22, 150, 58);
    addFooter(s, n++);
    addText(s, "• Đặt lịch thủ công dễ trùng slot và khó kiểm soát.\n• Lịch hẹn, hồ sơ và PDF tách rời nhau.\n• Bác sĩ và admin thiếu dashboard vận hành.\n• Hệ thống cần phân quyền rõ và có thể mở rộng.", { left: 78, top: 230, width: 500, height: 320 }, { size: 27, color: C.ink });
    await imagePanel(s, "image46.png", { left: 670, top: 112, width: 410, height: 115 }, "Trang chủ / giới thiệu", "contain");
    await imagePanel(s, "image47.png", { left: 670, top: 242, width: 410, height: 98 }, "Đăng nhập", "contain");
    await imagePanel(s, "image52.png", { left: 670, top: 356, width: 410, height: 98 }, "Đặt lịch", "contain");
    await imagePanel(s, "image55.png", { left: 670, top: 470, width: 410, height: 120 }, "Dashboard bác sĩ", "contain");
    note(s, ["[Sources]", "Báo cáo: phần mở đầu, lợi ích hệ thống, ảnh giao diện chính."]);
  }

  // 5 objectives
  {
    const s = deck.slides.add();
    s.background.fill = C.white;
    titleBracket(s, "Mục tiêu đề tài", "", { x: 28, y: 28, w: 270, h: 110, size: 46 });
    await addLogo(s, 1100, 22, 150, 58);
    addFooter(s, n++);
    const cards = [
      ["Tài khoản", "Đăng ký, xác thực email, đăng nhập và đổi mật khẩu.", C.blueSoft],
      ["Đặt lịch", "Chọn cơ sở, chuyên khoa, bác sĩ, ngày và khung giờ.", C.greenSoft],
      ["Hồ sơ", "Tạo, lưu và xem lại hồ sơ khám, đính kèm tài liệu.", C.amberSoft],
      ["Bác sĩ", "Xử lý hàng đợi, cập nhật trạng thái và tạo kết quả.", C.lilacSoft],
      ["Quản trị", "Dashboard, danh mục, tài khoản, lịch hẹn và audit.", "#F6F8FC"],
      ["Mở rộng", "PDF, realtime, email, AI và hướng phát triển.", C.roseSoft],
    ];
    cards.forEach((c1, i) => {
      const x = 80 + (i % 3) * 360;
      const y = i < 3 ? 238 : 426;
      card(s, x, y, 300, 128, c1[0], c1[1], c1[2]);
    });
    note(s, ["[Sources]", "Tổng hợp từ Chương 1, Chương 2, Chương 5 của báo cáo."]);
  }

  // 6 divider
  {
    const s = deck.slides.add();
    await sectionDivider(s, n++, "Phân tích thiết kế");
    note(s, ["[Sources]", "Mẫu slide divider trong deck tham chiếu."]);
  }

  // 7 use case overview
  {
    const s = deck.slides.add();
    s.background.fill = C.white;
    titleBracket(s, "Use case tổng quan", "", { x: 28, y: 28, w: 300, h: 110, size: 46 });
    await addLogo(s, 1100, 22, 150, 58);
    addFooter(s, n++);
    await imagePanel(s, "image8.png", { left: 80, top: 218, width: 500, height: 330 }, "Sơ đồ use case tổng quan", "contain");
    metricCard(s, 658, 232, 240, 112, "Patient", "Đặt lịch, xem lịch hẹn, xem hồ sơ và tải PDF.", C.blueSoft);
    metricCard(s, 928, 232, 240, 112, "Doctor", "Xử lý hàng đợi, tạo hồ sơ khám và lịch làm việc.", C.greenSoft);
    metricCard(s, 658, 372, 240, 112, "Admin", "Quản lý danh mục, lịch hẹn, người dùng và audit log.", C.amberSoft);
    metricCard(s, 928, 372, 240, 112, "Guest", "Tra cứu công khai, đăng ký và đăng nhập.", C.lilacSoft);
    addText(s, "Bốn vai trò trên cùng chia sẻ dữ liệu lõi nhưng khác nhau về quyền thao tác và màn hình làm việc.", { left: 650, top: 524, width: 500, height: 56 }, { size: 18, color: C.text, align: "center" });
    note(s, ["[Sources]", "Báo cáo: sơ đồ use case tổng quan."]);
  }

  // 8 patient flow
  {
    const s = deck.slides.add();
    s.background.fill = C.white;
    titleBracket(s, "Luồng bệnh nhân", "", { x: 28, y: 28, w: 260, h: 110, size: 46 });
    await addLogo(s, 1100, 22, 150, 58);
    addFooter(s, n++);
    addText(s, "Bệnh nhân là người dùng trung tâm của hệ thống, nên luồng của họ phải ngắn, rõ trạng thái và có tài liệu đi kèm.", { left: 74, top: 154, width: 1080, height: 32 }, { size: 20, color: C.text });
    await imagePanel(s, "image52.png", { left: 80, top: 214, width: 328, height: 182 }, "Đặt lịch", "contain");
    await imagePanel(s, "image53.png", { left: 476, top: 214, width: 328, height: 182 }, "Lịch hẹn", "contain");
    await imagePanel(s, "image75.png", { left: 872, top: 214, width: 328, height: 182 }, "Hồ sơ / PDF", "contain");
    panel(s, 88, 456, 1110, 110, C.soft);
    bullets(s, ["Chọn cơ sở, chuyên khoa, bác sĩ, ngày và slot còn trống.", "Theo dõi các trạng thái pending, confirmed, in_progress, completed, cancelled.", "Yêu cầu đổi hoặc hủy lịch khi đủ điều kiện và xem lại kết quả khám."], { left: 120, top: 478, width: 1030, height: 56 }, 18);
    note(s, ["[Sources]", "Báo cáo: ảnh giao diện patient portal và phần quy trình đặt lịch."]);
  }

  // 9 doctor flow
  {
    const s = deck.slides.add();
    s.background.fill = C.white;
    titleBracket(s, "Luồng bác sĩ", "", { x: 28, y: 28, w: 240, h: 110, size: 46 });
    await addLogo(s, 1100, 22, 150, 58);
    addFooter(s, n++);
    addText(s, "Mục tiêu của doctor portal là giảm thao tác lặp lại trong giờ khám và đưa bác sĩ đến đúng màn hình cần thao tác ngay.", { left: 74, top: 154, width: 1080, height: 32 }, { size: 20, color: C.text });
    await imagePanel(s, "image55.png", { left: 80, top: 214, width: 328, height: 182 }, "Dashboard", "contain");
    await imagePanel(s, "image56.png", { left: 476, top: 214, width: 328, height: 182 }, "Hàng đợi", "contain");
    await imagePanel(s, "image57.png", { left: 872, top: 214, width: 328, height: 182 }, "Lịch hẹn", "contain");
    panel(s, 88, 456, 1110, 110, C.soft);
    bullets(s, ["Bác sĩ xem danh sách khám trong ngày, gọi vào khám và chuyển trạng thái theo quy trình.", "Tạo hồ sơ khám gồm triệu chứng, sinh hiệu, chẩn đoán, đơn thuốc, tái khám và tệp đính kèm.", "Lịch làm việc và thông tin chuyên môn giúp bác sĩ quản lý ca làm chính xác hơn."], { left: 120, top: 478, width: 1030, height: 56 }, 18);
    note(s, ["[Sources]", "Báo cáo: ảnh giao diện doctor portal."]);
  }

  // 10 admin flow
  {
    const s = deck.slides.add();
    s.background.fill = C.white;
    titleBracket(s, "Luồng quản trị", "", { x: 28, y: 28, w: 280, h: 110, size: 46 });
    await addLogo(s, 1100, 22, 150, 58);
    addFooter(s, n++);
    addText(s, "Admin nhìn toàn cục hệ thống: dữ liệu nền, lịch hẹn, tài khoản và các nhật ký vận hành đều phải đi qua khu vực này.", { left: 74, top: 154, width: 1080, height: 32 }, { size: 20, color: C.text });
    await imagePanel(s, "image62.png", { left: 80, top: 214, width: 328, height: 182 }, "Dashboard", "contain");
    await imagePanel(s, "image64.png", { left: 476, top: 214, width: 328, height: 182 }, "Lịch hẹn", "contain");
    await imagePanel(s, "image70.png", { left: 872, top: 214, width: 328, height: 182 }, "Audit log", "contain");
    panel(s, 88, 456, 1110, 110, C.soft);
    bullets(s, ["Quản lý cơ sở, chuyên khoa, bác sĩ, gói khám và bài viết.", "Xử lý các yêu cầu vận hành như lịch chờ, sửa lịch và theo dõi lịch sử thao tác.", "Audit log là điểm rất quan trọng khi trình bày với hội đồng vì thể hiện khả năng kiểm soát hệ thống."], { left: 120, top: 478, width: 1030, height: 56 }, 18);
    note(s, ["[Sources]", "Báo cáo: ảnh giao diện admin portal và audit log."]);
  }

  // 11 divider
  {
    const s = deck.slides.add();
    await sectionDivider(s, n++, "Kiến trúc");
    note(s, ["[Sources]", "Mẫu slide divider trong deck tham chiếu."]);
  }

  // 12 technologies
  {
    const s = deck.slides.add();
    s.background.fill = C.white;
    titleBracket(s, "Công nghệ sử dụng", "", { x: 28, y: 28, w: 330, h: 110, size: 46 });
    await addLogo(s, 1100, 22, 150, 58);
    addFooter(s, n++);
    const techCards = [
      ["React", "Giao diện người dùng, layout theo vai trò", C.blueSoft],
      ["Vite", "Cấu hình build và dev server nhanh", C.greenSoft],
      ["Node.js", "Runtime backend", C.amberSoft],
      ["Express", "REST API và middleware", C.lilacSoft],
      ["MongoDB", "Lưu dữ liệu nghiệp vụ", "#F7F8FB"],
      ["Socket.IO", "Thông báo realtime", C.roseSoft],
      ["PDFKit", "Xuất tài liệu PDF", C.blueSoft],
      ["Nodemailer", "OTP và email thông báo", C.greenSoft],
    ];
    techCards.forEach((item, i) => {
      const x = 72 + (i % 4) * 284;
      const y = 220 + Math.floor(i / 4) * 168;
      card(s, x, y, 240, 126, item[0], item[1], item[2]);
    });
    addText(s, "Bảng công nghệ trong báo cáo được tóm tắt theo vai trò của từng thành phần trong hệ thống.", { left: 180, top: 548, width: 920, height: 28 }, { size: 22, color: C.navy, align: "center" });
    note(s, ["[Sources]", "README và các file thiết kế kiến trúc trong thư mục docs/thesis."]);
  }

  // 13 architecture
  {
    const s = deck.slides.add();
    s.background.fill = C.white;
    titleBracket(s, "Kiến trúc xử lý", "", { x: 28, y: 28, w: 300, h: 110, size: 46 });
    await addLogo(s, 1100, 22, 150, 58);
    addFooter(s, n++);
    await imagePanel(s, "image26.png", { left: 70, top: 204, width: 522, height: 348 }, "Kiến trúc xử lý API", "contain");
    panel(s, 652, 220, 468, 284, C.soft);
    bullets(s, ["Frontend gọi API và nhận cập nhật realtime qua Socket.IO.", "Backend chia lớp route, middleware, controller, service, model.", "Service xử lý slot, trạng thái lịch, hồ sơ, PDF, email và thông báo.", "Kiến trúc này giúp luồng nghiệp vụ kiểm soát được theo từng bước."], { left: 686, top: 256, width: 400, height: 178 }, 18);
    note(s, ["[Sources]", "Báo cáo: sơ đồ kiến trúc xử lý API."]);
  }

  // 14 state machine
  {
    const s = deck.slides.add();
    s.background.fill = C.white;
    titleBracket(s, "Lịch hẹn như một state machine", "", { x: 28, y: 28, w: 490, h: 110, size: 44 });
    await addLogo(s, 1100, 22, 150, 58);
    addFooter(s, n++);
    await imagePanel(s, "image22.png", { left: 74, top: 220, width: 544, height: 346 }, "Luồng trạng thái lịch hẹn", "contain");
    panel(s, 656, 244, 478, 272, C.amberSoft);
    bullets(s, ["Trạng thái chính: pending, confirmed, in_progress, completed, cancelled, no_show.", "Nhánh phụ: cancel_requested, reschedule_requested, waiting list.", "Backend kiểm tra trạng thái hợp lệ trước khi cập nhật.", "Hoàn tất hồ sơ khám sẽ đồng bộ trạng thái lịch hẹn."], { left: 692, top: 286, width: 404, height: 168 }, 18);
    addText(s, "Ràng buộc trạng thái giúp tránh thao tác sai khi khám bệnh và khi thay đổi lịch đã hoàn tất.", { left: 694, top: 552, width: 406, height: 36 }, { size: 18, color: C.navy, align: "center" });
    note(s, ["[Sources]", "Báo cáo: activity diagram / state machine của lịch hẹn."]);
  }

  // 15 divider
  {
    const s = deck.slides.add();
    await sectionDivider(s, n++, "Triển khai hệ thống");
    note(s, ["[Sources]", "Mẫu slide divider trong deck tham chiếu."]);
  }

  // 16 UI
  {
    const s = deck.slides.add();
    s.background.fill = C.white;
    titleBracket(s, "Giao diện người dùng", "", { x: 28, y: 28, w: 380, h: 110, size: 46 });
    await addLogo(s, 1100, 22, 150, 58);
    addFooter(s, n++);
    addText(s, "Giao diện được chia theo đúng cổng sử dụng để người dùng không phải nhìn quá nhiều chức năng cùng lúc.", { left: 74, top: 154, width: 1070, height: 32 }, { size: 20, color: C.text });
    await imagePanel(s, "image46.png", { left: 80, top: 208, width: 486, height: 196 }, "Trang chủ", "contain");
    await imagePanel(s, "image52.png", { left: 714, top: 208, width: 486, height: 196 }, "Đặt lịch", "contain");
    await imagePanel(s, "image55.png", { left: 80, top: 454, width: 486, height: 126 }, "Dashboard bác sĩ", "contain");
    await imagePanel(s, "image62.png", { left: 714, top: 454, width: 486, height: 126 }, "Dashboard quản trị", "contain");
    note(s, ["[Sources]", "Ảnh giao diện từ báo cáo Word và thư mục source-report-media."]);
  }

  // 17 PDF / notification / AI
  {
    const s = deck.slides.add();
    s.background.fill = C.white;
    titleBracket(s, "PDF, thông báo và AI", "", { x: 28, y: 28, w: 390, h: 110, size: 46 });
    await addLogo(s, 1100, 22, 150, 58);
    addFooter(s, n++);
    await imagePanel(s, "image73.png", { left: 78, top: 210, width: 260, height: 370 }, "Phiếu đặt lịch", "contain");
    await imagePanel(s, "image74.png", { left: 338, top: 210, width: 260, height: 370 }, "Phiếu khám", "contain");
    await imagePanel(s, "image76.png", { left: 598, top: 210, width: 260, height: 370 }, "Kết quả khám", "contain");
    await imagePanel(s, "image71.png", { left: 858, top: 210, width: 344, height: 178 }, "Thông báo realtime", "contain");
    await imagePanel(s, "image78.png", { left: 858, top: 402, width: 344, height: 178 }, "AI tư vấn triệu chứng", "contain");
    note(s, ["[Sources]", "Báo cáo: mẫu PDF, notification realtime và AI tư vấn triệu chứng."]);
  }

  // 18 testing
  {
    const s = deck.slides.add();
    s.background.fill = C.white;
    titleBracket(s, "Kết quả kiểm thử chức năng", "", { x: 28, y: 28, w: 420, h: 110, size: 40 });
    await addLogo(s, 1100, 22, 150, 58);
    addFooter(s, n++);
    addText(s, "Đồ án áp dụng kiểm thử chức năng kết hợp kiểm thử hộp đen. Người kiểm thử thao tác trên giao diện và đối chiếu kết quả thực tế với kết quả mong đợi.", { left: 92, top: 156, width: 1090, height: 42 }, { size: 20, color: C.ink, align: "center" });
    const rows = [
      ["Xác thực", "Đăng ký, OTP, đăng nhập, đổi mật khẩu", "Đạt"],
      ["Đặt lịch", "Chọn slot, chặn trùng, trạng thái", "Đạt"],
      ["Hồ sơ khám", "Tạo hồ sơ, tải PDF, xem lại", "Đạt"],
      ["Bác sĩ", "Xử lý hàng đợi, cập nhật trạng thái", "Đạt"],
      ["Quản trị", "Dashboard, danh mục, audit log", "Đạt"],
      ["Responsive", "Mobile, tablet, desktop", "Đạt"],
    ];
    panel(s, 64, 244, 760, 340, C.white);
    const x1 = 92, x2 = 182, x3 = 526, x4 = 672;
    const rowH = 46;
    ["Nhóm chức năng", "Nội dung kiểm thử", "Kết quả"].forEach((h, idx) => {
      const x = [x1, x2, x4][idx];
      const w = [90, 344, 110][idx];
      slideHeaderCell(s, x, 244, w, rowH, h);
    });
    rows.forEach((r, i) => {
      const y = 290 + i * 42;
      const fill = i % 2 ? "#FAFBFD" : C.white;
      slideDataCell(s, x1, y, 90, 42, String(i + 1), fill);
      slideDataCell(s, x2, y, 344, 42, r[1], fill);
      slideDataCell(s, x4, y, 110, 42, r[2], fill);
    });
    metricCard(s, 886, 268, 292, 104, "24/24", "Luồng nghiệp vụ cốt lõi đạt yêu cầu.", C.blueSoft);
    metricCard(s, 886, 390, 292, 104, "6 viewport", "Kiểm tra từ mobile đến desktop.", C.greenSoft);
    metricCard(s, 886, 512, 292, 104, "0 overflow", "Không phát hiện tràn chữ sau render.", C.amberSoft);
    note(s, ["[Sources]", "Mục 4.7 Kiểm thử phần mềm trong báo cáo."]);
  }

  // 19 contribution/future
  {
    const s = deck.slides.add();
    s.background.fill = C.white;
    titleBracket(s, "Đóng góp và hướng phát triển", "", { x: 28, y: 28, w: 430, h: 110, size: 40 });
    await addLogo(s, 1100, 22, 150, 58);
    addFooter(s, n++);
    card(s, 96, 220, 500, 300, "Đóng góp", "Quy trình đặt lịch - khám - hồ sơ - PDF - quản trị được nối trong một hệ thống duy nhất.\n\nHệ thống có phân quyền theo vai trò, trạng thái lịch hẹn rõ ràng, hỗ trợ realtime và có dữ liệu kiểm thử đủ để trình diễn.", C.blueSoft);
    card(s, 684, 220, 500, 300, "Hướng phát triển", "Thanh toán online, ký số PDF, SMS/Zalo nhắc lịch, tích hợp HIS/LIS, kiểm thử tự động UI và theo dõi tải lớn.", C.greenSoft);
    addText(s, "Phần hạn chế hiện tại được ghi rõ để hội đồng thấy phạm vi và hướng phát triển của đồ án.", { left: 170, top: 556, width: 940, height: 32 }, { size: 21, color: C.navy, align: "center" });
    note(s, ["[Sources]", "Chương 5 và phần kết luận, hướng phát triển trong báo cáo."]);
  }

  // 20 Thank you
  {
    const s = deck.slides.add();
    s.background.fill = C.navy;
    await addLogo(s, 432, 54, 420, 126);
    addText(s, "Xin cảm ơn hội đồng", { left: 190, top: 418, width: 900, height: 92 }, { size: 54, bold: true, color: C.white, align: "center" });
    addText(s, "Clinic Booking  |  Hệ thống đặt lịch khám và quản lý hồ sơ khám trực tuyến", { left: 142, top: 520, width: 1000, height: 64 }, { size: 26, color: C.white, align: "center" });
    addText(s, "Sẵn sàng trao đổi thêm về nghiệp vụ, kiến trúc và kiểm thử.", { left: 190, top: 590, width: 900, height: 32 }, { size: 18, color: C.white, align: "center" });
    addFooter(s, n++);
    note(s, ["[Sources]", "Slide kết thúc theo tinh thần cover trong deck mẫu."]);
  }

  function slideHeaderCell(slide, x, y, w, h, textValue) {
    slide.shapes.add({ geometry: "rect", position: { left: x, top: y, width: w, height: h }, fill: "#C0DAA8", line: { style: "solid", fill: "#A0B47E", width: 1 } });
    addText(slide, textValue, { left: x + 6, top: y + 10, width: w - 12, height: h - 12 }, { size: 16, bold: true, color: C.ink, align: "center" });
  }

  function slideDataCell(slide, x, y, w, h, textValue, fill) {
    slide.shapes.add({ geometry: "rect", position: { left: x, top: y, width: w, height: h }, fill, line: { style: "solid", fill: "#C9D2DD", width: 1 } });
    addText(slide, textValue, { left: x + 8, top: y + 8, width: w - 16, height: h - 12 }, { size: 15, color: C.ink, align: "center" });
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
  const inspect = await deck.inspect({ kind: "slide,textbox,shape,image,notes", maxChars: 30000 });
  await fs.writeFile(path.join(OUT, "inspect.ndjson"), inspect.ndjson, "utf8");
  const pptx = await PresentationFile.exportPptx(deck);
  await pptx.save(FINAL);
  return { final: FINAL, slides: deck.slides.items.length, out: OUT };
}

try {
  const result = await main();
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(error);
  throw error;
}
