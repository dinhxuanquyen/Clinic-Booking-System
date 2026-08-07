from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import tempfile
import xml.etree.ElementTree as ET

SRC = Path("22010342_Dinh_Xuan_Quyen_bao_cao_final_polished_lists_v2.docm")
OUT = Path("22010342_Dinh_Xuan_Quyen_bao_cao_final_polished_lists_v3.docm")

W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
ET.register_namespace("w", W)


def w(tag):
    return f"{{{W}}}{tag}"


def text_of(p):
    return "".join(t.text or "" for t in p.findall(".//" + w("t"))).strip()


def set_text(p, value):
    texts = p.findall(".//" + w("t"))
    if not texts:
        return
    texts[0].text = value
    for t in texts[1:]:
        t.text = ""


def main():
    mapping = {
        "Đặt vấn đề": "1.1. Đặt vấn đề",
        "Lý do chọn đề tài": "1.2. Lý do chọn đề tài",
        "Mục tiêu của đề tài": "1.3. Mục tiêu của đề tài",
        "Phạm vi nghiên cứu": "1.4. Phạm vi nghiên cứu",
        "Đối tượng nghiên cứu": "1.5. Đối tượng nghiên cứu",
        "Đối tượng sử dụng hệ thống": "1.6. Đối tượng sử dụng hệ thống",
        "Định hướng giải pháp": "1.7. Định hướng giải pháp",
        "Bố cục đồ án tốt nghiệp": "1.8. Bố cục đồ án tốt nghiệp",
    }
    with tempfile.TemporaryDirectory() as td:
        tmp = Path(td)
        with ZipFile(SRC) as zin:
            zin.extractall(tmp)
        doc_path = tmp / "word" / "document.xml"
        tree = ET.parse(doc_path)
        root = tree.getroot()
        in_ch1 = False
        changed = 0
        for p in root.findall(".//" + w("p")):
            txt = text_of(p)
            if txt == "CHƯƠNG 1: GIỚI THIỆU TỔNG QUAN ĐỀ TÀI":
                in_ch1 = True
                continue
            if txt.startswith("CHƯƠNG 2:"):
                in_ch1 = False
            if in_ch1 and txt in mapping:
                set_text(p, mapping[txt])
                changed += 1
        tree.write(doc_path, encoding="utf-8", xml_declaration=True)
        if OUT.exists():
            OUT.unlink()
        with ZipFile(OUT, "w", ZIP_DEFLATED) as zout:
            for path in tmp.rglob("*"):
                if path.is_file():
                    zout.write(path, path.relative_to(tmp).as_posix())
    print(f"OUT={OUT.resolve()}")
    print(f"changed={changed}")


if __name__ == "__main__":
    main()
