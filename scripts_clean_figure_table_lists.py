from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import re
import tempfile
import xml.etree.ElementTree as ET

SRC = Path("22010342_Dinh_Xuan_Quyen_bao_cao_word_references_final_clean_tables.docm")
OUT = Path("22010342_Dinh_Xuan_Quyen_bao_cao_final_clean_lists.docm")

W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
XML = "http://www.w3.org/XML/1998/namespace"

ET.register_namespace("w", W)


def qn(ns, tag):
    return f"{{{ns}}}{tag}"


def w(tag):
    return qn(W, tag)


def text_of(p):
    return "".join(t.text or "" for t in p.findall(".//" + w("t"))).strip()


def ensure_ppr(p):
    ppr = p.find(w("pPr"))
    if ppr is None:
        ppr = ET.Element(w("pPr"))
        p.insert(0, ppr)
    return ppr


def run_text(txt, size="26", bold=False):
    rr = ET.Element(w("r"))
    rpr = ET.SubElement(rr, w("rPr"))
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
    t = ET.SubElement(rr, w("t"))
    t.set(qn(XML, "space"), "preserve")
    t.text = txt
    return rr


def field_runs(instr, cached="?"):
    out = []
    begin = ET.Element(w("r"))
    fld = ET.SubElement(begin, w("fldChar"))
    fld.set(w("fldCharType"), "begin")
    fld.set(w("dirty"), "true")
    out.append(begin)
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
    end = ET.Element(w("r"))
    fld = ET.SubElement(end, w("fldChar"))
    fld.set(w("fldCharType"), "end")
    out.append(end)
    return out


def clean_tc_fields(p):
    children = list(p)
    i = 0
    while i < len(children):
        child = children[i]
        if child.tag != w("r"):
            i += 1
            continue
        fld = child.find(w("fldChar"))
        instr = "".join(t.text or "" for t in child.findall(".//" + w("instrText")))
        if " TC " in instr:
            p.remove(child)
            children = list(p)
            continue
        if fld is not None and fld.get(w("fldCharType")) == "begin":
            j = i + 1
            field_text = ""
            while j < len(children):
                field_text += "".join(t.text or "" for t in children[j].findall(".//" + w("instrText")))
                end = children[j].find(w("fldChar"))
                if end is not None and end.get(w("fldCharType")) == "end":
                    break
                j += 1
            if " TC " in field_text:
                for k in range(i, min(j + 1, len(children))):
                    p.remove(children[k])
                children = list(p)
                continue
        i += 1


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
    for r in p.findall(".//" + w("r")):
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


def add_bookmark(p, name, bid):
    for b in p.findall(w("bookmarkStart")):
        if b.get(w("name")) == name:
            return
    start = ET.Element(w("bookmarkStart"))
    start.set(w("id"), str(bid))
    start.set(w("name"), name)
    end = ET.Element(w("bookmarkEnd"))
    end.set(w("id"), str(bid))
    ppr = p.find(w("pPr"))
    p.insert(1 if ppr is not None else 0, start)
    p.append(end)


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


def replace_list(body, heading, entries):
    stops = {
        "DANH MỤC HÌNH ẢNH",
        "DANH MỤC BẢNG BIỂU",
        "DANH MỤC TỪ VIẾT TẮT",
        "DANH MỤC THUẬT NGỮ",
        "MỞ ĐẦU",
    }
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
    for entry in entries:
        body.insert(pos, entry)
        pos += 1


def main():
    with tempfile.TemporaryDirectory() as td:
        tmp = Path(td)
        with ZipFile(SRC) as zin:
            zin.extractall(tmp)

        doc_path = tmp / "word" / "document.xml"
        tree = ET.parse(doc_path)
        root = tree.getroot()
        body = root.find(w("body"))

        for p in root.findall(".//" + w("p")):
            clean_tc_fields(p)

        paras = root.findall(".//" + w("p"))
        mo_dau_positions = [i for i, p in enumerate(paras) if text_of(p) == "MỞ ĐẦU"]
        content_start = mo_dau_positions[-1] if mo_dau_positions else 0

        figure_entries = []
        table_entries = []
        bid = 9000
        seen = set()
        for idx, p in enumerate(paras):
            if idx < content_start:
                continue
            txt = text_of(p)
            if re.match(r"^Hình\s+\d+\.\d+\.", txt):
                clean = re.sub(r"\s+", " ", txt).strip()
                normalize_caption(p)
                if clean not in seen:
                    bookmark = f"fig_clean_{bid}"
                    add_bookmark(p, bookmark, bid)
                    figure_entries.append(list_entry(clean, bookmark))
                    seen.add(clean)
                    bid += 1
            elif re.match(r"^Bảng\s+\d+\.\d+\.", txt):
                clean = re.sub(r"\s+", " ", txt).strip()
                normalize_caption(p)
                if clean not in seen:
                    bookmark = f"tbl_clean_{bid}"
                    add_bookmark(p, bookmark, bid)
                    table_entries.append(list_entry(clean, bookmark))
                    seen.add(clean)
                    bid += 1

        replace_list(body, "DANH MỤC HÌNH ẢNH", figure_entries)
        replace_list(body, "DANH MỤC BẢNG BIỂU", table_entries)

        tree.write(doc_path, encoding="utf-8", xml_declaration=True)
        if OUT.exists():
            OUT.unlink()
        with ZipFile(OUT, "w", ZIP_DEFLATED) as zout:
            for path in tmp.rglob("*"):
                if path.is_file():
                    zout.write(path, path.relative_to(tmp).as_posix())

    print(f"OUT={OUT.resolve()}")
    print(f"figures={len(figure_entries)} tables={len(table_entries)}")


if __name__ == "__main__":
    main()
