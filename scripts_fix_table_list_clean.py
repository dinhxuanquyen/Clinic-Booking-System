from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import re
import tempfile
import xml.etree.ElementTree as ET

SRC = Path("22010342_Dinh_Xuan_Quyen_bao_cao_word_references_final.docm")
OUT = Path("22010342_Dinh_Xuan_Quyen_bao_cao_word_references_final_clean_tables.docm")

W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
XML = "http://www.w3.org/XML/1998/namespace"

ET.register_namespace("w", W)
ET.register_namespace("r", R)


def qn(ns, tag):
    return f"{{{ns}}}{tag}"


def w(tag):
    return qn(W, tag)


def r(tag):
    return qn(R, tag)


def text_of(p):
    return "".join(t.text or "" for t in p.findall(".//" + w("t"))).strip()


def ensure_ppr(p):
    ppr = p.find(w("pPr"))
    if ppr is None:
        ppr = ET.Element(w("pPr"))
        p.insert(0, ppr)
    return ppr


def run_text(txt, bold=False, size="26"):
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
    out.append(run_text(cached))
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
        instr = "".join(t.text or "" for t in child.findall(".//" + w("instrText")))
        fld = child.find(w("fldChar"))
        starts_tc = " TC " in instr
        if fld is not None and fld.get(w("fldCharType")) == "begin":
            # Look ahead to see if this field is a TC field.
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
        if starts_tc:
            p.remove(child)
            children = list(p)
            continue
        i += 1


def add_bookmark(p, name, bid):
    # Avoid duplicate bookmark insertion.
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


def table_entry(label, bookmark):
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


def replace_table_list(body, entries):
    heads = {
        "DANH MỤC BẢNG BIỂU",
        "DANH MỤC TỪ VIẾT TẮT",
        "DANH MỤC THUẬT NGỮ",
        "MỞ ĐẦU",
    }
    children = list(body)
    start = next(i for i, c in enumerate(children) if c.tag == w("p") and text_of(c) == "DANH MỤC BẢNG BIỂU")
    end = len(children)
    for j in range(start + 1, len(children)):
        if children[j].tag == w("p") and text_of(children[j]) in heads - {"DANH MỤC BẢNG BIỂU"}:
            end = j
            break
    for child in children[start + 1 : end]:
        body.remove(child)
    anchor = list(body)[start]
    pos = list(body).index(anchor) + 1
    for item in entries:
        body.insert(pos, item)
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

        # Strip all TC fields so no field code can appear after captions.
        for p in root.findall(".//" + w("p")):
            clean_tc_fields(p)

        entries = []
        bid = 7000
        for p in root.findall(".//" + w("p")):
            txt = text_of(p)
            if re.match(r"^Bảng\s+\d+\.\d+\.", txt):
                # Keep captions clean and centered.
                ppr = ensure_ppr(p)
                jc = ppr.find(w("jc"))
                if jc is None:
                    jc = ET.SubElement(ppr, w("jc"))
                jc.set(w("val"), "center")
                bookmark = f"tbl_clean_{bid}"
                add_bookmark(p, bookmark, bid)
                entries.append(table_entry(txt, bookmark))
                bid += 1

        replace_table_list(body, entries)

        tree.write(doc_path, encoding="utf-8", xml_declaration=True)
        if OUT.exists():
            OUT.unlink()
        with ZipFile(OUT, "w", ZIP_DEFLATED) as zout:
            for path in tmp.rglob("*"):
                if path.is_file():
                    zout.write(path, path.relative_to(tmp).as_posix())

    print(f"OUT={OUT.resolve()}")
    print(f"table_entries={len(entries)}")


if __name__ == "__main__":
    main()
