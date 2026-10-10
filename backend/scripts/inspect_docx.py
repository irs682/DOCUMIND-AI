import zipfile
import xml.etree.ElementTree as ET
import os

docx_path = r"C:\Users\PMLS\Desktop\DOCUMIND-AI\backend\uploads\users\6ac54de87499396ebcc21171\file-1791385130374-343492558.docx"
z = zipfile.ZipFile(docx_path)

rels_xml = z.read("word/_rels/document.xml.rels")
rels_tree = ET.fromstring(rels_xml)
rel_map = {r.attrib.get("Id"): r.attrib.get("Target") for r in rels_tree}
print("REL MAP:")
for k, v in rel_map.items():
    if "media" in v:
        print(f"  {k} -> {v}")

doc_xml = z.read("word/document.xml")
doc_tree = ET.fromstring(doc_xml)
ns = {
    "w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "wp": "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing",
    "pic": "http://schemas.openxmlformats.org/drawingml/2006/picture"
}

body = doc_tree.find("w:body", ns)
children = list(body)
print(f"Total top-level body elements: {len(children)}")

for idx, child in enumerate(children):
    tag = child.tag.split("}")[-1]
    if tag == "p":
        txt = "".join([t.text for t in child.findall(".//w:t", ns) if t.text]).strip()
        blips = child.findall(".//a:blip", ns)
        drawings = child.findall(".//w:drawing", ns)
        if blips or drawings or "figure" in txt.lower():
            embed_ids = []
            for b in blips:
                for k, v in b.attrib.items():
                    if "embed" in k:
                        embed_ids.append(v)
            print(f"[{idx}] p text='{txt[:80]}' | drawings={len(drawings)} | embeds={embed_ids}")
            # check neighbor text
            if idx > 0:
                prev_tag = children[idx-1].tag.split("}")[-1]
                if prev_tag == "p":
                    prev_txt = "".join([t.text for t in children[idx-1].findall(".//w:t", ns) if t.text]).strip()
                    print(f"    prev_p: '{prev_txt[:60]}'")
            if idx + 1 < len(children):
                next_tag = children[idx+1].tag.split("}")[-1]
                if next_tag == "p":
                    next_txt = "".join([t.text for t in children[idx+1].findall(".//w:t", ns) if t.text]).strip()
                    print(f"    next_p: '{next_txt[:60]}'")
