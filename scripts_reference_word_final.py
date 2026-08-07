from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import re
import tempfile
import xml.etree.ElementTree as ET

SRC = Path("22010342_Dinh_Xuan_Quyen_bao_cao_hoan_chinh.docm")
OUT = Path("22010342_Dinh_Xuan_Quyen_bao_cao_word_references_final.docm")

W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
REL = "http://schemas.openxmlformats.org/package/2006/relationships"
XML = "http://www.w3.org/XML/1998/namespace"

ET.register_namespace("w", W)
ET.register_namespace("r", R)


def qn(ns, tag):
    return f"{{{ns}}}{tag}"


def w(tag):
    return qn(W, tag)


def r(tag):
    return qn(R, tag)


def rel(tag):
    return qn(REL, tag)


def text_of(el):
    return "".join(t.text or "" for t in el.findall(".//" + w("t"))).strip()


def ensure_ppr(p):
    ppr = p.find(w("pPr"))
    if ppr is None:
        ppr = ET.Element(w("pPr"))
        p.insert(0, ppr)
    return ppr


def clear_after_ppr(p):
    ppr = p.find(w("pPr"))
    for child in list(p):
        if child is not ppr:
            p.remove(child)


def run_text(txt, bold=False, size="28", hidden=False):
    rr = ET.Element(w("r"))
    rpr = ET.SubElement(rr, w("rPr"))
    fonts = ET.SubElement(rpr, w("rFonts"))
    fonts.set(w("ascii"), "Times New Roman")
    fonts.set(w("hAnsi"), "Times New Roman")
    fonts.set(w("eastAsia"), "Times New Roman")
    sz = ET.SubElement(rpr, w("sz"))
    sz.set(w("val"), size)
    if bold:
        ET.SubElement(rpr, w("b"))
    if hidden:
        ET.SubElement(rpr, w("vanish"))
    t = ET.SubElement(rr, w("t"))
    t.set(qn(XML, "space"), "preserve")
    t.text = txt
    return rr


def set_text(p, value):
    texts = p.findall(".//" + w("t"))
    if not texts:
        p.append(run_text(value))
        return
    texts[0].text = value
    texts[0].set(qn(XML, "space"), "preserve")
    for t in texts[1:]:
        t.text = ""


def set_heading(p, txt):
    clear_after_ppr(p)
    ppr = ensure_ppr(p)
    jc = ppr.find(w("jc"))
    if jc is None:
        jc = ET.SubElement(ppr, w("jc"))
    jc.set(w("val"), "center")
    spacing = ppr.find(w("spacing"))
    if spacing is None:
        spacing = ET.SubElement(ppr, w("spacing"))
    spacing.set(w("before"), "240")
    spacing.set(w("after"), "240")
    p.append(run_text(txt, bold=True, size="32"))


def set_page_break_before(p, enabled=True):
    ppr = ensure_ppr(p)
    old = ppr.find(w("pageBreakBefore"))
    if enabled and old is None:
        ET.SubElement(ppr, w("pageBreakBefore"))
    elif not enabled and old is not None:
        ppr.remove(old)


def add_outline_level(p, lvl):
    ppr = ensure_ppr(p)
    old = ppr.find(w("outlineLvl"))
    if old is None:
        old = ET.SubElement(ppr, w("outlineLvl"))
    old.set(w("val"), str(lvl))


def remove_outline_level(p):
    ppr = ensure_ppr(p)
    old = ppr.find(w("outlineLvl"))
    if old is not None:
        ppr.remove(old)


def remove_numbering(p):
    ppr = ensure_ppr(p)
    old = ppr.find(w("numPr"))
    if old is not None:
        ppr.remove(old)


def field_paragraph(instr, placeholder):
    p = ET.Element(w("p"))
    ppr = ET.SubElement(p, w("pPr"))
    spacing = ET.SubElement(ppr, w("spacing"))
    spacing.set(w("after"), "120")
    for rr in field_runs(instr, placeholder):
        p.append(rr)
    return p


def field_runs(instr, placeholder=""):
    parts = []
    begin = ET.Element(w("r"))
    fld = ET.SubElement(begin, w("fldChar"))
    fld.set(w("fldCharType"), "begin")
    fld.set(w("dirty"), "true")
    parts.append(begin)

    ir = ET.Element(w("r"))
    it = ET.SubElement(ir, w("instrText"))
    it.set(qn(XML, "space"), "preserve")
    it.text = instr
    parts.append(ir)

    sep = ET.Element(w("r"))
    fld = ET.SubElement(sep, w("fldChar"))
    fld.set(w("fldCharType"), "separate")
    parts.append(sep)
    if placeholder:
        parts.append(run_text(placeholder, size="26"))

    end = ET.Element(w("r"))
    fld = ET.SubElement(end, w("fldChar"))
    fld.set(w("fldCharType"), "end")
    parts.append(end)
    return parts


def add_tc_field(p, text, tag):
    # Remove old TC fields in the paragraph.
    for r_el in list(p.findall(w("r"))):
        instrs = r_el.findall(w("instrText"))
        if instrs and any(" TC " in (i.text or "") for i in instrs):
            p.remove(r_el)
    for rr in field_runs(f' TC "{text}" \\f "{tag}" \\l 1 ', ""):
        rpr = rr.find(w("rPr"))
        if rpr is None:
            rpr = ET.Element(w("rPr"))
            rr.insert(0, rpr)
        ET.SubElement(rpr, w("vanish"))
        p.append(rr)


def caption_paragraph(text):
    p = ET.Element(w("p"))
    ppr = ET.SubElement(p, w("pPr"))
    jc = ET.SubElement(ppr, w("jc"))
    jc.set(w("val"), "center")
    spacing = ET.SubElement(ppr, w("spacing"))
    spacing.set(w("before"), "120")
    spacing.set(w("after"), "120")
    p.append(run_text(text, size="28"))
    return p


def replace_front_section(body, heading, inserted):
    heads = {
        "MỤC LỤC",
        "DANH MỤC HÌNH ẢNH",
        "DANH MỤC BẢNG BIỂU",
        "DANH MỤC TỪ VIẾT TẮT",
        "DANH MỤC THUẬT NGỮ",
        "MỞ ĐẦU",
    }
    children = list(body)
    start = next((i for i, c in enumerate(children) if c.tag == w("p") and text_of(c) == heading), None)
    if start is None:
        return
    end = len(children)
    for j in range(start + 1, len(children)):
        if children[j].tag == w("p") and text_of(children[j]) in (heads - {heading}):
            end = j
            break
    for child in children[start + 1 : end]:
        body.remove(child)
    anchor = list(body)[start]
    pos = list(body).index(anchor) + 1
    for item in inserted:
        body.insert(pos, item)
        pos += 1


def table(rows, widths=(1900, 7200)):
    tbl = ET.Element(w("tbl"))
    pr = ET.SubElement(tbl, w("tblPr"))
    tblw = ET.SubElement(pr, w("tblW"))
    tblw.set(w("w"), str(sum(widths)))
    tblw.set(w("type"), "dxa")
    borders = ET.SubElement(pr, w("tblBorders"))
    for side in ["top", "left", "bottom", "right", "insideH", "insideV"]:
        el = ET.SubElement(borders, w(side))
        el.set(w("val"), "single")
        el.set(w("sz"), "4")
        el.set(w("space"), "0")
        el.set(w("color"), "000000")
    grid = ET.SubElement(tbl, w("tblGrid"))
    for width in widths:
        col = ET.SubElement(grid, w("gridCol"))
        col.set(w("w"), str(width))
    for r_idx, row in enumerate(rows):
        tr = ET.SubElement(tbl, w("tr"))
        for c_idx, cell in enumerate(row):
            tc = ET.SubElement(tr, w("tc"))
            tcpr = ET.SubElement(tc, w("tcPr"))
            tcw = ET.SubElement(tcpr, w("tcW"))
            tcw.set(w("w"), str(widths[c_idx]))
            tcw.set(w("type"), "dxa")
            vm = ET.SubElement(tcpr, w("vAlign"))
            vm.set(w("val"), "center")
            p = ET.SubElement(tc, w("p"))
            ppr = ET.SubElement(p, w("pPr"))
            jc = ET.SubElement(ppr, w("jc"))
            jc.set(w("val"), "center" if c_idx == 0 else "left")
            spacing = ET.SubElement(ppr, w("spacing"))
            spacing.set(w("after"), "80")
            p.append(run_text(cell, bold=(r_idx == 0), size="26"))
    return tbl


def header_xml():
    root = ET.Element(w("hdr"))
    p = ET.SubElement(root, w("p"))
    ppr = ET.SubElement(p, w("pPr"))
    jc = ET.SubElement(ppr, w("jc"))
    jc.set(w("val"), "center")
    for rr in field_runs(" PAGE ", "1"):
        for sz in rr.findall(".//" + w("sz")):
            sz.set(w("val"), "26")
        p.append(rr)
    return ET.tostring(root, encoding="utf-8", xml_declaration=True)


def add_rel(rels_root, target, kind):
    nums = []
    for item in rels_root.findall(rel("Relationship")):
        rid = item.attrib.get("Id", "")
        if rid.startswith("rId") and rid[3:].isdigit():
            nums.append(int(rid[3:]))
    rid = f"rId{max(nums or [0]) + 1}"
    item = ET.SubElement(rels_root, rel("Relationship"))
    item.set("Id", rid)
    item.set("Type", f"http://schemas.openxmlformats.org/officeDocument/2006/relationships/{kind}")
    item.set("Target", target)
    return rid


def set_no_page_number(sect):
    for child in list(sect):
        if child.tag in (w("footerReference"), w("headerReference"), w("pgNumType")):
            sect.remove(child)


def set_header_and_pgnum(sect, rid, fmt, start):
    for child in list(sect):
        if child.tag in (w("footerReference"), w("headerReference"), w("pgNumType")):
            sect.remove(child)
    hr = ET.Element(w("headerReference"))
    hr.set(w("type"), "default")
    hr.set(r("id"), rid)
    pg = ET.Element(w("pgNumType"))
    pg.set(w("fmt"), fmt)
    pg.set(w("start"), str(start))
    sect.insert(0, hr)
    sect.insert(1, pg)


def ensure_style(styles_root, style_id, name, size, bold=False):
    st = styles_root.find(f".//{w('style')}[@{w('styleId')}='{style_id}']")
    if st is None:
        st = ET.SubElement(styles_root, w("style"))
        st.set(w("type"), "paragraph")
        st.set(w("styleId"), style_id)
        nm = ET.SubElement(st, w("name"))
        nm.set(w("val"), name)
    rpr = st.find(w("rPr"))
    if rpr is None:
        rpr = ET.SubElement(st, w("rPr"))
    for old in list(rpr):
        if old.tag in (w("sz"), w("szCs"), w("b"), w("bCs"), w("rFonts")):
            rpr.remove(old)
    fonts = ET.SubElement(rpr, w("rFonts"))
    fonts.set(w("ascii"), "Times New Roman")
    fonts.set(w("hAnsi"), "Times New Roman")
    fonts.set(w("eastAsia"), "Times New Roman")
    sz = ET.SubElement(rpr, w("sz"))
    sz.set(w("val"), str(size))
    szcs = ET.SubElement(rpr, w("szCs"))
    szcs.set(w("val"), str(size))
    if bold:
        ET.SubElement(rpr, w("b"))
        ET.SubElement(rpr, w("bCs"))


def main():
    with tempfile.TemporaryDirectory() as td:
        tmp = Path(td)
        with ZipFile(SRC) as zin:
            zin.extractall(tmp)

        doc_path = tmp / "word" / "document.xml"
        tree = ET.parse(doc_path)
        root = tree.getroot()
        body = root.find(w("body"))

        # Global typo cleanup in text runs.
        replacements = {
            "tông tin": "thông tin",
            "thống kế": "thống kê",
            "hệ thông": "hệ thống",
            "phát triên": "phát triển",
            "dịch vu": "dịch vụ",
            "thốÂng": "thống",
            "Use case": "Use Case",
        }
        for t in root.findall(".//" + w("t")):
            if not t.text:
                continue
            for old, new in replacements.items():
                t.text = t.text.replace(old, new)

        # Caption missing Ch.4/Ch.5 tables.
        ch4_table_names = [
            "Cấu trúc collection Users",
            "Cấu trúc collection Clinics",
            "Cấu trúc collection Specialties",
            "Cấu trúc collection Doctors",
            "Cấu trúc collection ServicePackages",
            "Cấu trúc collection Appointments",
            "Cấu trúc collection MedicalRecords",
            "Cấu trúc collection WaitingLists",
            "Cấu trúc collection Notifications",
            "Cấu trúc collection DoctorReviews",
            "Cấu trúc collection Articles",
            "Cấu trúc collection AuditLogs",
            "Nguyên tắc thiết kế API",
            "Nhóm API xác thực và phân quyền",
            "Nhóm API dữ liệu nền tảng",
            "Nhóm API đặt lịch, hàng đợi và hồ sơ khám bệnh",
            "Nhóm API thông báo, upload, PDF và AI",
            "Nhóm API quản trị hệ thống",
            "Kịch bản kiểm thử chức năng chính",
            "Các lệnh chuẩn bị và chạy ứng dụng",
            "Nhóm biến môi trường chính",
            "Kết quả kiểm tra sau triển khai",
        ]
        direct = list(body)
        in_chapter = None
        ch4_existing = 0
        add_idx = 0
        pending = []
        for idx, el in enumerate(direct):
            if el.tag == w("p"):
                txt = text_of(el)
                if txt.startswith("CHƯƠNG 4"):
                    in_chapter = 4
                elif txt.startswith("CHƯƠNG 5"):
                    in_chapter = 5
                elif txt.startswith("KẾT LUẬN"):
                    in_chapter = None
                if in_chapter == 4 and txt.startswith("Bảng 4."):
                    ch4_existing += 1
            elif el.tag == w("tbl") and in_chapter in (4, 5):
                prev_texts = [text_of(x) for x in direct[max(0, idx - 3):idx] if x.tag == w("p")]
                if any(t.startswith("Bảng ") for t in prev_texts):
                    continue
                if in_chapter == 4 and add_idx < len(ch4_table_names):
                    ch4_existing += 1
                    cap = f"Bảng 4.{ch4_existing}. {ch4_table_names[add_idx]}"
                    add_idx += 1
                elif in_chapter == 5:
                    cap = "Bảng 5.1. Tổng hợp đóng góp nổi bật của đề tài"
                else:
                    continue
                pending.append((idx, caption_paragraph(cap)))
        for idx, cap in reversed(pending):
            body.insert(idx, cap)

        # Two prose-introduced summary tables can be too close to earlier captions;
        # add them by textual anchors if they are still missing.
        direct = list(body)
        def has_caption_before_table(anchor_text, caption_prefix):
            for i, el in enumerate(direct):
                if el.tag == w("p") and text_of(el).startswith(anchor_text):
                    for j in range(i + 1, min(i + 8, len(direct))):
                        if direct[j].tag == w("tbl"):
                            prev = [text_of(x) for x in direct[max(0, j - 4):j] if x.tag == w("p")]
                            return any(x.startswith(caption_prefix) for x in prev), j
            return True, None

        ok, tbl_idx = has_caption_before_table("Các kết quả có thể kiểm tra sau khi triển khai gồm", "Bảng 4.24.")
        if not ok and tbl_idx is not None:
            body.insert(tbl_idx, caption_paragraph("Bảng 4.24. Kết quả kiểm tra sau triển khai"))
            pending.append((tbl_idx, None))

        direct = list(body)
        ok, tbl_idx = has_caption_before_table("Bảng dưới đây tóm tắt một số đóng góp nổi bật của đề tài", "Bảng 5.1.")
        if not ok and tbl_idx is not None:
            body.insert(tbl_idx, caption_paragraph("Bảng 5.1. Tổng hợp đóng góp nổi bật của đề tài"))
            pending.append((tbl_idx, None))

        # Normalize headings and set TOC levels like References > Add Text.
        ch1_titles = [
            "Đặt vấn đề",
            "Lý do chọn đề tài",
            "Mục tiêu của đề tài",
            "Phạm vi nghiên cứu",
            "Đối tượng nghiên cứu",
            "Đối tượng sử dụng hệ thống",
            "Định hướng giải pháp",
            "Bố cục đồ án tốt nghiệp",
        ]
        ch1 = 0
        for p in root.findall(".//" + w("p")):
            txt = text_of(p)
            if "\t" in txt:
                continue
            if txt in {
                "TÓM TẮT ĐỒ ÁN TỐT NGHIỆP",
                "LỜI CAM ĐOAN",
                "LỜI CẢM ƠN",
                "MỤC LỤC",
                "DANH MỤC HÌNH ẢNH",
                "DANH MỤC BẢNG BIỂU",
                "DANH MỤC TỪ VIẾT TẮT",
                "DANH MỤC THUẬT NGỮ",
                "MỞ ĐẦU",
                "KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN",
                "TÀI LIỆU THAM KHẢO",
            } or (txt == txt.upper() and re.match(r"^CHƯƠNG\s+\d+\s*[:.]", txt)):
                set_heading(p, txt)
                add_outline_level(p, 0)
            elif txt in ch1_titles:
                ch1 += 1
                remove_numbering(p)
                add_outline_level(p, 1)
            elif re.match(r"^\d+\.\d+\.\d+\.\s+\S", txt):
                add_outline_level(p, 2)
            elif re.match(r"^\d+\.\d+\.\s+\S", txt):
                add_outline_level(p, 1)
            elif txt.startswith(("Hình ", "Bảng ")):
                remove_outline_level(p)
                remove_numbering(p)

        # TC fields for clickable/updatable lists.
        for p in root.findall(".//" + w("p")):
            txt = text_of(p)
            if txt.startswith("Hình ") and re.match(r"^Hình\s+\d+\.\d+\.", txt):
                add_tc_field(p, txt, "H")
            elif txt.startswith("Bảng ") and re.match(r"^Bảng\s+\d+\.\d+\.", txt):
                add_tc_field(p, txt, "B")

        # Front matter dynamic fields.
        front_heads = ["MỤC LỤC", "DANH MỤC HÌNH ẢNH", "DANH MỤC BẢNG BIỂU", "DANH MỤC TỪ VIẾT TẮT", "DANH MỤC THUẬT NGỮ"]
        for p in body.findall(w("p")):
            txt = text_of(p)
            if txt in front_heads + ["MỞ ĐẦU"]:
                set_heading(p, txt)
                set_page_break_before(p, txt != "MỤC LỤC")

        replace_front_section(
            body,
            "MỤC LỤC",
            [field_paragraph(' TOC \\o "1-3" \\h \\z \\u ', "Mục lục sẽ được cập nhật khi bấm Ctrl+A rồi F9 trong Word.")],
        )
        replace_front_section(
            body,
            "DANH MỤC HÌNH ẢNH",
            [field_paragraph(' TOC \\f "H" \\h \\z ', "Danh mục hình ảnh sẽ được cập nhật khi bấm Ctrl+A rồi F9 trong Word.")],
        )
        replace_front_section(
            body,
            "DANH MỤC BẢNG BIỂU",
            [field_paragraph(' TOC \\f "B" \\h \\z ', "Danh mục bảng biểu sẽ được cập nhật khi bấm Ctrl+A rồi F9 trong Word.")],
        )

        abbrev_rows = [
            ("Từ viết tắt", "Ý nghĩa"),
            ("AI", "Artificial Intelligence - trí tuệ nhân tạo"),
            ("API", "Application Programming Interface - giao diện lập trình ứng dụng"),
            ("CRUD", "Create, Read, Update, Delete - các thao tác thêm, xem, sửa, xóa dữ liệu"),
            ("CORS", "Cross-Origin Resource Sharing - cơ chế chia sẻ tài nguyên khác nguồn"),
            ("JWT", "JSON Web Token - chuỗi token dùng cho xác thực và phân quyền"),
            ("MongoDB", "Hệ quản trị cơ sở dữ liệu NoSQL dạng document"),
            ("NoSQL", "Nhóm cơ sở dữ liệu phi quan hệ, linh hoạt về cấu trúc lưu trữ"),
            ("OTP", "One-Time Password - mã xác thực sử dụng một lần"),
            ("PDF", "Portable Document Format - định dạng tài liệu dùng để lưu và in phiếu"),
            ("REST", "Representational State Transfer - phong cách thiết kế API web"),
            ("SMTP", "Simple Mail Transfer Protocol - giao thức gửi email"),
            ("UI", "User Interface - giao diện người dùng"),
            ("UX", "User Experience - trải nghiệm người dùng"),
        ]
        replace_front_section(body, "DANH MỤC TỪ VIẾT TẮT", [table(abbrev_rows)])

        term_rows = [
            ("Thuật ngữ", "Ý nghĩa"),
            ("BookingCare Mini", "Tên hệ thống ứng dụng đặt lịch khám bệnh cho phòng khám nhỏ được xây dựng trong đồ án"),
            ("Frontend", "Phần giao diện người dùng, được xây dựng bằng ReactJS/Vite"),
            ("Backend", "Phần máy chủ xử lý nghiệp vụ, API, xác thực và kết nối cơ sở dữ liệu"),
            ("Middleware", "Lớp xử lý trung gian dùng để kiểm tra token, phân quyền hoặc validate dữ liệu"),
            ("ProtectedRoute", "Cơ chế bảo vệ route ở frontend, chỉ cho phép người dùng hợp lệ truy cập đúng khu vực chức năng"),
            ("Socket.IO", "Thư viện hỗ trợ giao tiếp thời gian thực giữa client và server"),
            ("AuditLog", "Nhật ký hệ thống ghi lại thao tác quan trọng để phục vụ kiểm soát và truy vết"),
            ("Slot khám", "Khung giờ khám cụ thể của bác sĩ trong một ngày làm việc"),
            ("Hàng đợi khám", "Danh sách bệnh nhân chờ được bác sĩ gọi vào khám theo lịch đã xác nhận"),
            ("Danh sách chờ", "Cơ chế cho phép bệnh nhân đăng ký chờ khi khung giờ mong muốn đã đầy"),
            ("Hồ sơ khám bệnh", "Tập thông tin chuyên môn được bác sĩ tạo sau buổi khám"),
            ("Tái khám", "Lịch khám lại được tạo hoặc gợi ý dựa trên hồ sơ khám bệnh trước đó"),
            ("Smoke test", "Kiểm thử nhanh các luồng chính để xác nhận hệ thống hoạt động cơ bản sau khi triển khai"),
        ]
        replace_front_section(body, "DANH MỤC THUẬT NGỮ", [table(term_rows)])

        # Recreate section break before "MỞ ĐẦU" after front matter replacement.
        direct = list(body)
        mo_idx = next(i for i, el in enumerate(direct) if el.tag == w("p") and text_of(el) == "MỞ ĐẦU")
        prev_para = next(el for el in reversed(direct[:mo_idx]) if el.tag == w("p"))
        body_sect = body.find(w("sectPr"))
        ppr = ensure_ppr(prev_para)
        old = ppr.find(w("sectPr"))
        if old is not None:
            ppr.remove(old)
        new_sect = ET.Element(w("sectPr"))
        if body_sect is not None:
            for child in list(body_sect):
                if child.tag not in (w("headerReference"), w("footerReference"), w("pgNumType")):
                    new_sect.append(ET.fromstring(ET.tostring(child)))
        ppr.append(new_sect)

        rels_path = tmp / "word" / "_rels" / "document.xml.rels"
        rels_tree = ET.parse(rels_path)
        rels_root = rels_tree.getroot()
        (tmp / "word" / "header_codex_roman.xml").write_bytes(header_xml())
        (tmp / "word" / "header_codex_arabic.xml").write_bytes(header_xml())
        roman_rid = add_rel(rels_root, "header_codex_roman.xml", "header")
        arabic_rid = add_rel(rels_root, "header_codex_arabic.xml", "header")
        sects = root.findall(".//" + w("sectPr"))
        if sects:
            set_no_page_number(sects[0])
        if len(sects) >= 2:
            set_header_and_pgnum(sects[-2], roman_rid, "lowerRoman", 1)
        if len(sects) >= 1:
            set_header_and_pgnum(sects[-1], arabic_rid, "decimal", 1)

        # Content types.
        ct_path = tmp / "[Content_Types].xml"
        ct_tree = ET.parse(ct_path)
        ct_root = ct_tree.getroot()
        CT = "http://schemas.openxmlformats.org/package/2006/content-types"
        existing = {el.get("PartName") for el in ct_root.findall(qn(CT, "Override"))}
        for part in ("/word/header_codex_roman.xml", "/word/header_codex_arabic.xml"):
            if part not in existing:
                el = ET.SubElement(ct_root, qn(CT, "Override"))
                el.set("PartName", part)
                el.set("ContentType", "application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml")
        ct_tree.write(ct_path, encoding="utf-8", xml_declaration=True)

        # Update fields on open.
        settings_path = tmp / "word" / "settings.xml"
        if settings_path.exists():
            st = ET.parse(settings_path)
            upd = st.getroot().find(w("updateFields"))
            if upd is None:
                upd = ET.SubElement(st.getroot(), w("updateFields"))
            upd.set(w("val"), "true")
            st.write(settings_path, encoding="utf-8", xml_declaration=True)

        # TOC styles.
        styles_path = tmp / "word" / "styles.xml"
        if styles_path.exists():
            st = ET.parse(styles_path)
            sr = st.getroot()
            ensure_style(sr, "TOC1", "toc 1", 28, True)
            ensure_style(sr, "TOC2", "toc 2", 26, False)
            ensure_style(sr, "TOC3", "toc 3", 26, False)
            st.write(styles_path, encoding="utf-8", xml_declaration=True)

        tree.write(doc_path, encoding="utf-8", xml_declaration=True)
        rels_tree.write(rels_path, encoding="utf-8", xml_declaration=True)

        if OUT.exists():
            OUT.unlink()
        with ZipFile(OUT, "w", ZIP_DEFLATED) as zout:
            for path in tmp.rglob("*"):
                if path.is_file():
                    zout.write(path, path.relative_to(tmp).as_posix())

    print(f"OUT={OUT.resolve()}")
    print(f"added_table_captions={len(pending)}")


if __name__ == "__main__":
    main()
