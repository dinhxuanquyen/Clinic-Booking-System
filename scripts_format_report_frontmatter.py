from copy import deepcopy
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import re
import shutil
import tempfile
import xml.etree.ElementTree as ET

SRC = Path("22010342_Dinh_Xuan_Quyen_danh_so_trang_danh_muc.docm")
OUT = Path("22010342_Dinh_Xuan_Quyen_da_chinh_trang_danh_muc.docm")

W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
REL = "http://schemas.openxmlformats.org/package/2006/relationships"

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


def clear_text_runs(p):
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
    t.set(qn("http://www.w3.org/XML/1998/namespace", "space"), "preserve")
    t.text = txt
    return rr


def set_heading_paragraph(p):
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
    clear_text_runs(p)


def entry_paragraph(caption, bookmark):
    p = ET.Element(w("p"))
    ppr = ET.SubElement(p, w("pPr"))
    tabs = ET.SubElement(ppr, w("tabs"))
    tab = ET.SubElement(tabs, w("tab"))
    tab.set(w("val"), "right")
    tab.set(w("leader"), "dot")
    tab.set(w("pos"), "9000")
    spacing = ET.SubElement(ppr, w("spacing"))
    spacing.set(w("after"), "120")
    p.append(run_text(caption + "\t", size="28"))

    begin = ET.Element(w("r"))
    fld = ET.SubElement(begin, w("fldChar"))
    fld.set(w("fldCharType"), "begin")
    p.append(begin)

    instr = ET.Element(w("r"))
    instr_text = ET.SubElement(instr, w("instrText"))
    instr_text.set(qn("http://www.w3.org/XML/1998/namespace", "space"), "preserve")
    instr_text.text = f" PAGEREF {bookmark} \\h "
    p.append(instr)

    sep = ET.Element(w("r"))
    fld = ET.SubElement(sep, w("fldChar"))
    fld.set(w("fldCharType"), "separate")
    p.append(sep)
    p.append(run_text("?", size="28"))

    end = ET.Element(w("r"))
    fld = ET.SubElement(end, w("fldChar"))
    fld.set(w("fldCharType"), "end")
    p.append(end)
    return p


def toc_field_paragraph():
    p = ET.Element(w("p"))
    ppr = ET.SubElement(p, w("pPr"))
    spacing = ET.SubElement(ppr, w("spacing"))
    spacing.set(w("after"), "120")
    begin = ET.Element(w("r"))
    fld = ET.SubElement(begin, w("fldChar"))
    fld.set(w("fldCharType"), "begin")
    p.append(begin)
    instr = ET.Element(w("r"))
    instr_text = ET.SubElement(instr, w("instrText"))
    instr_text.set(qn("http://www.w3.org/XML/1998/namespace", "space"), "preserve")
    instr_text.text = r' TOC \o "1-3" \h \z \u '
    p.append(instr)
    sep = ET.Element(w("r"))
    fld = ET.SubElement(sep, w("fldChar"))
    fld.set(w("fldCharType"), "separate")
    p.append(sep)
    p.append(run_text("Mục lục sẽ được cập nhật khi mở tài liệu và nhấn Ctrl+A, F9.", size="26"))
    end = ET.Element(w("r"))
    fld = ET.SubElement(end, w("fldChar"))
    fld.set(w("fldCharType"), "end")
    p.append(end)
    return p


def add_bookmark(p, name, bid):
    ppr = p.find(w("pPr"))
    insert_pos = 1 if ppr is not None else 0
    start = ET.Element(w("bookmarkStart"))
    start.set(w("id"), str(bid))
    start.set(w("name"), name)
    p.insert(insert_pos, start)
    end = ET.Element(w("bookmarkEnd"))
    end.set(w("id"), str(bid))
    p.append(end)


def footer_xml():
    root = ET.Element(w("ftr"))
    p = ET.SubElement(root, w("p"))
    ppr = ET.SubElement(p, w("pPr"))
    jc = ET.SubElement(ppr, w("jc"))
    jc.set(w("val"), "center")
    begin = ET.SubElement(p, w("r"))
    fld = ET.SubElement(begin, w("fldChar"))
    fld.set(w("fldCharType"), "begin")
    instr = ET.SubElement(p, w("r"))
    it = ET.SubElement(instr, w("instrText"))
    it.set(qn("http://www.w3.org/XML/1998/namespace", "space"), "preserve")
    it.text = " PAGE "
    sep = ET.SubElement(p, w("r"))
    fld = ET.SubElement(sep, w("fldChar"))
    fld.set(w("fldCharType"), "separate")
    p.append(run_text("1", size="24"))
    end = ET.SubElement(p, w("r"))
    fld = ET.SubElement(end, w("fldChar"))
    fld.set(w("fldCharType"), "end")
    return ET.tostring(root, encoding="utf-8", xml_declaration=True)


def add_footer_rel(rels_root, target):
    existing_ids = []
    for rr in rels_root.findall(rel("Relationship")):
        rid = rr.attrib.get("Id", "")
        if rid.startswith("rId"):
            try:
                existing_ids.append(int(rid[3:]))
            except ValueError:
                pass
    rid = f"rId{max(existing_ids or [0]) + 1}"
    rr = ET.SubElement(rels_root, rel("Relationship"))
    rr.set("Id", rid)
    rr.set("Type", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer")
    rr.set("Target", target)
    return rid


def clean_footer_refs(sect):
    for child in list(sect):
        if child.tag == w("footerReference"):
            sect.remove(child)


def set_footer_ref(sect, rid):
    clean_footer_refs(sect)
    fr = ET.Element(w("footerReference"))
    fr.set(w("type"), "default")
    fr.set(r("id"), rid)
    sect.insert(0, fr)


def set_pgnum(sect, fmt, start):
    for child in list(sect):
        if child.tag == w("pgNumType"):
            sect.remove(child)
    pg = ET.Element(w("pgNumType"))
    pg.set(w("fmt"), fmt)
    pg.set(w("start"), str(start))
    # place after footerReference(s)
    sect.insert(1 if sect.find(w("footerReference")) is not None else 0, pg)


def set_update_fields(settings_root):
    upd = settings_root.find(w("updateFields"))
    if upd is None:
        upd = ET.SubElement(settings_root, w("updateFields"))
    upd.set(w("val"), "true")


with tempfile.TemporaryDirectory() as td:
    tmp = Path(td)
    with ZipFile(SRC) as zin:
        zin.extractall(tmp)

    doc_xml = tmp / "word" / "document.xml"
    root = ET.parse(doc_xml).getroot()
    body = root.find(w("body"))
    children = list(body)

    # Make front/main headings visible to TOC without changing visual style.
    heading1_texts = {
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
        if txt in heading1_texts or txt.startswith("CHƯƠNG"):
            ppr = ensure_ppr(p)
            ol = ppr.find(w("outlineLvl"))
            if ol is None:
                ol = ET.SubElement(ppr, w("outlineLvl"))
            ol.set(w("val"), "0")
        elif re.match(r"^\d+\.\d+\.?\s+.+", txt):
            ppr = ensure_ppr(p)
            ol = ppr.find(w("outlineLvl"))
            if ol is None:
                ol = ET.SubElement(ppr, w("outlineLvl"))
            ol.set(w("val"), "1")
        elif re.match(r"^\d+\.\d+\.\d+\.?\s+.+", txt):
            ppr = ensure_ppr(p)
            ol = ppr.find(w("outlineLvl"))
            if ol is None:
                ol = ET.SubElement(ppr, w("outlineLvl"))
            ol.set(w("val"), "2")

    fig_re = re.compile(r"^Hình\s+\d+(?:\.[\da-zA-Z]+)+\.?\s+.+")
    tab_re = re.compile(r"^Bảng\s+\d+(?:\.[\da-zA-Z]+)+\.?\s*.+")
    figures = []
    tables = []
    bid = 10
    for p in body.findall(w("p")):
        txt = text_of(p)
        if fig_re.match(txt):
            name = f"fig_{bid}"
            add_bookmark(p, name, bid)
            figures.append((txt, name))
            bid += 1
        elif tab_re.match(txt):
            name = f"tbl_{bid}"
            add_bookmark(p, name, bid)
            tables.append((txt, name))
            bid += 1

    # Add the deployment figure to the list if it is still represented by placeholder text.
    if any("Hinh_4_49_mo_hinh_trien_khai_he_thong.png" in text_of(p) for p in body.findall(w("p"))):
        figures.append(("Hình 4.49. Mô hình triển khai hệ thống", "fig_4_49_placeholder"))

    def find_child_index(label):
        for i, ch in enumerate(list(body)):
            if ch.tag == w("p") and text_of(ch) == label:
                return i
        raise RuntimeError(f"Cannot find {label}")

    # Insert TOC/list entries from bottom to top to keep indices stable.
    dm_bang_idx = find_child_index("DANH MỤC BẢNG BIỂU")
    insert_after = dm_bang_idx + 1
    for caption, bm in reversed(tables):
        body.insert(insert_after, entry_paragraph(caption, bm))

    dm_hinh_idx = find_child_index("DANH MỤC HÌNH ẢNH")
    insert_after = dm_hinh_idx + 1
    for caption, bm in reversed(figures):
        body.insert(insert_after, entry_paragraph(caption, bm))

    toc_idx = find_child_index("MỤC LỤC")
    body.insert(toc_idx + 1, toc_field_paragraph())

    # Section/page numbering.
    children = list(body)
    final_sect = body.find(w("sectPr"))
    base_sect = deepcopy(final_sect)
    for child in list(base_sect):
        if child.tag in {w("headerReference"), w("footerReference"), w("pgNumType")}:
            base_sect.remove(child)

    rels_path = tmp / "word" / "_rels" / "document.xml.rels"
    rels_tree = ET.parse(rels_path)
    rels_root = rels_tree.getroot()

    footer_roman_name = "footer_codex_roman.xml"
    footer_arabic_name = "footer_codex_arabic.xml"
    (tmp / "word" / footer_roman_name).write_bytes(footer_xml())
    (tmp / "word" / footer_arabic_name).write_bytes(footer_xml())
    rid_roman = add_footer_rel(rels_root, footer_roman_name)
    rid_arabic = add_footer_rel(rels_root, footer_arabic_name)

    # Section 1 exists before summary; remove numbering there.
    for ch in body.findall(w("p")):
        sp = ch.find("./" + w("pPr") + "/" + w("sectPr"))
        if sp is not None:
            clean_footer_refs(sp)
            break

    # End roman section immediately before MỞ ĐẦU.
    mo_dau_idx = find_child_index("MỞ ĐẦU")
    prev_p = None
    for ch in reversed(list(body)[:mo_dau_idx]):
        if ch.tag == w("p"):
            prev_p = ch
            break
    if prev_p is None:
        raise RuntimeError("Cannot find paragraph before MỞ ĐẦU")
    ppr = ensure_ppr(prev_p)
    old = ppr.find(w("sectPr"))
    if old is not None:
        ppr.remove(old)
    roman_sect = deepcopy(base_sect)
    set_footer_ref(roman_sect, rid_roman)
    set_pgnum(roman_sect, "lowerRoman", 1)
    ppr.append(roman_sect)

    # Main section from MỞ ĐẦU: Arabic numbering starts at 1.
    clean_footer_refs(final_sect)
    set_footer_ref(final_sect, rid_arabic)
    set_pgnum(final_sect, "decimal", 1)

    ET.ElementTree(root).write(doc_xml, encoding="utf-8", xml_declaration=True)
    rels_tree.write(rels_path, encoding="utf-8", xml_declaration=True)

    settings_path = tmp / "word" / "settings.xml"
    settings_tree = ET.parse(settings_path)
    set_update_fields(settings_tree.getroot())
    settings_tree.write(settings_path, encoding="utf-8", xml_declaration=True)

    # Content types for new footers.
    ct_path = tmp / "[Content_Types].xml"
    ct_tree = ET.parse(ct_path)
    ct_root = ct_tree.getroot()
    CT = "http://schemas.openxmlformats.org/package/2006/content-types"
    existing = {el.attrib.get("PartName") for el in ct_root.findall(f"{{{CT}}}Override")}
    for name in [footer_roman_name, footer_arabic_name]:
        part = f"/word/{name}"
        if part not in existing:
            ov = ET.SubElement(ct_root, f"{{{CT}}}Override")
            ov.set("PartName", part)
            ov.set("ContentType", "application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml")
    ct_tree.write(ct_path, encoding="utf-8", xml_declaration=True)

    if OUT.exists():
        OUT.unlink()
    with ZipFile(OUT, "w", ZIP_DEFLATED) as zout:
        for file in tmp.rglob("*"):
            if file.is_file():
                zout.write(file, file.relative_to(tmp).as_posix())

print(OUT.resolve())
print(f"figures={len(figures)} tables={len(tables)}")
