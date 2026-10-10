import zipfile
import os
import pytesseract
from PIL import Image

docx_path = r"C:\Users\PMLS\Desktop\DOCUMIND-AI\backend\uploads\users\6ac54de87499396ebcc21171\file-1791385130374-343492558.docx"
output_dir = r"C:\Users\PMLS\Desktop\DOCUMIND-AI\backend\uploads\docx_images_test"
os.makedirs(output_dir, exist_ok=True)

z = zipfile.ZipFile(docx_path)
for name in z.namelist():
    if "media/" in name:
        target_path = os.path.join(output_dir, os.path.basename(name))
        with open(target_path, "wb") as f:
            f.write(z.read(name))
        img = Image.open(target_path)
        print(f"Extracted {name} -> {target_path} (size={img.size}, mode={img.mode})")

        # Try OCR
        try:
            ocr_text = pytesseract.image_to_string(img)
            print(f"--- OCR FOR {os.path.basename(name)} (len={len(ocr_text)}) ---")
            print(ocr_text[:500])
        except Exception as ocr_err:
            print(f"OCR error for {name}: {ocr_err}")
