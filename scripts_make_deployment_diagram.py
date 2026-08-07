from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import math
import textwrap

OUT = Path("Hinh_4_49_mo_hinh_trien_khai_he_thong.png")

W, H = 1800, 1120
img = Image.new("RGB", (W, H), "white")
d = ImageDraw.Draw(img)


def font(size, bold=False):
    path = r"C:\Windows\Fonts\arialbd.ttf" if bold else r"C:\Windows\Fonts\arial.ttf"
    try:
        return ImageFont.truetype(path, size)
    except Exception:
        return ImageFont.load_default()


F_TITLE = font(42, True)
F_BOX_TITLE = font(26, True)
F_TEXT = font(21)
F_SMALL = font(19)
F_CAPTION = font(25, True)

INK = (18, 34, 56)
MUTED = (96, 112, 134)
BLUE = (17, 104, 178)
GREEN = (24, 128, 84)
ORANGE = (218, 124, 31)
PURPLE = (108, 74, 182)
RED = (190, 68, 68)
LIGHT_BLUE = (232, 246, 255)
LIGHT_GREEN = (233, 248, 240)
LIGHT_ORANGE = (255, 245, 232)
LIGHT_PURPLE = (243, 239, 255)
LIGHT_RED = (255, 239, 239)
LIGHT_GRAY = (246, 248, 250)
BORDER = (214, 226, 238)


def center_text(text, y, fnt, fill=INK):
    bbox = d.textbbox((0, 0), text, font=fnt)
    d.text(((W - (bbox[2] - bbox[0])) / 2, y), text, font=fnt, fill=fill)


def draw_wrapped(x, y, max_width, text, fnt, fill=INK, line_gap=7):
    words = text.split()
    lines = []
    current = ""
    for word in words:
        candidate = word if not current else current + " " + word
        if d.textbbox((0, 0), candidate, font=fnt)[2] <= max_width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    for line in lines:
        d.text((x, y), line, font=fnt, fill=fill)
        y += fnt.size + line_gap
    return y


def box(x1, y1, x2, y2, fill, outline, number, title, items):
    d.rounded_rectangle([x1, y1, x2, y2], radius=22, fill=fill, outline=outline, width=3)
    d.text((x1 + 26, y1 + 24), str(number), font=F_BOX_TITLE, fill=outline)
    d.text((x1 + 75, y1 + 24), title, font=F_BOX_TITLE, fill=INK)
    y = y1 + 76
    for item in items:
        y = draw_wrapped(x1 + 32, y, (x2 - x1) - 64, item, F_TEXT)
        y += 1


def arrow(x1, y1, x2, y2, color, label=None, offset=(0, 0)):
    d.line([x1, y1, x2, y2], fill=color, width=5)
    ang = math.atan2(y2 - y1, x2 - x1)
    size = 18
    p1 = (x2 + size * math.cos(ang + math.pi * 0.82), y2 + size * math.sin(ang + math.pi * 0.82))
    p2 = (x2 + size * math.cos(ang - math.pi * 0.82), y2 + size * math.sin(ang - math.pi * 0.82))
    d.polygon([(x2, y2), p1, p2], fill=color)
    if label:
        bbox = d.textbbox((0, 0), label, font=F_SMALL)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        lx = (x1 + x2) / 2 - tw / 2 + offset[0]
        ly = (y1 + y2) / 2 - th / 2 + offset[1]
        d.rounded_rectangle([lx - 10, ly - 7, lx + tw + 10, ly + th + 7], radius=8, fill="white", outline=BORDER, width=1)
        d.text((lx, ly), label, font=F_SMALL, fill=INK)


center_text("MÔ HÌNH TRIỂN KHAI HỆ THỐNG", 35, F_TITLE)
d.line([290, 98, W - 290, 98], fill=BORDER, width=3)

d.rounded_rectangle([510, 130, 1625, 900], radius=30, outline=BORDER, width=3)
center_label = "Render Cloud và các dịch vụ dữ liệu/hỗ trợ"
label_bbox = d.textbbox((0, 0), center_label, font=F_SMALL)
d.rounded_rectangle([690, 106, 1445, 126], radius=8, fill="white", outline=None)
d.text(((690 + 1445 - (label_bbox[2] - label_bbox[0])) / 2, 103), center_label, font=F_SMALL, fill=MUTED)

box(
    80,
    205,
    420,
    435,
    LIGHT_BLUE,
    BLUE,
    1,
    "Người dùng",
    ["Bệnh nhân", "Bác sĩ", "Quản trị viên", "Trình duyệt web"],
)
box(
    565,
    165,
    985,
    445,
    LIGHT_GREEN,
    GREEN,
    2,
    "Frontend",
    ["ReactJS / Vite", "Static site trên Render", "Rewrite route về index.html", "Gọi API qua VITE_API_URL"],
)
box(
    1110,
    145,
    1595,
    455,
    LIGHT_ORANGE,
    ORANGE,
    3,
    "Backend API",
    [
        "Node.js / Express Web Service",
        "RESTful API và Socket.IO",
        "JWT, middleware phân quyền",
        "Health check: GET /health",
        "Tác vụ nền: lịch chờ, tái khám",
    ],
)
box(
    1110,
    600,
    1595,
    850,
    LIGHT_PURPLE,
    PURPLE,
    4,
    "MongoDB / MongoDB Atlas",
    [
        "Lưu tài khoản, bác sĩ, chuyên khoa",
        "Lịch hẹn, hàng đợi, hồ sơ khám",
        "Thông báo, đánh giá, AuditLog",
        "Kết nối qua MONGO_URI",
    ],
)
box(
    565,
    615,
    955,
    870,
    LIGHT_RED,
    RED,
    5,
    "Dịch vụ hỗ trợ",
    [
        "SMTP / Brevo: gửi OTP, email",
        "Gemini API: tư vấn triệu chứng",
        "Upload file: /uploads hoặc object storage",
        "PDFKit: xuất phiếu PDF",
    ],
)

arrow(420, 315, 565, 315, BLUE, "HTTPS")
arrow(985, 315, 1110, 315, GREEN)
arrow(1350, 455, 1350, 600, PURPLE, "Mongoose")
arrow(1110, 735, 955, 735, RED)
arrow(955, 650, 1110, 385, ORANGE, "Backend gọi dịch vụ ngoài", (0, -42))

# Return path
for x in range(1110, 985, -24):
    d.line([x, 360, max(x - 14, 955), 360], fill=MUTED, width=3)
for x in range(565, 420, -24):
    d.line([x, 365, max(x - 14, 420), 365], fill=MUTED, width=3)
d.text((610, 372), "JSON response / sự kiện realtime", font=F_SMALL, fill=MUTED)
d.text((145, 452), "Hiển thị giao diện và thông báo", font=F_SMALL, fill=MUTED)

d.rounded_rectangle([80, 950, 1595, 1032], radius=18, fill=LIGHT_GRAY, outline=BORDER, width=2)
d.text((110, 970), "Biến môi trường chính:", font=F_BOX_TITLE, fill=INK)
draw_wrapped(
    420,
    968,
    1110,
    "NODE_ENV, PORT, APP_URL, VITE_API_URL, JWT_SECRET, MONGO_URI, SMTP_*, BREVO_*, GEMINI_API_KEY",
    F_TEXT,
    fill=MUTED,
    line_gap=3,
)

img.save(OUT, quality=95)
print(OUT.resolve())
