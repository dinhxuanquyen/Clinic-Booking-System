from pathlib import Path
from zipfile import ZipFile
import re
import xml.etree.ElementTree as ET

DOC = Path("22010342_Dinh_Xuan_Quyen_danh_so_trang_danh_muc.docm")
NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}

with ZipFile(DOC) as z:
    root = ET.fromstring(z.read("word/document.xml"))

paras = []
for p in root.findall(".//w:p", NS):
    txt = "".join(t.text or "" for t in p.findall(".//w:t", NS)).strip()
    if txt:
        paras.append(txt)

fig_re = re.compile(r"^Hình\s+\d+(?:\.[\da-zA-Z]+)+\.?\s+.+")
tab_re = re.compile(r"^Bảng\s+\d+(?:\.[\da-zA-Z]+)+\.?\s*.+")

figs = [(i + 1, t) for i, t in enumerate(paras) if fig_re.match(t)]
tabs = [(i + 1, t) for i, t in enumerate(paras) if tab_re.match(t)]

print("paragraphs", len(paras))
print("figs", len(figs))
for item in figs[:80]:
    print(item)
print("tables", len(tabs))
for item in tabs[:120]:
    print(item)

print("headings/styles")
targets = {
    "TÓM TẮT ĐỒ ÁN TỐT NGHIỆP",
    "LỜI CAM ĐOAN",
    "LỜI CẢM ƠN",
    "MỤC LỤC",
    "DANH MỤC HÌNH ẢNH",
    "DANH MỤC BẢNG BIỂU",
    "DANH MỤC TỪ VIẾT TẮT",
    "DANH MỤC THUẬT NGỮ",
    "MỞ ĐẦU",
}
for idx, p in enumerate(root.findall(".//w:p", NS), 1):
    txt = "".join(t.text or "" for t in p.findall(".//w:t", NS)).strip()
    if txt in targets or txt.startswith("CHƯƠNG"):
        pstyle = p.find("./w:pPr/w:pStyle", NS)
        style = pstyle.attrib.get(f"{{{NS['w']}}}val") if pstyle is not None else ""
        print(idx, txt, "style=", style)
