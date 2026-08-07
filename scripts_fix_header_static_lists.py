from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import re
import tempfile
import xml.etree.ElementTree as ET

SRC = Path("22010342_Dinh_Xuan_Quyen_bao_cao_hoan_chinh.docm")
OUT = Path("22010342_Dinh_Xuan_Quyen_bao_cao_hoan_chinh_header_danh_muc.docm")

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


def text_of(p):
    return "".join(t.text or "" for t in p.findall(".//" + w("t"))).strip()


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


def run_text(txt, bold=False, size="28"):
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
    t = ET.SubElement(rr, w("t"))
    t.set(qn(XML, "space"), "preserve")
    t.text = txt
    return rr


def set_heading(p, text):
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
    p.append(run_text(text, bold=True, size="32"))


def set_page_break_before(p, enabled=True):
    ppr = ensure_ppr(p)
    old = ppr.find(w("pageBreakBefore"))
    if enabled and old is None:
        ET.SubElement(ppr, w("pageBreakBefore"))
    if not enabled and old is not None:
        ppr.remove(old)


def static_entry(label, page, level=1, bold=False):
    p = ET.Element(w("p"))
    ppr = ET.SubElement(p, w("pPr"))
    tabs = ET.SubElement(ppr, w("tabs"))
    tab = ET.SubElement(tabs, w("tab"))
    tab.set(w("val"), "right")
    tab.set(w("leader"), "dot")
    tab.set(w("pos"), "9000")
    ind = ET.SubElement(ppr, w("ind"))
    ind.set(w("left"), str({1: 0, 2: 360, 3: 720}.get(level, 0)))
    spacing = ET.SubElement(ppr, w("spacing"))
    spacing.set(w("after"), "70")
    p.append(run_text(label + "\t", bold=bold, size="28"))
    p.append(run_text(str(page), bold=bold, size="28"))
    return p


def remove_after_heading_until(body, heading_text, next_heads):
    children = list(body)
    start = None
    for i, child in enumerate(children):
        if child.tag == w("p") and text_of(child) == heading_text:
            start = i
            break
    if start is None:
        return None, None
    end = len(children)
    for j in range(start + 1, len(children)):
        if children[j].tag == w("p") and text_of(children[j]) in next_heads:
            end = j
            break
    for child in children[start + 1 : end]:
        body.remove(child)
    return start, list(body)[start]


def insert_after(body, anchor, items):
    pos = list(body).index(anchor) + 1
    for item in items:
        body.insert(pos, item)
        pos += 1


def page_map(paras):
    pages = []
    page = 1
    for p in paras:
        pages.append(page)
        page += len(p.findall(".//" + w("lastRenderedPageBreak")))
        for br in p.findall(".//" + w("br")):
            if br.get(w("type")) == "page":
                page += 1
    return pages


def roman(n):
    vals = [
        (1000, "m"), (900, "cm"), (500, "d"), (400, "cd"),
        (100, "c"), (90, "xc"), (50, "l"), (40, "xl"),
        (10, "x"), (9, "ix"), (5, "v"), (4, "iv"), (1, "i"),
    ]
    out = ""
    for val, sym in vals:
        while n >= val:
            out += sym
            n -= val
    return out


def header_xml():
    root = ET.Element(w("hdr"))
    p = ET.SubElement(root, w("p"))
    ppr = ET.SubElement(p, w("pPr"))
    jc = ET.SubElement(ppr, w("jc"))
    jc.set(w("val"), "center")
    begin = ET.SubElement(p, w("r"))
    fld = ET.SubElement(begin, w("fldChar"))
    fld.set(w("fldCharType"), "begin")
    instr = ET.SubElement(p, w("r"))
    it = ET.SubElement(instr, w("instrText"))
    it.set(qn(XML, "space"), "preserve")
    it.text = " PAGE "
    sep = ET.SubElement(p, w("r"))
    fld = ET.SubElement(sep, w("fldChar"))
    fld.set(w("fldCharType"), "separate")
    p.append(run_text("1", size="24"))
    end = ET.SubElement(p, w("r"))
    fld = ET.SubElement(end, w("fldChar"))
    fld.set(w("fldCharType"), "end")
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


def set_no_page_number(sect):
    for child in list(sect):
        if child.tag in (w("footerReference"), w("headerReference"), w("pgNumType")):
            sect.remove(child)


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
            p.append(run_text(cell, bold=(r_idx == 0), size="28"))
    return tbl


def main():
    with tempfile.TemporaryDirectory() as td:
        tmp = Path(td)
        with ZipFile(SRC) as zin:
            zin.extractall(tmp)

        doc_path = tmp / "word" / "document.xml"
        tree = ET.parse(doc_path)
        root = tree.getroot()
        body = root.find(w("body"))
        paras = root.findall(".//" + w("p"))
        pages = page_map(paras)

        actual_mo_dau = next(i for i, p in enumerate(paras) if text_of(p) == "MỞ ĐẦU")
        # Use the last "MỞ ĐẦU" occurrence because the first one is in the TOC.
        for i, p in enumerate(paras):
            if text_of(p) == "MỞ ĐẦU":
                actual_mo_dau = i
        mo_dau_phys = pages[actual_mo_dau]

        def display_page_for_para_index(idx):
            if idx < actual_mo_dau:
                return roman(max(1, pages[idx]))
            return str(max(1, pages[idx] - mo_dau_phys + 1))

        # Gather real headings after the generated TOC area.
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
        ch1_no = 0
        toc = [
            ("TÓM TẮT ĐỒ ÁN TỐT NGHIỆP", "i", 1, True),
            ("LỜI CAM ĐOAN", "ii", 1, True),
            ("LỜI CẢM ƠN", "iii", 1, True),
            ("MỤC LỤC", "iv", 1, True),
            ("DANH MỤC HÌNH ẢNH", "x", 1, True),
            ("DANH MỤC BẢNG BIỂU", "xiii", 1, True),
            ("DANH MỤC TỪ VIẾT TẮT", "xiv", 1, True),
            ("DANH MỤC THUẬT NGỮ", "xv", 1, True),
        ]
        for i, p in enumerate(paras):
            if i < actual_mo_dau:
                continue
            txt = text_of(p)
            if "\t" in txt or txt.startswith(("Hình ", "Bảng ")):
                continue
            if txt == "MỞ ĐẦU" or txt in {"KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN", "TÀI LIỆU THAM KHẢO"}:
                toc.append((txt, display_page_for_para_index(i), 1, True))
            elif txt == txt.upper() and re.match(r"^CHƯƠNG\s+\d+\s*[:.]", txt):
                toc.append((txt, display_page_for_para_index(i), 1, True))
            elif txt in ch1_titles:
                ch1_no += 1
                toc.append((f"1.{ch1_no}. {txt}", display_page_for_para_index(i), 2, False))
            elif re.match(r"^\d+\.\d+\.\d+\.\s+\S", txt):
                toc.append((txt, display_page_for_para_index(i), 3, False))
            elif re.match(r"^\d+\.\d+\.\s+\S", txt):
                toc.append((txt, display_page_for_para_index(i), 2, False))

        figures = []
        tables = []
        for i, p in enumerate(paras):
            txt = text_of(p)
            if "\t" in txt:
                continue
            if txt.startswith("Hình ") and re.match(r"^Hình\s+\d+\.\d+\.", txt):
                figures.append((txt, display_page_for_para_index(i)))
            if txt.startswith("Bảng ") and re.match(r"^Bảng\s+\d+\.\d+\.", txt):
                tables.append((txt, display_page_for_para_index(i)))

        # Replace lists and add real abbreviation/terminology content.
        front_order = [
            "MỤC LỤC",
            "DANH MỤC HÌNH ẢNH",
            "DANH MỤC BẢNG BIỂU",
            "DANH MỤC TỪ VIẾT TẮT",
            "DANH MỤC THUẬT NGỮ",
            "MỞ ĐẦU",
        ]
        for h in front_order:
            for p in body.findall(w("p")):
                if text_of(p) == h:
                    set_heading(p, h)
                    set_page_break_before(p, h != "MỤC LỤC")
                    break

        next_heads = set(front_order)
        _, anchor = remove_after_heading_until(body, "MỤC LỤC", next_heads - {"MỤC LỤC"})
        insert_after(body, anchor, [static_entry(label, page, lvl, bold) for label, page, lvl, bold in toc])

        _, anchor = remove_after_heading_until(body, "DANH MỤC HÌNH ẢNH", next_heads - {"DANH MỤC HÌNH ẢNH"})
        insert_after(body, anchor, [static_entry(label, page, 1, False) for label, page in figures])

        _, anchor = remove_after_heading_until(body, "DANH MỤC BẢNG BIỂU", next_heads - {"DANH MỤC BẢNG BIỂU"})
        insert_after(body, anchor, [static_entry(label, page, 1, False) for label, page in tables])

        abbrev_rows = [
            ("Từ viết tắt", "Ý nghĩa"),
            ("AI", "Artificial Intelligence - trí tuệ nhân tạo"),
            ("API", "Application Programming Interface - giao diện lập trình ứng dụng"),
            ("CRUD", "Create, Read, Update, Delete - các thao tác thêm, xem, sửa, xóa dữ liệu"),
            ("CORS", "Cross-Origin Resource Sharing - cơ chế chia sẻ tài nguyên khác nguồn"),
            ("HTTP/HTTPS", "Giao thức truyền tải dữ liệu web; HTTPS là phiên bản có mã hóa"),
            ("JWT", "JSON Web Token - chuỗi token dùng cho xác thực và phân quyền"),
            ("NoSQL", "Nhóm cơ sở dữ liệu phi quan hệ, linh hoạt về cấu trúc lưu trữ"),
            ("OTP", "One-Time Password - mã xác thực sử dụng một lần"),
            ("PDF", "Portable Document Format - định dạng tài liệu dùng để lưu và in phiếu"),
            ("REST", "Representational State Transfer - phong cách thiết kế API web"),
            ("SMTP", "Simple Mail Transfer Protocol - giao thức gửi email"),
            ("UI", "User Interface - giao diện người dùng"),
            ("URL", "Uniform Resource Locator - địa chỉ tài nguyên trên web"),
            ("UX", "User Experience - trải nghiệm người dùng"),
        ]
        _, anchor = remove_after_heading_until(body, "DANH MỤC TỪ VIẾT TẮT", next_heads - {"DANH MỤC TỪ VIẾT TẮT"})
        insert_after(body, anchor, [table(abbrev_rows)])

        term_rows = [
            ("Thuật ngữ", "Ý nghĩa"),
            ("BookingCare Mini", "Tên hệ thống ứng dụng đặt lịch khám bệnh cho phòng khám nhỏ được xây dựng trong đồ án"),
            ("Frontend", "Phần giao diện người dùng, được xây dựng bằng ReactJS/Vite"),
            ("Backend", "Phần máy chủ xử lý nghiệp vụ, API, xác thực và kết nối cơ sở dữ liệu"),
            ("Middleware", "Lớp xử lý trung gian dùng để kiểm tra token, phân quyền hoặc validate dữ liệu trước khi vào controller"),
            ("ProtectedRoute", "Cơ chế bảo vệ route ở frontend, chỉ cho phép người dùng hợp lệ truy cập đúng khu vực chức năng"),
            ("MongoDB Atlas", "Dịch vụ cơ sở dữ liệu MongoDB trên nền tảng cloud"),
            ("Mongoose", "Thư viện Node.js hỗ trợ định nghĩa schema và thao tác với MongoDB"),
            ("Socket.IO", "Thư viện hỗ trợ giao tiếp thời gian thực giữa client và server"),
            ("AuditLog", "Nhật ký hệ thống ghi lại thao tác quan trọng để phục vụ kiểm soát và truy vết"),
            ("Slot khám", "Khung giờ khám cụ thể của bác sĩ trong một ngày làm việc"),
            ("Hàng đợi khám", "Danh sách bệnh nhân chờ được bác sĩ gọi vào khám theo lịch đã xác nhận"),
            ("Danh sách chờ", "Cơ chế cho phép bệnh nhân đăng ký chờ khi khung giờ mong muốn đã đầy"),
            ("Hồ sơ khám bệnh", "Tập thông tin chuyên môn được bác sĩ tạo sau buổi khám, gồm triệu chứng, chẩn đoán, đơn thuốc, kết luận và tệp đính kèm"),
            ("Tái khám", "Lịch khám lại được tạo hoặc gợi ý dựa trên hồ sơ khám bệnh trước đó"),
            ("Smoke test", "Kiểm thử nhanh các luồng chính để xác nhận hệ thống hoạt động cơ bản sau khi triển khai"),
        ]
        _, anchor = remove_after_heading_until(body, "DANH MỤC THUẬT NGỮ", {"MỞ ĐẦU"})
        insert_after(body, anchor, [table(term_rows)])

        # Recreate the front/main section break immediately before "MỞ ĐẦU".
        direct_children = list(body)
        mo_dau_child_idx = next(
            i for i, child in enumerate(direct_children)
            if child.tag == w("p") and text_of(child) == "MỞ ĐẦU"
        )
        prev_para = None
        for child in reversed(direct_children[:mo_dau_child_idx]):
            if child.tag == w("p"):
                prev_para = child
                break
        body_sect_template = body.find(w("sectPr"))
        if prev_para is not None:
            ppr = ensure_ppr(prev_para)
            old = ppr.find(w("sectPr"))
            if old is not None:
                ppr.remove(old)
            new_sect = ET.Element(w("sectPr"))
            if body_sect_template is not None:
                for child in list(body_sect_template):
                    if child.tag not in (w("headerReference"), w("footerReference"), w("pgNumType")):
                        new_sect.append(ET.fromstring(ET.tostring(child)))
            ppr.append(new_sect)

        # Header page numbers, no footer page numbers.
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

        tree.write(doc_path, encoding="utf-8", xml_declaration=True)
        rels_tree.write(rels_path, encoding="utf-8", xml_declaration=True)

        if OUT.exists():
            OUT.unlink()
        with ZipFile(OUT, "w", ZIP_DEFLATED) as zout:
            for path in tmp.rglob("*"):
                if path.is_file():
                    zout.write(path, path.relative_to(tmp).as_posix())

    print(f"OUT={OUT.resolve()}")
    print(f"toc={len(toc)} figures={len(figures)} tables={len(tables)}")


if __name__ == "__main__":
    main()
