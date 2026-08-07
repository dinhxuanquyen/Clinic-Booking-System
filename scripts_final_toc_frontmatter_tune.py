from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import tempfile
import xml.etree.ElementTree as ET

SRC = Path("22010342_Dinh_Xuan_Quyen_bao_cao_final_polished_lists.docm")
OUT = Path("22010342_Dinh_Xuan_Quyen_bao_cao_final_polished_lists_v2.docm")

W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"

ET.register_namespace("w", W)


def w(tag):
    return f"{{{W}}}{tag}"


def text_of(el):
    return "".join(t.text or "" for t in el.findall(".//" + w("t"))).strip()


def set_text(p, value):
    texts = p.findall(".//" + w("t"))
    if not texts:
        return
    texts[0].text = value
    for t in texts[1:]:
        t.text = ""


def ensure_ppr(p):
    ppr = p.find(w("pPr"))
    if ppr is None:
        ppr = ET.Element(w("pPr"))
        p.insert(0, ppr)
    return ppr


def remove_page_break_before(p):
    ppr = ensure_ppr(p)
    pbb = ppr.find(w("pageBreakBefore"))
    if pbb is not None:
        ppr.remove(pbb)


def compact_table(tbl):
    for p in tbl.findall(".//" + w("p")):
        ppr = ensure_ppr(p)
        spacing = ppr.find(w("spacing"))
        if spacing is None:
            spacing = ET.SubElement(ppr, w("spacing"))
        spacing.set(w("before"), "0")
        spacing.set(w("after"), "20")
        for r in p.findall(w("r")):
            rpr = r.find(w("rPr"))
            if rpr is None:
                rpr = ET.Element(w("rPr"))
                r.insert(0, rpr)
            for tag in ("sz", "szCs"):
                sz = rpr.find(w(tag))
                if sz is None:
                    sz = ET.SubElement(rpr, w(tag))
                sz.set(w("val"), "22")


def patch_toc_tabs(tmp):
    styles = tmp / "word" / "styles.xml"
    if not styles.exists():
        return
    tree = ET.parse(styles)
    root = tree.getroot()
    for style_id, pos in [("TOC1", "9000"), ("TOC2", "9000"), ("TOC3", "9000")]:
        st = root.find(f".//{w('style')}[@{w('styleId')}='{style_id}']")
        if st is None:
            continue
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
        tab.set(w("pos"), pos)
    tree.write(styles, encoding="utf-8", xml_declaration=True)


def main():
    with tempfile.TemporaryDirectory() as td:
        tmp = Path(td)
        with ZipFile(SRC) as zin:
            zin.extractall(tmp)

        doc_path = tmp / "word" / "document.xml"
        tree = ET.parse(doc_path)
        root = tree.getroot()
        body = root.find(w("body"))

        long = "CHƯƠNG 4: THIẾT KẾ, PHÁT TRIỂN VÀ TRIỂN KHAI HỆ THỐNG"
        short = "CHƯƠNG 4: THIẾT KẾ VÀ TRIỂN KHAI HỆ THỐNG"
        for p in root.findall(".//" + w("p")):
            if text_of(p) == long:
                set_text(p, short)

        children = list(body)
        for i, child in enumerate(children):
            txt = text_of(child)
            if txt in {"DANH MỤC TỪ VIẾT TẮT", "DANH MỤC THUẬT NGỮ"}:
                # Keep these as separate front-matter sections, but make the table start right after the heading.
                for j in range(i + 1, min(i + 5, len(children))):
                    if children[j].tag == w("p") and not text_of(children[j]):
                        body.remove(children[j])
                    elif children[j].tag == w("tbl"):
                        remove_page_break_before(child)
                        compact_table(children[j])
                        break

        patch_toc_tabs(tmp)
        tree.write(doc_path, encoding="utf-8", xml_declaration=True)

        if OUT.exists():
            OUT.unlink()
        with ZipFile(OUT, "w", ZIP_DEFLATED) as zout:
            for path in tmp.rglob("*"):
                if path.is_file():
                    zout.write(path, path.relative_to(tmp).as_posix())
    print(f"OUT={OUT.resolve()}")


if __name__ == "__main__":
    main()
