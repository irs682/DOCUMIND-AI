import re
import importlib
from pathlib import Path
from typing import List, Dict

fitz = None
HAS_PYMUPDF = False
try:
    try:
        fitz = importlib.import_module("fitz")
        HAS_PYMUPDF = True
    except Exception:
        fitz = importlib.import_module("pymupdf")
        HAS_PYMUPDF = True
except Exception:
    fitz = None
    HAS_PYMUPDF = False

PdfReader = None
HAS_PYPDF = False
try:
    pypdf_mod = importlib.import_module("pypdf")
    PdfReader = getattr(pypdf_mod, "PdfReader", None)
    HAS_PYPDF = True
except Exception:
    PdfReader = None
    HAS_PYPDF = False

INVALID_PDF_PATTERNS = [
    re.compile(r"\bendstream\b", re.IGNORECASE),
    re.compile(r"\bendobj\b", re.IGNORECASE),
    re.compile(r"/CIDInit", re.IGNORECASE),
    re.compile(r"/ProcSet", re.IGNORECASE),
    re.compile(r"/Font\b", re.IGNORECASE),
    re.compile(r"/CMapName", re.IGNORECASE),
    re.compile(r"/Adobe-Identity-UCS", re.IGNORECASE),
    re.compile(r"/MediaBox", re.IGNORECASE),
    re.compile(r"/Contents\b", re.IGNORECASE),
    re.compile(r"/CMap", re.IGNORECASE),
    re.compile(r"/BaseFont", re.IGNORECASE),
    re.compile(r"/CIDFont", re.IGNORECASE),
    re.compile(r"/CIDSystemInfo", re.IGNORECASE),
    re.compile(r"/FlateDecode", re.IGNORECASE),
    re.compile(r"^%PDF-\d", re.IGNORECASE),
    re.compile(r"\bstartxref\b", re.IGNORECASE),
    re.compile(r"\btrailer\s*<<", re.IGNORECASE),
    re.compile(r"\bxref\s+\d+", re.IGNORECASE),
    re.compile(r"\b\d{10}\s+\d{5}\s+[nf]\b"),  # xref table entries like 0000463602 00000 n
]


def clean_page_text(text: str) -> str:
    """Clean extracted page text, removing replacement characters and normalizing whitespace."""
    if not text:
        return ""
    # Remove Unicode replacement characters and null bytes
    cleaned = text.replace("\ufffd", " ").replace("\x00", "")
    # Normalize excessive whitespaces per line while preserving line breaks
    lines = [re.sub(r"[ \t]+", " ", line).strip() for line in cleaned.splitlines()]
    return "\n".join(line for line in lines if line)


def is_valid_page_text(text: str) -> bool:
    """Validate that text does not contain raw PDF object bytecode or garbage."""
    if not text or len(text.strip()) < 10:
        return False
    # Check if page has PDF internal bytecode tokens or xref table lines
    bytecode_matches = sum(1 for p in INVALID_PDF_PATTERNS if p.search(text))
    if bytecode_matches >= 2:
        return False
    # Check for isolated xref table entries (e.g. 00000 n)
    if re.search(r"\b\d{10}\s+\d{5}\s+[nf]\b", text):
        return False
    # Check alphanumeric ratio
    letters = sum(1 for c in text if c.isalnum() or c.isspace())
    if len(text) > 0 and (letters / len(text)) < 0.40:
        return False
    # Check for garbled glyph token spam (e.g. "l f ^1 [ }k N U 2")
    tokens = text.split()
    if len(tokens) >= 10:
        short_tokens = sum(1 for t in tokens if len(t) <= 2)
        if (short_tokens / len(tokens)) > 0.55:
            return False
    return True


def extract_pdf_ocr(file_path: str) -> List[Dict]:
    """
    OCR fallback for scanned image PDFs.
    Uses PyMuPDF (fitz) pixmaps to render in-memory images (no Poppler required),
    falling back to pdf2image if needed.
    """
    pages = []
    try:
        from app.document_processing.ocr import find_tesseract_binary, get_ocr_status
        ocr_status = get_ocr_status()
        if not ocr_status["pytesseract_python"] or not ocr_status["tesseract_binary"]:
            print(f"[OCR] Cannot run OCR: pytesseract={ocr_status['pytesseract_python']}, tesseract_binary={ocr_status['tesseract_binary']}")
            return []

        import importlib
        import io
        pytesseract = importlib.import_module("pytesseract")
        pil_img_mod = importlib.import_module("PIL.Image")
        Image = getattr(pil_img_mod, "Image", pil_img_mod)

        t_bin = find_tesseract_binary()
        if t_bin:
            pytesseract.pytesseract.tesseract_cmd = t_bin

        # Method A: PyMuPDF pixmap rendering (highest quality, zero Poppler dependency)
        if HAS_PYMUPDF and fitz is not None:
            doc = fitz.open(file_path)
            for i, page in enumerate(doc, start=1):
                if i > 25:
                    break
                pix = page.get_pixmap(dpi=200)
                img = Image.open(io.BytesIO(pix.tobytes("png")))
                txt = clean_page_text(pytesseract.image_to_string(img).strip())
                pages.append({"page_number": i, "text": txt})
            doc.close()
            return pages

        # Method B: pdf2image rendering fallback
        try:
            pdf2image = importlib.import_module("pdf2image")
            convert_from_path = getattr(pdf2image, "convert_from_path", None)
            if convert_from_path:
                images = convert_from_path(file_path, first_page=1, last_page=25)
                for i, img in enumerate(images, start=1):
                    txt = clean_page_text(pytesseract.image_to_string(img).strip())
                    pages.append({"page_number": i, "text": txt})
                return pages
        except Exception as p2i_err:
            print(f"[OCR] pdf2image notice: {p2i_err}")

    except Exception as e:
        print(f"[OCR] Fallback warning: {e}")
    return pages


def extract_pdf_text(file_path: str) -> List[Dict]:
    """
    Extract readable text from every page of a PDF using PyMuPDF (fitz) primary,
    falling back to pypdf, and OCR fallback for scanned PDFs.
    Validates against PDF internals and preserves page numbers.
    If OCR is unavailable for a scanned PDF, signals OCR_UNAVAILABLE.
    """
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"PDF file not found: {file_path}")

    if path.suffix.lower() != ".pdf":
        raise ValueError("The provided file is not a PDF.")

    print(f"[PDF] file path: {file_path}")

    pages = []
    used_ocr = False

    # Strategy 1: PyMuPDF (fitz) - fastest, highest fidelity text extraction
    if HAS_PYMUPDF and fitz is not None:
        try:
            doc = fitz.open(str(path))
            print(f"[PDF] Opened with PyMuPDF. Page count: {len(doc)}")
            for page_number, page in enumerate(doc, start=1):
                raw_text = page.get_text("text") or ""
                cleaned = clean_page_text(raw_text)
                if is_valid_page_text(cleaned):
                    pages.append({"page_number": page_number, "text": cleaned})
                else:
                    pages.append({"page_number": page_number, "text": ""})
            doc.close()
        except Exception as e:
            print(f"[PDF] PyMuPDF extraction warning: {e}")
            pages = []

    # Strategy 2: pypdf fallback
    if not pages or sum(len(p["text"]) for p in pages) < 50:
        if HAS_PYPDF and PdfReader is not None:
            try:
                reader = PdfReader(str(path))
                print(f"[PDF] Fallback to pypdf. Page count: {len(reader.pages)}")
                pages = []
                for page_number, page in enumerate(reader.pages, start=1):
                    raw_text = page.extract_text() or ""
                    cleaned = clean_page_text(raw_text)
                    if is_valid_page_text(cleaned):
                        pages.append({"page_number": page_number, "text": cleaned})
                    else:
                        pages.append({"page_number": page_number, "text": ""})
            except Exception as e:
                print(f"[PDF] pypdf extraction warning: {e}")

    total_chars = sum(len(p["text"]) for p in pages)

    # Strategy 3: Automatic OCR fallback if normal extraction returned empty/unusable text
    if total_chars < 50:
        print("[OCR] used: true (scanned/image PDF detected)")
        from app.document_processing.ocr import is_ocr_available
        if not is_ocr_available():
            print("[OCR] OCR_UNAVAILABLE: Scanned PDF detected, but OCR engine is unavailable.")
            return [{"page_number": 1, "text": "", "error": "OCR_UNAVAILABLE"}]

        used_ocr = True
        ocr_pages = extract_pdf_ocr(str(path))
        if ocr_pages and sum(len(p["text"]) for p in ocr_pages) > total_chars:
            pages = ocr_pages
            total_chars = sum(len(p["text"]) for p in pages)
        elif not ocr_pages or total_chars == 0:
            return [{"page_number": 1, "text": "", "error": "OCR_UNAVAILABLE"}]
    else:
        print("[OCR] used: false")

    print(f"[PDF] pages extracted: {len(pages)}")
    print(f"[PDF] readable characters: {total_chars}")

    return pages


def extract_pdf_full_text(file_path: str) -> str:
    """Extract all PDF pages into a form-feed-separated text string."""
    pages = extract_pdf_text(file_path)
    valid_texts = [p["text"] for p in pages if p.get("text")]
    if not valid_texts and any(p.get("error") == "OCR_UNAVAILABLE" for p in pages):
        return "OCR_UNAVAILABLE"
    return "\f".join(valid_texts)

