import zipfile
import xml.etree.ElementTree as ET
import os
import re
from pathlib import Path
from PIL import Image

def test_extract_docx_figures(docx_path, doc_id="test_doc"):
    extracted_images_dir = Path("backend/uploads/extracted_images") / doc_id
    extracted_images_dir.mkdir(parents=True, exist_ok=True)

    media_files = {}
    with zipfile.ZipFile(docx_path) as z:
        for item in z.namelist():
            if item.startswith("word/media/"):
                fname = os.path.basename(item)
                target_file = extracted_images_dir / fname
                with open(target_file, "wb") as mf:
                    mf.write(z.read(item))
                media_files[item] = str(target_file)
                media_files[fname] = str(target_file)

        rel_map = {}
        if "word/_rels/document.xml.rels" in z.namelist():
            rels_xml = z.read("word/_rels/document.xml.rels")
            rels_tree = ET.fromstring(rels_xml)
            for r in rels_tree:
                r_id = r.attrib.get("Id")
                r_target = r.attrib.get("Target", "")
                base_target = os.path.basename(r_target)
                if base_target in media_files:
                    rel_map[r_id] = media_files[base_target]

        doc_xml = z.read("word/document.xml")
        doc_tree = ET.fromstring(doc_xml)
        ns = {
            "w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
            "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
            "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
        }

        body = doc_tree.find("w:body", ns)
        if body is None:
            return []

        # Collect ordered paragraph elements and detect drawings
        doc_elements = [] # list of {"type": "p"|"tbl", "text": str, "images": list}
        current_section = "General"

        for child in body:
            tag = child.tag.split("}")[-1] if "}" in child.tag else child.tag
            if tag == "p":
                texts = [node.text for node in child.findall(".//w:t", ns) if node.text]
                p_txt = "".join(texts).strip()

                # Check if heading
                if re.match(r"^(?:(?:\d+[\.\s]+)*[A-Z][a-zA-Z0-9\s–-]{3,60}|Abstract|Introduction|Overview|Architecture|Requirements)$", p_txt):
                    current_section = p_txt

                # Find embedded images
                images = []
                blips = child.findall(".//a:blip", ns)
                for b in blips:
                    for k, v in b.attrib.items():
                        if "embed" in k or "id" in k:
                            if v in rel_map:
                                images.append((v, rel_map[v]))

                doc_elements.append({
                    "type": "p",
                    "text": p_txt,
                    "images": images,
                    "section": current_section,
                })
            elif tag == "tbl":
                doc_elements.append({"type": "tbl", "text": "", "images": [], "section": current_section})

        # Process detected images and correlate with captions
        figures = []
        fig_counter = 0

        for idx, el in enumerate(doc_elements):
            if not el["images"]:
                continue

            for embed_id, img_path in el["images"]:
                fig_counter += 1
                fig_num = None
                caption = None
                nearby_parts = []

                # Look for caption in:
                # 1. Next paragraph
                # 2. Current paragraph text
                # 3. Preceding paragraph
                candidate_texts = []
                if idx + 1 < len(doc_elements) and doc_elements[idx + 1]["text"]:
                    candidate_texts.append(("next", doc_elements[idx + 1]["text"]))
                if el["text"]:
                    candidate_texts.append(("current", el["text"]))
                if idx - 1 >= 0 and doc_elements[idx - 1]["text"]:
                    candidate_texts.append(("prev", doc_elements[idx - 1]["text"]))

                for pos, c_txt in candidate_texts:
                    m = re.search(r"\b(?:Figure|Fig\.?|Chart|Diagram)\s*([0-9]+[a-zA-Z]?(?:\.[0-9]+)*)", c_txt, re.IGNORECASE)
                    if m:
                        fig_num = m.group(1)
                        caption = c_txt
                        break

                if not fig_num:
                    fig_num = str(fig_counter)
                    caption = f"Figure {fig_num}"

                # Gather nearby context (preceding text + following text)
                for step in [-2, -1, 1, 2]:
                    n_idx = idx + step
                    if 0 <= n_idx < len(doc_elements) and doc_elements[n_idx]["text"]:
                        nearby_parts.append(doc_elements[n_idx]["text"])

                nearby_context = " ".join(nearby_parts)
                sec = el["section"]

                # Get image dimensions
                try:
                    with Image.open(img_path) as im:
                        w, h = im.size
                        fmt = im.format or "PNG"
                except Exception:
                    w, h, fmt = 0, 0, "PNG"

                fig_obj_id = f"Figure {fig_num}"
                fig_type = "diagram" if any(k in caption.lower() or k in nearby_context.lower() for k in ["diagram", "sequence", "architecture", "flow", "use-case"]) else "figure"

                figure_record = {
                    "pageNumber": 1,
                    "figureId": fig_obj_id,
                    "figureNumber": fig_num,
                    "objectId": fig_obj_id,
                    "caption": caption,
                    "figureType": fig_type,
                    "imagePath": img_path,
                    "imageFormat": fmt,
                    "width": w,
                    "height": h,
                    "nearbyContext": nearby_context,
                    "section": sec,
                    "sourceMethod": "docx_embedded_image",
                    "relationId": embed_id,
                }
                figures.append(figure_record)
                print(f"[EXTRACTED FIGURE] ID: {fig_obj_id} | Num: {fig_num} | Caption: '{caption}' | Size: {w}x{h} | Section: '{sec}' | Image: {os.path.basename(img_path)}")

        return figures

docx_file = r"C:\Users\PMLS\Desktop\DOCUMIND-AI\backend\uploads\users\6ac54de87499396ebcc21171\file-1791385130374-343492558.docx"
figs = test_extract_docx_figures(docx_file, "fr_auth_test")
print(f"\nTotal figures extracted: {len(figs)}")
