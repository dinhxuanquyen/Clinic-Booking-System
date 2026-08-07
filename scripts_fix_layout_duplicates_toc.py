from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import re
import tempfile
import xml.etree.ElementTree as ET

SRC = Path("22010342_Dinh_Xuan_Quyen_bao_cao_final_clean_lists.docm")
OUT = Path("22010342_Dinh_Xuan_Quyen_bao_cao_final_polished_lists.docm")

W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
XML = "http://www.w3.org/XML/1998/namespace"

ET.register_namespace("w", W)


def qn(ns, tag):
    return f"{{{ns}}}{tag}"


def w(tag):
    return qn(W, tag)


def text_of(el):
    return "".join(t.text or "" for t in el.findall(".//" + w("t"))).strip()


def ensure_ppr(p):
    ppr = p.find(w("pPr"))
    if ppr is None:
        ppr = ET.Element(w("pPr"))
        p.insert(0, ppr)
    return ppr


def run_text(txt, size="26", bold=False):
    r = ET.Element(w("r"))
    rpr = ET.SubElement(r, w("rPr"))
    fonts = ET.SubElement(rpr, w("rFonts"))
    fonts.set(w("ascii"), "Times New Roman")
    fonts.set(w("hAnsi"), "Times New Roman")
    fonts.set(w("eastAsia"), "Times New Roman")
    sz = ET.SubElement(rpr, w("sz"))
    sz.set(w("val"), size)
    szcs = ET.SubElement(rpr, w("szCs"))
    szcs.set(w("val"), size)
    if bold:
        ET.SubElement(rpr, w("b"))
        ET.SubElement(rpr, w("bCs"))
    t = ET.SubElement(r, w("t"))
    t.set(qn(XML, "space"), "preserve")
    t.text = txt
    return r


def set_clean_text(p, txt):
    ppr = ensure_ppr(p)
    for child in list(p):
        if child is not ppr:
            p.remove(child)
    p.append(run_text(txt, size="26"))


def caption_para(txt):
    p = ET.Element(w("p"))
    ppr = ET.SubElement(p, w("pPr"))
    jc = ET.SubElement(ppr, w("jc"))
    jc.set(w("val"), "center")
    spacing = ET.SubElement(ppr, w("spacing"))
    spacing.set(w("before"), "120")
    spacing.set(w("after"), "120")
    p.append(run_text(txt, size="26"))
    return p


def normalize_caption(p):
    ppr = ensure_ppr(p)
    jc = ppr.find(w("jc"))
    if jc is None:
        jc = ET.SubElement(ppr, w("jc"))
    jc.set(w("val"), "center")
    spacing = ppr.find(w("spacing"))
    if spacing is None:
        spacing = ET.SubElement(ppr, w("spacing"))
    spacing.set(w("before"), "120")
    spacing.set(w("after"), "120")
    for r in p.findall(w("r")):
        rpr = r.find(w("rPr"))
        if rpr is None:
            rpr = ET.Element(w("rPr"))
            r.insert(0, rpr)
        fonts = rpr.find(w("rFonts"))
        if fonts is None:
            fonts = ET.SubElement(rpr, w("rFonts"))
        fonts.set(w("ascii"), "Times New Roman")
        fonts.set(w("hAnsi"), "Times New Roman")
        fonts.set(w("eastAsia"), "Times New Roman")
        for tag in ("sz", "szCs"):
            sz = rpr.find(w(tag))
            if sz is None:
                sz = ET.SubElement(rpr, w(tag))
            sz.set(w("val"), "26")


def keep_with_next(p):
    ppr = ensure_ppr(p)
    if ppr.find(w("keepNext")) is None:
        ET.SubElement(ppr, w("keepNext"))
    if ppr.find(w("keepLines")) is None:
        ET.SubElement(ppr, w("keepLines"))


def remove_page_break_before(el):
    if el.tag != w("p"):
        return
    ppr = ensure_ppr(el)
    pbb = ppr.find(w("pageBreakBefore"))
    if pbb is not None:
        ppr.remove(pbb)


def list_entry(label, bookmark):
    p = ET.Element(w("p"))
    ppr = ET.SubElement(p, w("pPr"))
    tabs = ET.SubElement(ppr, w("tabs"))
    tab = ET.SubElement(tabs, w("tab"))
    tab.set(w("val"), "right")
    tab.set(w("leader"), "dot")
    tab.set(w("pos"), "9000")
    spacing = ET.SubElement(ppr, w("spacing"))
    spacing.set(w("after"), "70")
    link = ET.SubElement(p, w("hyperlink"))
    link.set(w("anchor"), bookmark)
    link.append(run_text(label, size="26"))
    p.append(run_text("\t", size="26"))
    for rr in field_runs(f" PAGEREF {bookmark} \\h ", "?"):
        p.append(rr)
    return p


def field_runs(instr, cached="?"):
    out = []
    b = ET.Element(w("r"))
    fld = ET.SubElement(b, w("fldChar"))
    fld.set(w("fldCharType"), "begin")
    fld.set(w("dirty"), "true")
    out.append(b)
    ir = ET.Element(w("r"))
    it = ET.SubElement(ir, w("instrText"))
    it.set(qn(XML, "space"), "preserve")
    it.text = instr
    out.append(ir)
    sep = ET.Element(w("r"))
    fld = ET.SubElement(sep, w("fldChar"))
    fld.set(w("fldCharType"), "separate")
    out.append(sep)
    out.append(run_text(cached, size="26"))
    e = ET.Element(w("r"))
    fld = ET.SubElement(e, w("fldChar"))
    fld.set(w("fldCharType"), "end")
    out.append(e)
    return out


def add_bookmark(p, name, bid):
    start = ET.Element(w("bookmarkStart"))
    start.set(w("id"), str(bid))
    start.set(w("name"), name)
    end = ET.Element(w("bookmarkEnd"))
    end.set(w("id"), str(bid))
    ppr = p.find(w("pPr"))
    p.insert(1 if ppr is not None else 0, start)
    p.append(end)


def replace_list(body, heading, entries):
    stops = {"DANH MỤC HÌNH ẢNH", "DANH MỤC BẢNG BIỂU", "DANH MỤC TỪ VIẾT TẮT", "DANH MỤC THUẬT NGỮ", "MỞ ĐẦU"}
    children = list(body)
    start = next(i for i, c in enumerate(children) if c.tag == w("p") and text_of(c) == heading)
    end = len(children)
    for j in range(start + 1, len(children)):
        if children[j].tag == w("p") and text_of(children[j]) in stops - {heading}:
            end = j
            break
    for child in children[start + 1:end]:
        body.remove(child)
    anchor = list(body)[start]
    pos = list(body).index(anchor) + 1
    for e in entries:
        body.insert(pos, e)
        pos += 1


def patch_toc_styles(tmp):
    styles_path = tmp / "word" / "styles.xml"
    if not styles_path.exists():
        return
    tree = ET.parse(styles_path)
    root = tree.getroot()
    for style_id, size, bold in [("TOC1", "28", True), ("TOC2", "26", False), ("TOC3", "26", False)]:
        st = root.find(f".//{w('style')}[@{w('styleId')}='{style_id}']")
        if st is None:
            continue
        rpr = st.find(w("rPr"))
        if rpr is None:
            rpr = ET.SubElement(st, w("rPr"))
        fonts = rpr.find(w("rFonts"))
        if fonts is None:
            fonts = ET.SubElement(rpr, w("rFonts"))
        fonts.set(w("ascii"), "Times New Roman")
        fonts.set(w("hAnsi"), "Times New Roman")
        fonts.set(w("eastAsia"), "Times New Roman")
        for tag in ("sz", "szCs"):
            sz = rpr.find(w(tag))
            if sz is None:
                sz = ET.SubElement(rpr, w(tag))
            sz.set(w("val"), size)
        for tag in ("b", "bCs"):
            old = rpr.find(w(tag))
            if bold and old is None:
                ET.SubElement(rpr, w(tag))
            elif not bold and old is not None:
                rpr.remove(old)
        ppr = st.find(w("pPr"))
        if ppr is None:
            ppr = ET.SubElement(st, w("pPr"))
        tabs = ppr.find(w("tabs"))
        if tabs is None:
            tabs = ET.SubElement(ppr, w("tabs"))
        for old in list(tabs):
            tabs.remove(old)
        tab = ET.SubElement(tabs, w("tab"))
        tab.set(w("val"), "right")
        tab.set(w("leader"), "dot")
        tab.set(w("pos"), "9800")
    tree.write(styles_path, encoding="utf-8", xml_declaration=True)


def main():
    with tempfile.TemporaryDirectory() as td:
        tmp = Path(td)
        with ZipFile(SRC) as zin:
            zin.extractall(tmp)
        doc_path = tmp / "word" / "document.xml"
        tree = ET.parse(doc_path)
        root = tree.getroot()
        body = root.find(w("body"))
        children = list(body)

        # Move/clean deployment table captions.
        for i, el in enumerate(list(body)):
            if el.tag == w("p") and text_of(el) == "Bảng dưới đây trình bày các nhóm biến môi trường chính của hệ thống:":
                # Insert caption before the next table if missing.
                for j in range(i + 1, min(i + 8, len(list(body)))):
                    if list(body)[j].tag == w("tbl"):
                        prev_txts = [text_of(x) for x in list(body)[max(0, j - 4):j] if x.tag == w("p")]
                        if not any(x.startswith("Bảng 4.22.") for x in prev_txts):
                            body.insert(j, caption_para("Bảng 4.22. Nhóm biến môi trường chính"))
                        break
                break

        for p in root.findall(".//" + w("p")):
            txt = text_of(p)
            if txt == "Bảng 4.22. Nhóm biến môi trường chính" and "Các kết quả có thể kiểm tra" not in text_of(p):
                pass
            if txt == "Bảng 4.24. Kết quả kiểm tra sau triển khai":
                set_clean_text(p, "Bảng 4.23. Kết quả kiểm tra sau triển khai")

        # Remove duplicate caption directly before the result table.
        children = list(body)
        for idx, el in enumerate(children):
            if el.tag == w("tbl"):
                prev_ps = []
                for j in range(idx - 1, max(-1, idx - 5), -1):
                    if children[j].tag == w("p") and text_of(children[j]).startswith("Bảng "):
                        prev_ps.append((j, text_of(children[j])))
                if len(prev_ps) > 1:
                    # keep nearest caption, remove older captions immediately above it
                    for j, _ in prev_ps[1:]:
                        body.remove(children[j])

        # Keep front-matter headings with their following tables.
        children = list(body)
        for i, el in enumerate(children):
            txt = text_of(el)
            if txt in {"DANH MỤC TỪ VIẾT TẮT", "DANH MỤC THUẬT NGỮ"}:
                remove_page_break_before(el)
                keep_with_next(el)
                # If blank paragraphs separate heading from table, keep only one short paragraph.
                j = i + 1
                while j < len(children) and children[j].tag == w("p") and not text_of(children[j]):
                    body.remove(children[j])
                    children = list(body)
                if j < len(children):
                    remove_page_break_before(children[j])

        # Normalize all visible captions.
        for p in root.findall(".//" + w("p")):
            if re.match(r"^(Hình|Bảng)\s+\d+\.\d+\.", text_of(p)):
                normalize_caption(p)

        # Rebuild figure/table lists after caption cleanup.
        paras = root.findall(".//" + w("p"))
        mo_positions = [i for i, p in enumerate(paras) if text_of(p) == "MỞ ĐẦU"]
        content_start = mo_positions[-1] if mo_positions else 0
        fig_entries, tbl_entries, seen = [], [], set()
        bid = 12000
        for idx, p in enumerate(paras):
            if idx < content_start:
                continue
            txt = re.sub(r"\s+", " ", text_of(p)).strip()
            if re.match(r"^Hình\s+\d+\.\d+\.", txt) and txt not in seen:
                bm = f"fig_polished_{bid}"
                add_bookmark(p, bm, bid)
                fig_entries.append(list_entry(txt, bm))
                seen.add(txt); bid += 1
            elif re.match(r"^Bảng\s+\d+\.\d+\.", txt) and txt not in seen:
                bm = f"tbl_polished_{bid}"
                add_bookmark(p, bm, bid)
                tbl_entries.append(list_entry(txt, bm))
                seen.add(txt); bid += 1

        replace_list(body, "DANH MỤC HÌNH ẢNH", fig_entries)
        replace_list(body, "DANH MỤC BẢNG BIỂU", tbl_entries)
        patch_toc_styles(tmp)

        tree.write(doc_path, encoding="utf-8", xml_declaration=True)
        if OUT.exists():
            OUT.unlink()
        with ZipFile(OUT, "w", ZIP_DEFLATED) as zout:
            for path in tmp.rglob("*"):
                if path.is_file():
                    zout.write(path, path.relative_to(tmp).as_posix())
    print(f"OUT={OUT.resolve()}")
    print(f"figures={len(fig_entries)} tables={len(tbl_entries)}")


if __name__ == "__main__":
    main()
