import os
import shutil
import importlib
from pathlib import Path
from typing import Optional, Dict

try:
    pytesseract = importlib.import_module("pytesseract")
    pil_img_mod = importlib.import_module("PIL.Image")
    Image = getattr(pil_img_mod, "Image", pil_img_mod)
    HAS_OCR_LIBS = True
except Exception:
    pytesseract = None
    Image = None
    HAS_OCR_LIBS = False


def find_tesseract_binary() -> Optional[str]:
    """
    Safely locate the Tesseract OCR executable on Windows or in PATH
    without hard-coding guessed paths.
    """
    # 1. Check if tesseract is on PATH
    which_path = shutil.which("tesseract")
    if which_path and os.path.isfile(which_path):
        return which_path

    # 2. Check standard Windows installation directories
    candidate_paths = [
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
        os.path.expanduser(r"~\AppData\Local\Programs\Tesseract-OCR\tesseract.exe"),
    ]

    tesseract_env = os.environ.get("TESSERACT_CMD")
    if tesseract_env and os.path.isfile(tesseract_env):
        return tesseract_env

    for path in candidate_paths:
        if os.path.isfile(path):
            return path

    return None


def get_ocr_status() -> Dict:
    """
    Sanitized OCR capability check.
    Returns:
        pytesseract_python: bool
        tesseract_binary: bool
        pdf_renderer: bool
        status: 'READY' | 'DEGRADED'
    """
    has_python = bool(HAS_OCR_LIBS and pytesseract is not None and Image is not None)
    bin_path = find_tesseract_binary()
    has_binary = bool(bin_path is not None)

    # Check if a PDF renderer (PyMuPDF or pdf2image) is available
    has_renderer = False
    try:
        importlib.import_module("fitz")
        has_renderer = True
    except Exception:
        try:
            importlib.import_module("pymupdf")
            has_renderer = True
        except Exception:
            try:
                importlib.import_module("pdf2image")
                has_renderer = True
            except Exception:
                has_renderer = False

    is_ready = has_python and has_binary and has_renderer
    status = "READY" if is_ready else "DEGRADED"

    return {
        "pytesseract_python": has_python,
        "tesseract_binary": has_binary,
        "pdf_renderer": has_renderer,
        "status": status,
    }


def is_ocr_available() -> bool:
    """Check whether full OCR capability is ready to process images/scanned PDFs."""
    stat = get_ocr_status()
    return stat["pytesseract_python"] and stat["tesseract_binary"]


def extract_text_from_image(file_path: str) -> str:
    """
    Extract text from an image using Tesseract OCR.
    """
    if not HAS_OCR_LIBS or pytesseract is None or Image is None:
        raise RuntimeError("OCR_UNAVAILABLE")

    t_bin = find_tesseract_binary()
    if not t_bin:
        raise RuntimeError("OCR_UNAVAILABLE")

    pytesseract.pytesseract.tesseract_cmd = t_bin

    path = Path(file_path)

    if not path.exists():
        raise FileNotFoundError(f"Image file not found: {file_path}")

    supported_extensions = {
        ".png",
        ".jpg",
        ".jpeg",
        ".tiff",
        ".bmp",
    }

    if path.suffix.lower() not in supported_extensions:
        raise ValueError("Unsupported image format.")

    image = Image.open(path)
    text = pytesseract.image_to_string(image)
    return text.strip()


def is_text_empty(text: str) -> bool:
    """Determine whether extracted text is empty."""
    return not text or not text.strip()
