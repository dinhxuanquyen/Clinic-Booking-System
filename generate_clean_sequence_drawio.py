from __future__ import annotations

from xml.sax.saxutils import escape


OUT_FILE = "Hinh_4_4_luong_trinh_tu.drawio"
PAGE_W = 1500
PAGE_H = 1320

TITLE_Y = 20
FRAME_X = 60
FRAME_Y = 74
FRAME_W = 1380
FRAME_H = 1180
ICON_Y = 112
LABEL_Y = 158
LIFE_Y = 198
LIFE_H = 1000

LINE = "#000000"
LIFELINE = "#888888"
ACT_FILL = "#F5F5F5"
ACT_STROKE = "#666666"
ACTOR_FILL = "#FFFFFF"
ACTOR_STROKE = "#000000"
BOUNDARY_FILL = "#D5F5FF"
BOUNDARY_STROKE = "#00A8CC"
CONTROL_FILL = "#E1D5E7"
CONTROL_STROKE = "#9673A6"
ENTITY_FILL = "#DAE8FC"
ENTITY_STROKE = "#6C8EBF"
DATABASE_FILL = "#FFF2CC"
DATABASE_STROKE = "#D6B656"


def esc(value: str) -> str:
    return escape(value).replace("\n", "&#xa;")


def geom(x: float, y: float, w: float, h: float) -> str:
    return f'<mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry" />'


def cell(
    cid: str,
    value: str,
    style: str,
    *,
    vertex: bool = False,
    edge: bool = False,
    parent: str = "1",
    extra: str = "",
) -> str:
    flags = ""
    if vertex:
        flags += ' vertex="1"'
    if edge:
        flags += ' edge="1"'
    return f'<mxCell id="{cid}" value="{esc(value)}" style="{style}"{flags} parent="{parent}">{extra}</mxCell>'


def title(cid: str, text: str) -> str:
    style = (
        "text;html=1;align=center;verticalAlign=middle;fontFamily=Times New Roman;"
        "fontSize=22;fontStyle=1;fontColor=#111111;"
    )
    return cell(cid, text, style, vertex=True, extra=geom(250, TITLE_Y, 1000, 36))


def sequence_frame(cid: str, label: str) -> str:
    border_style = (
        "rounded=0;whiteSpace=wrap;html=1;fillColor=none;strokeColor=#111111;"
        "strokeWidth=1;"
    )
    tab_style = (
        "shape=note;size=14;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#111111;"
        "strokeWidth=1;fontFamily=Times New Roman;fontSize=11;fontColor=#111111;"
        "align=left;verticalAlign=middle;spacing=6;"
    )
    return (
        cell(f"{cid}_border", "", border_style, vertex=True, extra=geom(FRAME_X, FRAME_Y, FRAME_W, FRAME_H))
        + cell(f"{cid}_tab", label, tab_style, vertex=True, extra=geom(FRAME_X, FRAME_Y, 265, 26))
    )


def participant(cid: str, kind: str, label: str, cx: float, width: float) -> str:
    label_style = (
        "text;html=1;align=center;verticalAlign=top;fontFamily=Times New Roman;"
        "fontSize=12;fontStyle=1;fontColor=#111111;whiteSpace=wrap;"
    )
    if kind == "actor":
        shape = "umlActor"
        iw, ih = 40, 52
        iy = ICON_Y - 8
        fill, stroke = ACTOR_FILL, ACTOR_STROKE
    elif kind == "boundary":
        shape = "umlBoundary"
        iw, ih = 42, 42
        iy = ICON_Y
        fill, stroke = BOUNDARY_FILL, BOUNDARY_STROKE
    elif kind == "control":
        shape = "umlControl"
        iw, ih = 42, 42
        iy = ICON_Y
        fill, stroke = CONTROL_FILL, CONTROL_STROKE
    elif kind == "database":
        shape = "cylinder3d"
        iw, ih = 44, 50
        iy = ICON_Y - 2
        fill, stroke = DATABASE_FILL, DATABASE_STROKE
    else:
        shape = "umlEntity"
        iw, ih = 42, 42
        iy = ICON_Y + 2
        fill, stroke = ENTITY_FILL, ENTITY_STROKE

    icon_style = (
        f"shape={shape};html=1;whiteSpace=wrap;outlineConnect=0;"
        f"fillColor={fill};strokeColor={stroke};strokeWidth=1.5;"
        "fontFamily=Times New Roman;fontSize=11;fontColor=#111111;"
    )
    life_style = (
        f"shape=line;direction=south;strokeColor={LIFELINE};strokeWidth=1;"
        "dashed=1;dashPattern=6 6;html=1;"
    )
    x = cx - width / 2
    return (
        cell(f"{cid}_icon", "", icon_style, vertex=True, extra=geom(cx - iw / 2, iy, iw, ih))
        + cell(f"{cid}_label", label, label_style, vertex=True, extra=geom(x, LABEL_Y, width, 38))
        + cell(f"{cid}_life", "", life_style, vertex=True, extra=geom(cx, LIFE_Y, 2, LIFE_H))
    )


def activation(cid: str, cx: float, y: float, h: float) -> str:
    style = (
        f"rounded=0;whiteSpace=wrap;html=1;fillColor={ACT_FILL};strokeColor={ACT_STROKE};"
        "strokeWidth=1;"
    )
    return cell(cid, "", style, vertex=True, extra=geom(cx - 6, y, 12, h))


def message(cid: str, x1: float, y: float, x2: float, text: str, *, ret: bool = False) -> str:
    if ret:
        style = (
            f"endArrow=open;endFill=0;dashed=1;dashPattern=6 4;html=1;rounded=0;"
            f"strokeColor={LINE};strokeWidth=1;fontFamily=Times New Roman;fontSize=12;"
            "fontColor=#111111;labelBackgroundColor=#FFFFFF;"
        )
    else:
        style = (
            f"endArrow=block;endFill=1;html=1;rounded=0;strokeColor={LINE};strokeWidth=1;"
            "fontFamily=Times New Roman;fontSize=11;fontColor=#111111;labelBackgroundColor=#FFFFFF;"
        )
    points = (
        '<mxGeometry relative="1" as="geometry">'
        f'<mxPoint x="{x1}" y="{y}" as="sourcePoint" />'
        f'<mxPoint x="{x2}" y="{y}" as="targetPoint" />'
        "</mxGeometry>"
    )
    return cell(cid, text, style, edge=True, extra=points)


def fragment(cid: str, operator: str, guard: str, x: float, y: float, w: float, h: float, *, split_y: float | None = None) -> str:
    style = (
        "shape=umlFrame;whiteSpace=wrap;html=1;fillColor=none;strokeColor=#111111;"
        "strokeWidth=1;fontFamily=Times New Roman;fontSize=11;fontColor=#111111;"
    )
    guard_style = (
        "text;html=1;align=left;verticalAlign=middle;fontFamily=Times New Roman;"
        "fontSize=12;fontStyle=1;fontColor=#111111;whiteSpace=wrap;labelBackgroundColor=#FFFFFF;"
    )
    sep = ""
    if split_y is not None:
        sep_style = f"shape=line;strokeColor={LINE};strokeWidth=1;dashed=1;dashPattern=4 4;html=1;"
        sep = cell(f"{cid}_separator", "", sep_style, vertex=True, extra=geom(x, split_y, w, 1))
    return (
        cell(f"{cid}_frame", operator, style, vertex=True, extra=geom(x, y, w, h))
        + cell(f"{cid}_guard", guard, guard_style, vertex=True, extra=geom(x + 74, y + 2, w - 86, 24))
        + sep
    )


def note_box(cid: str, text: str, x: float, y: float, w: float, h: float) -> str:
    style = (
        "rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFDF7;strokeColor=#B7B7B7;"
        "strokeWidth=1;fontFamily=Times New Roman;fontSize=11;fontColor=#333333;"
        "align=left;verticalAlign=top;spacing=6;"
    )
    return cell(cid, text, style, vertex=True, extra=geom(x, y, w, h))


def make_diagram(spec: dict) -> str:
    participants = spec["participants"]
    n = len(participants)
    left = 130
    right = 1370
    step = (right - left) / (n - 1) if n > 1 else 0
    centers = {p["id"]: left + i * step for i, p in enumerate(participants)}

    parts = [
        f'<mxGraphModel dx="1800" dy="900" grid="0" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="{PAGE_W}" pageHeight="{PAGE_H}" math="0" shadow="0">',
        "<root>",
        '<mxCell id="0" />',
        '<mxCell id="1" parent="0" />',
        title(f'{spec["id"]}_title', spec["title"]),
        sequence_frame(f'{spec["id"]}_sd', f'sd {spec["sd"]}'),
    ]

    for i, fr in enumerate(spec.get("fragments", []), 1):
        parts.append(fragment(f'{spec["id"]}_frag_{i}', fr["op"], fr["guard"], fr["x"], fr["y"], fr["w"], fr["h"], split_y=fr.get("split_y")))

    for p in participants:
        parts.append(participant(f'{spec["id"]}_{p["id"]}', p["kind"], p["label"], centers[p["id"]], p.get("width", 170)))

    for i, act in enumerate(spec.get("activations", []), 1):
        parts.append(activation(f'{spec["id"]}_act_{i}', centers[act["on"]], act["y"], act["h"]))

    for i, msg in enumerate(spec["messages"], 1):
        label = msg.get("label", "")
        if msg.get("number", True):
            label = f"{i}. {label}"
        parts.append(message(
            f'{spec["id"]}_m{i}',
            centers[msg["from"]],
            msg["y"],
            centers[msg["to"]],
            label,
            ret=msg.get("return", False),
        ))

    for i, note in enumerate(spec.get("notes", []), 1):
        parts.append(note_box(
            f'{spec["id"]}_note_{i}',
            note,
            110,
            spec.get("note_y", 1000) + (i - 1) * 42,
            1280,
            32,
        ))

    parts.append("</root></mxGraphModel>")
    return f'<diagram id="{spec["id"]}" name="{esc(spec["name"])}">' + "".join(parts) + "</diagram>"


P = {
    "patient": {"kind": "actor", "label": ":Bệnh nhân", "width": 150},
    "doctor": {"kind": "actor", "label": ":Bác sĩ", "width": 150},
    "admin": {"kind": "actor", "label": ":Quản trị viên", "width": 160},
    "user": {"kind": "actor", "label": ":Người dùng", "width": 150},
    "guest": {"kind": "actor", "label": ":Khách truy cập", "width": 160},
}


def build_specs() -> list[dict]:
    return [
        {
            "id": "login",
            "name": "Đăng nhập và phân quyền",
            "title": "Sơ đồ trình tự đăng nhập và phân quyền",
            "sd": "Đăng nhập và phân quyền",
            "participants": [
                {"id": "user", **P["user"]},
                {"id": "ui", "kind": "boundary", "label": ":Giao diện đăng nhập", "width": 190},
                {"id": "auth", "kind": "control", "label": ":AuthController", "width": 180},
                {"id": "userModel", "kind": "entity", "label": ":User", "width": 150},
                {"id": "db", "kind": "database", "label": ":MongoDB", "width": 150},
            ],
            "messages": [
                {"from": "user", "to": "ui", "y": 230, "label": "Nhập email, mật khẩu"},
                {"from": "ui", "to": "auth", "y": 290, "label": "POST /api/auth/login"},
                {"from": "auth", "to": "userModel", "y": 350, "label": "findOne(email).select(+password)"},
                {"from": "userModel", "to": "db", "y": 410, "label": "Truy vấn tài khoản"},
                {"from": "db", "to": "userModel", "y": 470, "label": "User document", "return": True},
                {"from": "userModel", "to": "auth", "y": 530, "label": "Thông tin người dùng", "return": True},
                {"from": "auth", "to": "ui", "y": 610, "label": "JWT token, role, user", "return": True},
                {"from": "ui", "to": "user", "y": 670, "label": "Điều hướng theo vai trò", "return": True},
            ],
            "activations": [
                {"on": "ui", "y": 230, "h": 450},
                {"on": "auth", "y": 290, "h": 330},
                {"on": "userModel", "y": 350, "h": 190},
                {"on": "db", "y": 410, "h": 70},
            ],
            "notes": [
                "L?u ?: C?c b??c r? nh?nh ???c ghi ch? ?? gi? s? ?? g?n v? d? ??c trong b?o c?o.",
            ],
        },
        {
            "id": "ai",
            "name": "Tư vấn triệu chứng bằng AI",
            "title": "Sơ đồ trình tự tư vấn triệu chứng bằng AI",
            "sd": "Tư vấn triệu chứng bằng AI",
            "participants": [
                {"id": "user", **P["user"]},
                {"id": "ui", "kind": "boundary", "label": ":Giao diện tư vấn", "width": 180},
                {"id": "aiCtrl", "kind": "control", "label": ":AIController", "width": 170},
                {"id": "gemini", "kind": "control", "label": ":Gemini API", "width": 160},
                {"id": "spec", "kind": "entity", "label": ":Specialty", "width": 160},
                {"id": "db", "kind": "database", "label": ":MongoDB", "width": 150},
            ],
            "messages": [
                {"from": "user", "to": "ui", "y": 225, "label": "Nhập triệu chứng"},
                {"from": "ui", "to": "aiCtrl", "y": 285, "label": "POST /api/ai/symptom-checker"},
                {"from": "aiCtrl", "to": "gemini", "y": 345, "label": "analyzeSymptoms(symptoms)"},
                {"from": "gemini", "to": "aiCtrl", "y": 405, "label": "Kết quả phân tích", "return": True},
                {"from": "aiCtrl", "to": "spec", "y": 465, "label": "mapSpecialties(suggestions)"},
                {"from": "spec", "to": "db", "y": 525, "label": "Tìm chuyên khoa đang hoạt động"},
                {"from": "db", "to": "spec", "y": 585, "label": "Danh sách chuyên khoa", "return": True},
                {"from": "spec", "to": "aiCtrl", "y": 645, "label": "Chuyên khoa phù hợp", "return": True},
                {"from": "aiCtrl", "to": "ui", "y": 705, "label": "Kết quả tư vấn và gợi ý", "return": True},
            ],
            "activations": [
                {"on": "ui", "y": 225, "h": 490},
                {"on": "aiCtrl", "y": 285, "h": 430},
                {"on": "gemini", "y": 345, "h": 70},
                {"on": "spec", "y": 465, "h": 190},
                {"on": "db", "y": 525, "h": 70},
            ],
            "notes": [
                "L?u ?: C?c b??c r? nh?nh ???c ghi ch? ?? gi? s? ?? g?n v? d? ??c trong b?o c?o.",
            ],
        },
        {
            "id": "booking",
            "name": "Đặt lịch khám",
            "title": "Sơ đồ trình tự đặt lịch khám",
            "sd": "Đặt lịch khám",
            "participants": [
                {"id": "patient", **P["patient"]},
                {"id": "ui", "kind": "boundary", "label": ":Giao diện đặt lịch", "width": 190},
                {"id": "apptCtrl", "kind": "control", "label": ":AppointmentController", "width": 220},
                {"id": "doctor", "kind": "entity", "label": ":Doctor", "width": 150},
                {"id": "appt", "kind": "entity", "label": ":Appointment", "width": 170},
                {"id": "notify", "kind": "control", "label": ":Notification/Email", "width": 190},
                {"id": "db", "kind": "database", "label": ":MongoDB", "width": 150},
            ],
            "messages": [
                {"from": "patient", "to": "ui", "y": 220, "label": "Chọn bác sĩ, ngày, khung giờ"},
                {"from": "ui", "to": "apptCtrl", "y": 275, "label": "POST /api/appointments"},
                {"from": "apptCtrl", "to": "doctor", "y": 330, "label": "Kiểm tra bác sĩ, cơ sở, chuyên khoa"},
                {"from": "doctor", "to": "db", "y": 385, "label": "Đọc Doctor/Clinic/Specialty"},
                {"from": "db", "to": "doctor", "y": 440, "label": "Thông tin hợp lệ", "return": True},
                {"from": "apptCtrl", "to": "appt", "y": 500, "label": "Kiểm tra trùng lịch"},
                {"from": "appt", "to": "db", "y": 555, "label": "Tạo Appointment"},
                {"from": "apptCtrl", "to": "notify", "y": 620, "label": "Tạo thông báo/gửi email"},
                {"from": "apptCtrl", "to": "ui", "y": 685, "label": "Lịch hẹn đã tạo", "return": True},
                {"from": "ui", "to": "patient", "y": 740, "label": "Hiển thị lịch hẹn", "return": True},
            ],
            "activations": [
                {"on": "ui", "y": 220, "h": 530},
                {"on": "apptCtrl", "y": 275, "h": 420},
                {"on": "doctor", "y": 330, "h": 120},
                {"on": "appt", "y": 500, "h": 70},
                {"on": "notify", "y": 620, "h": 45},
                {"on": "db", "y": 385, "h": 190},
            ],
            "notes": [
                "L?u ?: C?c b??c r? nh?nh ???c ghi ch? ?? gi? s? ?? g?n v? d? ??c trong b?o c?o.",
            ],
        },
        {
            "id": "reschedule",
            "name": "Yêu cầu đổi lịch hẹn",
            "title": "Sơ đồ trình tự yêu cầu đổi lịch hẹn",
            "sd": "Yêu cầu đổi lịch hẹn",
            "participants": [
                {"id": "patient", **P["patient"]},
                {"id": "ui", "kind": "boundary", "label": ":Quản lý lịch hẹn", "width": 180},
                {"id": "apptCtrl", "kind": "control", "label": ":AppointmentController", "width": 220},
                {"id": "appt", "kind": "entity", "label": ":Appointment", "width": 170},
                {"id": "notify", "kind": "control", "label": ":Notification/Email", "width": 190},
                {"id": "db", "kind": "database", "label": ":MongoDB", "width": 150},
            ],
            "messages": [
                {"from": "patient", "to": "ui", "y": 230, "label": "Chọn ngày/giờ mới"},
                {"from": "ui", "to": "apptCtrl", "y": 295, "label": "PATCH /api/appointments/:id/reschedule-request"},
                {"from": "apptCtrl", "to": "appt", "y": 360, "label": "Kiểm tra lịch và quyền sở hữu"},
                {"from": "appt", "to": "db", "y": 425, "label": "Đọc lịch hẹn"},
                {"from": "db", "to": "appt", "y": 490, "label": "Appointment hiện tại", "return": True},
                {"from": "apptCtrl", "to": "appt", "y": 555, "label": "Lưu reschedule_requested"},
                {"from": "apptCtrl", "to": "notify", "y": 620, "label": "Thông báo bác sĩ/admin"},
                {"from": "apptCtrl", "to": "ui", "y": 690, "label": "Trả trạng thái yêu cầu", "return": True},
            ],
            "activations": [
                {"on": "ui", "y": 230, "h": 470},
                {"on": "apptCtrl", "y": 295, "h": 405},
                {"on": "appt", "y": 360, "h": 210},
                {"on": "notify", "y": 620, "h": 45},
                {"on": "db", "y": 425, "h": 70},
            ],
            "notes": [
                "L?u ?: C?c b??c r? nh?nh ???c ghi ch? ?? gi? s? ?? g?n v? d? ??c trong b?o c?o.",
            ],
        },
        {
            "id": "cancel",
            "name": "Hủy lịch hẹn",
            "title": "Sơ đồ trình tự hủy lịch hẹn",
            "sd": "Hủy lịch hẹn",
            "participants": [
                {"id": "patient", **P["patient"]},
                {"id": "ui", "kind": "boundary", "label": ":Quản lý lịch hẹn", "width": 180},
                {"id": "apptCtrl", "kind": "control", "label": ":AppointmentController", "width": 220},
                {"id": "appt", "kind": "entity", "label": ":Appointment", "width": 170},
                {"id": "wait", "kind": "entity", "label": ":WaitingList", "width": 170},
                {"id": "notify", "kind": "control", "label": ":Notification/Email", "width": 190},
                {"id": "db", "kind": "database", "label": ":MongoDB", "width": 150},
            ],
            "messages": [
                {"from": "patient", "to": "ui", "y": 220, "label": "Gửi yêu cầu hủy lịch"},
                {"from": "ui", "to": "apptCtrl", "y": 280, "label": "PATCH /api/appointments/:id/cancel"},
                {"from": "apptCtrl", "to": "appt", "y": 340, "label": "Kiểm tra lịch và trạng thái"},
                {"from": "appt", "to": "db", "y": 400, "label": "Đọc/Cập nhật Appointment"},
                {"from": "db", "to": "appt", "y": 460, "label": "Kết quả cập nhật", "return": True},
                {"from": "apptCtrl", "to": "wait", "y": 525, "label": "Tìm bệnh nhân chờ phù hợp"},
                {"from": "wait", "to": "db", "y": 585, "label": "Cập nhật WaitingList nếu có"},
                {"from": "apptCtrl", "to": "notify", "y": 650, "label": "Thông báo các bên liên quan"},
                {"from": "apptCtrl", "to": "ui", "y": 715, "label": "Trả kết quả hủy lịch", "return": True},
            ],
            "activations": [
                {"on": "ui", "y": 220, "h": 505},
                {"on": "apptCtrl", "y": 280, "h": 445},
                {"on": "appt", "y": 340, "h": 130},
                {"on": "wait", "y": 525, "h": 75},
                {"on": "notify", "y": 650, "h": 45},
                {"on": "db", "y": 400, "h": 195},
            ],
            "notes": [
                "L?u ?: C?c b??c r? nh?nh ???c ghi ch? ?? gi? s? ?? g?n v? d? ??c trong b?o c?o.",
            ],
        },
        {
            "id": "doctor_status",
            "name": "Bác sĩ xử lý lượt khám",
            "title": "Sơ đồ trình tự bác sĩ xử lý lượt khám",
            "sd": "Bác sĩ xử lý lượt khám",
            "participants": [
                {"id": "doctor", **P["doctor"]},
                {"id": "ui", "kind": "boundary", "label": ":Giao diện bác sĩ", "width": 180},
                {"id": "apptCtrl", "kind": "control", "label": ":AppointmentController", "width": 220},
                {"id": "appt", "kind": "entity", "label": ":Appointment", "width": 170},
                {"id": "wait", "kind": "entity", "label": ":WaitingList", "width": 170},
                {"id": "db", "kind": "database", "label": ":MongoDB", "width": 150},
            ],
            "messages": [
                {"from": "doctor", "to": "ui", "y": 225, "label": "Mở hàng đợi/lịch khám"},
                {"from": "ui", "to": "apptCtrl", "y": 285, "label": "GET /api/doctor/queue hoặc PATCH /status"},
                {"from": "apptCtrl", "to": "appt", "y": 345, "label": "Lấy/cập nhật trạng thái lịch"},
                {"from": "appt", "to": "db", "y": 405, "label": "Cập nhật Appointment"},
                {"from": "db", "to": "appt", "y": 465, "label": "Appointment mới", "return": True},
                {"from": "apptCtrl", "to": "wait", "y": 530, "label": "Đồng bộ lượt chờ nếu cần"},
                {"from": "wait", "to": "db", "y": 590, "label": "Cập nhật WaitingList"},
                {"from": "apptCtrl", "to": "ui", "y": 660, "label": "Trả trạng thái xử lý", "return": True},
                {"from": "ui", "to": "doctor", "y": 725, "label": "Hiển thị hàng đợi/lịch mới", "return": True},
            ],
            "activations": [
                {"on": "ui", "y": 225, "h": 510},
                {"on": "apptCtrl", "y": 285, "h": 385},
                {"on": "appt", "y": 345, "h": 130},
                {"on": "wait", "y": 530, "h": 75},
                {"on": "db", "y": 405, "h": 195},
            ],
            "notes": [
                "L?u ?: Tr?ng th?i l?ch h?n ???c c?p nh?t theo quy tr?nh kh?m th?c t?: confirm / in_progress / completed / cancelled.",
            ],
        },
        {
            "id": "medical_record",
            "name": "T?o v? c?p nh?t h? s? kh?m b?nh",
            "title": "S? ?? tr?nh t? t?o v? c?p nh?t h? s? kh?m b?nh",
            "sd": "T?o/c?p nh?t h? s? kh?m b?nh",
            "participants": [
                {"id": "doctor", **P["doctor"]},
                {"id": "ui", "kind": "boundary", "label": ":Giao di?n h? s? kh?m", "width": 190},
                {"id": "mrCtrl", "kind": "control", "label": ":MedicalRecordController", "width": 230},
                {"id": "mrService", "kind": "control", "label": ":MedicalRecordService", "width": 220},
                {"id": "appt", "kind": "entity", "label": ":Appointment", "width": 170},
                {"id": "record", "kind": "entity", "label": ":MedicalRecord", "width": 180},
                {"id": "pdf", "kind": "control", "label": ":PDF/UploadService", "width": 190},
                {"id": "db", "kind": "database", "label": ":MongoDB", "width": 150},
            ],
            "messages": [
                {"from": "doctor", "to": "ui", "y": 220, "label": "Nh?p ch?n ?o?n, sinh hi?u, ??n thu?c, t?p ??nh k?m"},
                {"from": "ui", "to": "mrCtrl", "y": 268, "label": "POST /api/medical-records ho?c PATCH /api/medical-records/:id"},
                {"from": "mrCtrl", "to": "mrService", "y": 316, "label": "validateData(payload)"},
                {"from": "mrService", "to": "mrCtrl", "y": 364, "label": "K?t qu? validate", "return": True},
                {"from": "mrCtrl", "to": "appt", "y": 420, "label": "checkAppointment(appointmentId)"},
                {"from": "appt", "to": "db", "y": 468, "label": "findById(appointmentId)"},
                {"from": "db", "to": "appt", "y": 516, "label": "Appointment document", "return": True},
                {"from": "appt", "to": "mrCtrl", "y": 564, "label": "L?ch h?n h?p l?", "return": True},
                {"from": "mrCtrl", "to": "record", "y": 620, "label": "T?o m?i MedicalRecord(data) ho?c load record hi?n t?i"},
                {"from": "record", "to": "db", "y": 668, "label": "L?u / findByIdAndUpdate"},
                {"from": "db", "to": "record", "y": 716, "label": "MedicalRecord ?? l?u", "return": True},
                {"from": "record", "to": "mrCtrl", "y": 764, "label": "MedicalRecord", "return": True},
                {"from": "mrCtrl", "to": "appt", "y": 820, "label": "C?p nh?t completed + consultationStatus"},
                {"from": "appt", "to": "db", "y": 868, "label": "save()"},
                {"from": "mrCtrl", "to": "pdf", "y": 920, "label": "uploadFiles(files) / generateMedicalRecordPDF(recordId)"},
                {"from": "pdf", "to": "db", "y": 968, "label": "L?u file ho?c truy v?n h? s?"},
                {"from": "db", "to": "pdf", "y": 1016, "label": "fileUrl(s) / record data", "return": True},
                {"from": "pdf", "to": "mrCtrl", "y": 1064, "label": "PDF buffer / fileUrl", "return": True},
                {"from": "mrCtrl", "to": "ui", "y": 1112, "label": "Tr? h? s? kh?m + PDF", "return": True},
                {"from": "ui", "to": "doctor", "y": 1160, "label": "Hi?n th? h? s? kh?m", "return": True},
            ],
            "activations": [
                {"on": "ui", "y": 220, "h": 948},
                {"on": "mrCtrl", "y": 268, "h": 844},
                {"on": "mrService", "y": 316, "h": 48},
                {"on": "appt", "y": 420, "h": 448},
                {"on": "record", "y": 620, "h": 144},
                {"on": "pdf", "y": 920, "h": 144},
                {"on": "db", "y": 468, "h": 596},
            ],
            "fragments": [
                {"op": "alt", "guard": "[D? li?u kh?ng h?p l?]", "x": 280, "y": 300, "w": 1190, "h": 92, "split_y": 346},
                {"op": "alt", "guard": "[L?ch h?n kh?ng t?n t?i ho?c kh?ng thu?c b?c s?]", "x": 360, "y": 404, "w": 1110, "h": 132, "split_y": 458},
                {"op": "alt", "guard": "[T?o m?i h? s? / C?p nh?t h? s?]", "x": 250, "y": 604, "w": 1210, "h": 184, "split_y": 682},
                {"op": "opt", "guard": "[C? t?p ??nh k?m ho?c y?u c?u xu?t PDF]", "x": 420, "y": 900, "w": 1030, "h": 160},
            ],
            "notes": [
                "Lu?ng ch?nh b?m theo controller th?c t?: ki?m tra quy?n b?c s?, ki?m tra l?ch h?n, t?o/c?p nh?t MedicalRecord, c?p nh?t Appointment sang completed, l?u file ??nh k?m v? xu?t PDF khi c?n.",
            ],
        },
        {
            "id": "notification",
            "name": "Xem và đánh dấu thông báo",
            "title": "Sơ đồ trình tự xem và đánh dấu thông báo",
            "sd": "Xem/đánh dấu thông báo",
            "participants": [
                {"id": "user", **P["user"]},
                {"id": "ui", "kind": "boundary", "label": ":Giao diện thông báo", "width": 190},
                {"id": "notiCtrl", "kind": "control", "label": ":NotificationController", "width": 220},
                {"id": "noti", "kind": "entity", "label": ":Notification", "width": 170},
                {"id": "db", "kind": "database", "label": ":MongoDB", "width": 150},
            ],
            "messages": [
                {"from": "user", "to": "ui", "y": 235, "label": "Mở trung tâm thông báo"},
                {"from": "ui", "to": "notiCtrl", "y": 300, "label": "GET /api/notifications/my"},
                {"from": "notiCtrl", "to": "noti", "y": 365, "label": "Lọc thông báo theo user/role"},
                {"from": "noti", "to": "db", "y": 430, "label": "Truy vấn Notification"},
                {"from": "db", "to": "noti", "y": 495, "label": "Danh sách thông báo", "return": True},
                {"from": "noti", "to": "notiCtrl", "y": 560, "label": "Kết quả đã populate", "return": True},
                {"from": "notiCtrl", "to": "ui", "y": 625, "label": "Trả danh sách thông báo", "return": True},
                {"from": "ui", "to": "notiCtrl", "y": 690, "label": "PATCH /api/notifications/:id/read"},
                {"from": "notiCtrl", "to": "noti", "y": 745, "label": "Cập nhật isRead"},
            ],
            "activations": [
                {"on": "ui", "y": 235, "h": 470},
                {"on": "notiCtrl", "y": 300, "h": 455},
                {"on": "noti", "y": 365, "h": 390},
                {"on": "db", "y": 430, "h": 75},
            ],
            "notes": [
                "L?u ?: C?c b??c r? nh?nh ???c ghi ch? ?? gi? s? ?? g?n v? d? ??c trong b?o c?o.",
            ],
        },
        {
            "id": "admin_crud",
            "name": "Quản trị dữ liệu và AuditLog",
            "title": "Sơ đồ trình tự quản trị dữ liệu hệ thống và ghi AuditLog",
            "sd": "Quản trị dữ liệu hệ thống",
            "participants": [
                {"id": "admin", **P["admin"]},
                {"id": "ui", "kind": "boundary", "label": ":Giao diện quản trị", "width": 190},
                {"id": "adminCtrl", "kind": "control", "label": ":AdminController", "width": 200},
                {"id": "entity", "kind": "entity", "label": ":Collection quản trị", "width": 190},
                {"id": "audit", "kind": "entity", "label": ":AuditLog", "width": 150},
                {"id": "db", "kind": "database", "label": ":MongoDB", "width": 150},
            ],
            "messages": [
                {"from": "admin", "to": "ui", "y": 225, "label": "Thực hiện CRUD dữ liệu"},
                {"from": "ui", "to": "adminCtrl", "y": 285, "label": "POST/PATCH /api/admin/..."},
                {"from": "adminCtrl", "to": "entity", "y": 345, "label": "Kiểm tra và cập nhật dữ liệu"},
                {"from": "entity", "to": "db", "y": 405, "label": "Lưu thay đổi"},
                {"from": "db", "to": "entity", "y": 465, "label": "Kết quả cập nhật", "return": True},
                {"from": "adminCtrl", "to": "audit", "y": 530, "label": "Ghi nhật ký thao tác"},
                {"from": "audit", "to": "db", "y": 590, "label": "Lưu AuditLog"},
                {"from": "adminCtrl", "to": "ui", "y": 660, "label": "Trả kết quả quản trị", "return": True},
                {"from": "ui", "to": "admin", "y": 725, "label": "Hiển thị kết quả", "return": True},
            ],
            "activations": [
                {"on": "ui", "y": 225, "h": 510},
                {"on": "adminCtrl", "y": 285, "h": 385},
                {"on": "entity", "y": 345, "h": 130},
                {"on": "audit", "y": 530, "h": 70},
                {"on": "db", "y": 405, "h": 195},
            ],
            "notes": [
                "L?u ?: C?c b??c r? nh?nh ???c ghi ch? ?? gi? s? ?? g?n v? d? ??c trong b?o c?o.",
            ],
        },
    ]


def build_file() -> str:
    diagrams = [make_diagram(spec) for spec in build_specs()]
    return '<?xml version="1.0" encoding="UTF-8"?><mxfile host="Electron" agent="Codex" version="24.7.5">' + "".join(diagrams) + "</mxfile>"


if __name__ == "__main__":
    with open(OUT_FILE, "w", encoding="utf-8", newline="\n") as f:
        f.write(build_file())
    print(f"Wrote {OUT_FILE}")
