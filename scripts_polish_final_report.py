from copy import deepcopy
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import re
import shutil
import tempfile
import xml.etree.ElementTree as ET

SRC = Path("tmp_report_latest.docm")
OUT = Path("22010342_Dinh_Xuan_Quyen_bao_cao_hoan_chinh.docm")

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


def set_text(p, value):
    texts = p.findall(".//" + w("t"))
    if not texts:
        p.append(run_text(value))
        return
    texts[0].text = value
    texts[0].set(qn(XML, "space"), "preserve")
    for t in texts[1:]:
        t.text = ""


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


def set_spacing(p, before=None, after=None, line=None):
    ppr = ensure_ppr(p)
    spacing = ppr.find(w("spacing"))
    if spacing is None:
        spacing = ET.SubElement(ppr, w("spacing"))
    if before is not None:
        spacing.set(w("before"), str(before))
    if after is not None:
        spacing.set(w("after"), str(after))
    if line is not None:
        spacing.set(w("line"), str(line))
        spacing.set(w("lineRule"), "auto")


def set_jc(p, val):
    ppr = ensure_ppr(p)
    jc = ppr.find(w("jc"))
    if jc is None:
        jc = ET.SubElement(ppr, w("jc"))
    jc.set(w("val"), val)


def run_text(txt, bold=False, italic=False, size="28"):
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
    if italic:
        ET.SubElement(rpr, w("i"))
    t = ET.SubElement(rr, w("t"))
    t.set(qn(XML, "space"), "preserve")
    t.text = txt
    return rr


def field_run(instr, cached="?"):
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
    parts.append(run_text(cached))
    end = ET.Element(w("r"))
    fld = ET.SubElement(end, w("fldChar"))
    fld.set(w("fldCharType"), "end")
    parts.append(end)
    return parts


def entry_paragraph(label, bookmark, level=1):
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
    spacing.set(w("after"), "60")
    p.append(run_text(label + "\t", bold=(level == 1)))
    for rr in field_run(f" PAGEREF {bookmark} \\h "):
        p.append(rr)
    return p


def title_paragraph(text):
    p = ET.Element(w("p"))
    ppr = ET.SubElement(p, w("pPr"))
    jc = ET.SubElement(ppr, w("jc"))
    jc.set(w("val"), "center")
    spacing = ET.SubElement(ppr, w("spacing"))
    spacing.set(w("before"), "240")
    spacing.set(w("after"), "240")
    p.append(run_text(text, bold=True, size="32"))
    return p


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


def clean_heading(p, text):
    clear_after_ppr(p)
    p.append(run_text(text, bold=True, size="32"))
    set_jc(p, "center")
    set_spacing(p, before=240, after=240)


def add_outline_level(p, lvl):
    ppr = ensure_ppr(p)
    old = ppr.find(w("outlineLvl"))
    if old is None:
        old = ET.SubElement(ppr, w("outlineLvl"))
    old.set(w("val"), str(lvl))


def remove_numbering(p):
    ppr = ensure_ppr(p)
    num = ppr.find(w("numPr"))
    if num is not None:
        ppr.remove(num)


def add_bookmark(p, name, bid):
    start = ET.Element(w("bookmarkStart"))
    start.set(w("id"), str(bid))
    start.set(w("name"), name)
    end = ET.Element(w("bookmarkEnd"))
    end.set(w("id"), str(bid))
    ppr = p.find(w("pPr"))
    p.insert(1 if ppr is not None else 0, start)
    p.append(end)


def footer_xml():
    root = ET.Element(w("ftr"))
    p = ET.SubElement(root, w("p"))
    ppr = ET.SubElement(p, w("pPr"))
    jc = ET.SubElement(ppr, w("jc"))
    jc.set(w("val"), "center")
    for rr in field_run(" PAGE ", cached="1"):
        p.append(rr)
    return ET.tostring(root, encoding="utf-8", xml_declaration=True)


def add_footer_rel(rels_root, target):
    nums = []
    for item in rels_root.findall(rel("Relationship")):
        rid = item.attrib.get("Id", "")
        if rid.startswith("rId") and rid[3:].isdigit():
            nums.append(int(rid[3:]))
    rid = f"rId{max(nums or [0]) + 1}"
    item = ET.SubElement(rels_root, rel("Relationship"))
    item.set("Id", rid)
    item.set("Type", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer")
    item.set("Target", target)
    return rid


def set_footer_and_pgnum(sect, rid, fmt, start):
    for child in list(sect):
        if child.tag in (w("footerReference"), w("pgNumType")):
            sect.remove(child)
    fr = ET.Element(w("footerReference"))
    fr.set(w("type"), "default")
    fr.set(r("id"), rid)
    pg = ET.Element(w("pgNumType"))
    pg.set(w("fmt"), fmt)
    pg.set(w("start"), str(start))
    sect.insert(0, fr)
    sect.insert(1, pg)


def ensure_settings_update(settings_root):
    upd = settings_root.find(w("updateFields"))
    if upd is None:
        upd = ET.SubElement(settings_root, w("updateFields"))
    upd.set(w("val"), "true")


def normalize_caption_text(txt, kind):
    if kind == "fig":
        m = re.match(r"^(?:Hình\s*)?(\d+)\.(\d+)(?:\.[a-zA-Z]|[a-zA-Z])?\.?\s*(.*)$", txt)
        if not m:
            return None
        return int(m.group(1)), (m.group(3) or "").strip()
    m = re.match(r"^(?:Bảng\s*)?(\d+)\.(\d+)\.?\s*(.*)$", txt)
    if not m:
        return None
    return int(m.group(1)), (m.group(3) or "").strip()


def replace_front_section(body, heading_text, inserted):
    children = list(body)
    start = None
    for i, child in enumerate(children):
        if child.tag == w("p") and text_of(child).upper() == heading_text:
            start = i
            break
    if start is None:
        return False
    front_heads = {
        "MỤC LỤC",
        "DANH MỤC HÌNH ẢNH",
        "DANH MỤC BẢNG BIỂU",
        "DANH MỤC TỪ VIẾT TẮT",
        "DANH MỤC THUẬT NGỮ",
        "MỞ ĐẦU",
    }
    end = len(children)
    for j in range(start + 1, len(children)):
        if children[j].tag == w("p") and text_of(children[j]).upper() in front_heads:
            end = j
            break
    for child in children[start + 1 : end]:
        body.remove(child)
    anchor = list(body)[start]
    pos = list(body).index(anchor) + 1
    for item in inserted:
        body.insert(pos, item)
        pos += 1
    return True


def level_for_heading(txt):
    up = txt.upper()
    if up in {
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
    } or (txt == up and re.match(r"^CHƯƠNG\s+\d+\s*[:.]", up)):
        return 1
    if re.match(r"^\d+\.\d+\.\d+\.\s+", txt):
        return 3
    if re.match(r"^\d+\.\d+\.\s+", txt):
        return 2
    return None


def main():
    with tempfile.TemporaryDirectory() as td:
        tmp = Path(td)
        with ZipFile(SRC) as zin:
            zin.extractall(tmp)

        doc_path = tmp / "word" / "document.xml"
        tree = ET.parse(doc_path)
        root = tree.getroot()
        body = root.find(w("body"))

        # Fix caption-like paragraphs that were missing the word "Hình".
        for p in body.findall(w("p")):
            txt = text_of(p)
            if re.match(r"^4\.(2[4-9]|3[0-4])\.\s+Màn hình", txt):
                set_text(p, "Hình " + txt)

        # Add the missing caption for the deployment model figure in section 4.8.1.
        direct = list(body)
        for i, child in enumerate(direct):
            if child.tag != w("p"):
                continue
            if text_of(child) != "Sơ đồ triển khai có thể mô tả ở mức tổng quát như sau:":
                continue
            insert_after = None
            for j in range(i + 1, min(i + 6, len(direct))):
                if direct[j].tag == w("p") and (
                    direct[j].find(".//" + w("drawing")) is not None
                    or direct[j].find(".//" + w("pict")) is not None
                ):
                    insert_after = j
                    break
            if insert_after is not None:
                next_txt = text_of(direct[insert_after + 1]) if insert_after + 1 < len(direct) else ""
                if "Mô hình triển khai hệ thống" not in next_txt:
                    body.insert(insert_after + 1, caption_paragraph("Hình 4.999. Mô hình triển khai hệ thống"))
            break

        # Renumber all figure captions continuously inside each chapter.
        fig_items = []
        fig_counts = {}
        for p in body.findall(w("p")):
            txt = text_of(p)
            if not txt.startswith("Hình"):
                continue
            info = normalize_caption_text(txt, "fig")
            if not info:
                continue
            chap, title = info
            if not title:
                continue
            fig_counts[chap] = fig_counts.get(chap, 0) + 1
            new_txt = f"Hình {chap}.{fig_counts[chap]}. {title}"
            set_text(p, new_txt)
            set_jc(p, "center")
            set_spacing(p, before=120, after=120)
            remove_numbering(p)
            add_outline_level(p, 9)
            fig_items.append((p, new_txt))

        table_items = []
        table_counts = {}
        for p in body.findall(w("p")):
            txt = text_of(p)
            info = normalize_caption_text(txt, "table")
            if not info or txt.startswith("Hình"):
                continue
            chap, title = info
            if not txt.startswith("Bảng") or not title:
                continue
            table_counts[chap] = table_counts.get(chap, 0) + 1
            new_txt = f"Bảng {chap}.{table_counts[chap]}. {title}"
            set_text(p, new_txt)
            set_jc(p, "center")
            set_spacing(p, before=120, after=120)
            remove_numbering(p)
            add_outline_level(p, 9)
            table_items.append((p, new_txt))

        # Prepare headings and bookmarks for the manual TOC.
        front_ch1 = [
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
        toc_items = []
        bookmark_id = 10
        front_majors = {
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
        }
        for p in body.findall(w("p")):
            txt = text_of(p)
            up = txt.upper()
            display = None
            lvl = None
            if up in front_majors or (txt == up and re.match(r"^CHƯƠNG\s+\d+\s*[:.]", up)):
                display = txt
                lvl = 1
                clean_heading(p, txt)
            elif txt in front_ch1:
                ch1_no += 1
                display = f"1.{ch1_no}. {txt}"
                lvl = 2
                add_outline_level(p, 1)
                remove_numbering(p)
            elif re.match(r"^\d+\.\d+\.\d+\.\s+\S", txt):
                display = txt
                lvl = 3
                add_outline_level(p, 2)
            elif re.match(r"^\d+\.\d+\.\s+\S", txt):
                display = txt
                lvl = 2
                add_outline_level(p, 1)
            if display and lvl and not display.startswith(("Hình ", "Bảng ")):
                bm = f"toc_{bookmark_id}"
                add_bookmark(p, bm, bookmark_id)
                bookmark_id += 1
                toc_items.append((display, bm, lvl))

        # Bookmarks for lists.
        fig_list = []
        for idx, (p, cap) in enumerate(fig_items, 1):
            bm = f"fig_{idx}"
            add_bookmark(p, bm, bookmark_id)
            bookmark_id += 1
            fig_list.append(entry_paragraph(cap, bm, 1))

        tbl_list = []
        for idx, (p, cap) in enumerate(table_items, 1):
            bm = f"tbl_{idx}"
            add_bookmark(p, bm, bookmark_id)
            bookmark_id += 1
            tbl_list.append(entry_paragraph(cap, bm, 1))

        toc_list = [entry_paragraph(label, bm, lvl) for label, bm, lvl in toc_items]
        replace_front_section(body, "MỤC LỤC", toc_list)
        replace_front_section(body, "DANH MỤC HÌNH ẢNH", fig_list)
        replace_front_section(body, "DANH MỤC BẢNG BIỂU", tbl_list)

        # Footer/page numbering: cover no page number, front matter roman, main from "MỞ ĐẦU" decimal 1.
        rels_path = tmp / "word" / "_rels" / "document.xml.rels"
        rels_tree = ET.parse(rels_path)
        rels_root = rels_tree.getroot()
        (tmp / "word" / "footer_codex_roman.xml").write_bytes(footer_xml())
        (tmp / "word" / "footer_codex_arabic.xml").write_bytes(footer_xml())
        roman_rid = add_footer_rel(rels_root, "footer_codex_roman.xml")
        arabic_rid = add_footer_rel(rels_root, "footer_codex_arabic.xml")

        # Main section: body sectPr.
        body_sect = body.find(w("sectPr"))
        if body_sect is None:
            body_sect = ET.SubElement(body, w("sectPr"))
        set_footer_and_pgnum(body_sect, arabic_rid, "decimal", 1)

        # Roman section break: paragraph right before "MỞ ĐẦU".
        body_children = list(body)
        mo_dau_index = next(
            i for i, child in enumerate(body_children)
            if child.tag == w("p") and text_of(child).upper() == "MỞ ĐẦU"
        )
        prev_p = None
        for child in reversed(body_children[:mo_dau_index]):
            if child.tag == w("p"):
                prev_p = child
                break
        if prev_p is not None:
            ppr = ensure_ppr(prev_p)
            sect = ppr.find(w("sectPr"))
            if sect is None:
                sect = ET.SubElement(ppr, w("sectPr"))
            set_footer_and_pgnum(sect, roman_rid, "lowerRoman", 1)

        # Existing cover-section break: remove/footerless and avoid visible number.
        first_break = None
        for child in list(body):
            if child.tag == w("p"):
                sect = child.find(w("pPr") + "/" + w("sectPr"))
                if sect is not None:
                    first_break = sect
                    break
        if first_break is not None:
            for child in list(first_break):
                if child.tag in (w("footerReference"), w("pgNumType")):
                    first_break.remove(child)

        # Add/update content types for new footer parts.
        ct_path = tmp / "[Content_Types].xml"
        ct_tree = ET.parse(ct_path)
        ct_root = ct_tree.getroot()
        CT = "http://schemas.openxmlformats.org/package/2006/content-types"
        existing = {el.get("PartName") for el in ct_root.findall(qn(CT, "Override"))}
        for part in ("/word/footer_codex_roman.xml", "/word/footer_codex_arabic.xml"):
            if part not in existing:
                el = ET.SubElement(ct_root, qn(CT, "Override"))
                el.set("PartName", part)
                el.set("ContentType", "application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml")
        ct_tree.write(ct_path, encoding="utf-8", xml_declaration=True)

        settings_path = tmp / "word" / "settings.xml"
        if settings_path.exists():
            settings_tree = ET.parse(settings_path)
            ensure_settings_update(settings_tree.getroot())
            settings_tree.write(settings_path, encoding="utf-8", xml_declaration=True)

        tree.write(doc_path, encoding="utf-8", xml_declaration=True)
        rels_tree.write(rels_path, encoding="utf-8", xml_declaration=True)

        if OUT.exists():
            OUT.unlink()
        with ZipFile(OUT, "w", ZIP_DEFLATED) as zout:
            for path in tmp.rglob("*"):
                if path.is_file():
                    zout.write(path, path.relative_to(tmp).as_posix())

    print(f"OUT={OUT.resolve()}")
    print(f"figures={len(fig_items)} tables={len(table_items)} toc_entries={len(toc_items)}")


if __name__ == "__main__":
    main()
