#!/usr/bin/env python3
"""
DOCUMIND-AI: High-Fidelity PDF Text Extraction & Section Detection Script
- Primary: PyMuPDF (fitz) page-by-page extraction with ToUnicode glyph resolution
- Fallback 1: pypdf
- Fallback 2: Tesseract OCR for scanned image pages
- Header/Footer removal & hyphenated line-wrap repair
- Section heading detection (Abstract, Intro, Methodology, Results, Conclusion, References)
- Output: Structured JSON containing pages, sections, quality scores, and full text
"""

import sys
import os
import re
import json
from pathlib import Path
import warnings

warnings.filterwarnings("ignore", category=UserWarning)

# Bytecode and xref regexes
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
    re.compile(r"\btrailer\b", re.IGNORECASE),
    re.compile(r"\bxref\b", re.IGNORECASE),
    re.compile(r"\b\d{10}\s+\d{5}\s+[nf]\b"),
    re.compile(r"\b00000\s+65535\s+f\b"),
]

# Section patterns
SECTION_PATTERNS = [
    ("Abstract", re.compile(r"^(?:(?:\d+[\.\s]+)?abstract)\b", re.IGNORECASE)),
    ("Introduction", re.compile(r"^(?:(?:\d+[\.\s]+)?(?:introduction|background))\b", re.IGNORECASE)),
    ("Motivation", re.compile(r"^(?:(?:\d+[\.\s]+)?(?:research\s+motivation|motivation))\b", re.IGNORECASE)),
    ("Problem Statement", re.compile(r"^(?:(?:\d+[\.\s]+)?(?:problem\s+statement|research\s+problem))\b", re.IGNORECASE)),
    ("Literature Review", re.compile(r"^(?:(?:\d+[\.\s]+)?(?:literature\s+review|related\s+work))\b", re.IGNORECASE)),
    ("Research Gap", re.compile(r"^(?:(?:\d+[\.\s]+)?(?:research\s+gap|limitations\s+of\s+prior\s+work))\b", re.IGNORECASE)),
    ("Objectives", re.compile(r"^(?:(?:\d+[\.\s]+)?(?:research\s+objectives?|objectives?|aims?))\b", re.IGNORECASE)),
    ("Methodology", re.compile(r"^(?:(?:\d+[\.\s]+)?(?:methodology|proposed\s+framework|proposed\s+approach|system\s+model))\b", re.IGNORECASE)),
    ("System Architecture", re.compile(r"^(?:(?:\d+[\.\s]+)?(?:system\s+architecture|architecture|framework))\b", re.IGNORECASE)),
    ("Algorithms", re.compile(r"^(?:(?:\d+[\.\s]+)?(?:algorithms?|pseudocode))\b", re.IGNORECASE)),
    ("Evaluation", re.compile(r"^(?:(?:\d+[\.\s]+)?(?:evaluation|experiments?|benchmarks?|results?))\b", re.IGNORECASE)),
    ("Expected Contributions", re.compile(r"^(?:(?:\d+[\.\s]+)?(?:expected\s+contributions?|contributions?))\b", re.IGNORECASE)),
    ("Roadmap & Timeline", re.compile(r"^(?:(?:\d+[\.\s]+)?(?:timeline|work\s+plan|implementation\s+plan|schedule))\b", re.IGNORECASE)),
    ("Conclusion", re.compile(r"^(?:(?:\d+[\.\s]+)?(?:conclusion|concluding\s+remarks|summary\s+and\s+future\s+work))\b", re.IGNORECASE)),
    ("References", re.compile(r"^(?:(?:\d+[\.\s]+)?(?:references|bibliography|works\s+cited))\b", re.IGNORECASE)),
]


def clean_line_breaks(text: str) -> str:
    """Repair broken line breaks and hyphenated line splits."""
    if not text:
        return ""
    # Remove hyphenated word splits: e.g. "Generat-\nion" -> "Generation"
    repaired = re.sub(r"(\w+)-\s*\n\s*(\w+)", r"\1\2", text)
    # Reconnect broken sentences across lines
    lines = []
    for line in repaired.splitlines():
        trimmed = line.strip()
        if not trimmed:
            continue
        # Strip common repeating running headers/footers
        if re.match(r"^MERA-VLA\s*—.*Page\s+\d+\s+of\s+\d+", trimmed, re.IGNORECASE):
            continue
        if re.match(r"^Page\s+\d+\s+of\s+\d+$", trimmed, re.IGNORECASE):
            continue
        lines.append(trimmed)

    # Join lines intelligently: if line does not end with sentence terminal or heading, join with space
    joined_paragraphs = []
    current_p = []

    for line in lines:
        if not current_p:
            current_p.append(line)
        else:
            prev = current_p[-1]
            # If prev line ends with punctuation or colon, start new line or paragraph
            if prev.endswith((".", ":", "!", "?", "•", "—")):
                joined_paragraphs.append(" ".join(current_p))
                current_p = [line]
            else:
                current_p.append(line)

    if current_p:
        joined_paragraphs.append(" ".join(current_p))

    return "\n\n".join(joined_paragraphs)


def assess_quality(text: str) -> tuple:
    """Returns (is_valid: bool, score: float, reason: str)."""
    if not text or len(text.strip()) < 15:
        return False, 0.0, "Empty or too short"

    # Check for PDF internal bytecode tokens
    for pat in INVALID_PDF_PATTERNS:
        if pat.search(text):
            return False, 0.0, f"Detected PDF internal artifact: {pat.pattern}"

    # Calculate alphanumeric ratio
    letters = sum(1 for c in text if c.isalnum() or c.isspace())
    ratio = letters / len(text) if len(text) > 0 else 0
    if ratio < 0.40:
        return False, round(ratio, 2), "Low alphanumeric ratio (binary or corrupted symbols)"

    # Check single-character token spam
    tokens = text.split()
    if len(tokens) >= 10:
        short_tokens = sum(1 for t in tokens if len(t) <= 2)
        if (short_tokens / len(tokens)) > 0.55:
            return False, 0.2, "Excessive single-character glyph noise"

    # Calculate score based on dictionary-like word density
    words = [t for t in tokens if len(t) >= 3 and t.isalpha()]
    word_density = len(words) / len(tokens) if tokens else 0
    score = round(min(1.0, max(0.0, word_density * 0.7 + ratio * 0.3)), 2)

    return True, score, "Clean readable text"


def detect_section(text: str, current_section: str) -> str:
    """Detect section heading in the first few lines of page text."""
    lines = text.splitlines()[:5]
    for line in lines:
        trimmed = line.strip()
        for sec_name, pat in SECTION_PATTERNS:
            if pat.search(trimmed):
                return sec_name
    return current_section


def extract_page_ocr(doc, page_num: int) -> str:
    """OCR a specific page using pytesseract if available."""
    try:
        import fitz
        import pytesseract
        from PIL import Image
        import io
        page = doc[page_num - 1]
        pix = page.get_pixmap(dpi=200)
        img = Image.open(io.BytesIO(pix.tobytes("png")))
        return pytesseract.image_to_string(img).strip()
    except Exception:
        return ""


def main():
    if len(sys.argv) < 2:
        sys.stderr.write("Usage: extract_pdf.py <pdf_path>\n")
        sys.exit(1)

    pdf_path = Path(sys.argv[1])
    if not pdf_path.exists():
        sys.stderr.write(f"File not found: {pdf_path}\n")
        sys.exit(1)

    pages = []
    current_section = "Introduction"

    try:
        import pymupdf as fitz
        doc = fitz.open(str(pdf_path))

        if doc.is_encrypted:
            print(json.dumps({"error": "PDF is password protected", "is_encrypted": True}))
            sys.exit(0)

        for i, page in enumerate(doc, start=1):
            raw_text = page.get_text("text") or ""
            is_valid, score, reason = assess_quality(raw_text)
            method = "native_pymupdf"

            # If native text is poor, attempt single-page OCR
            if not is_valid or len(raw_text.strip()) < 30:
                ocr_text = extract_page_ocr(doc, i)
                if ocr_text and len(ocr_text) > len(raw_text):
                    ocr_valid, ocr_score, _ = assess_quality(ocr_text)
                    if ocr_valid:
                        raw_text = ocr_text
                        score = ocr_score
                        method = "ocr"

            cleaned_text = clean_line_breaks(raw_text)
            current_section = detect_section(cleaned_text, current_section)

            pages.append({
                "page_number": i,
                "section": current_section,
                "is_reference": current_section == "References",
                "text": cleaned_text,
                "quality_score": score,
                "method": method,
            })

        doc.close()
    except Exception as err:
        sys.stderr.write(f"[PDF Extractor Error]: {err}\n")

    # If PyMuPDF returned no usable text, fallback to pypdf
    if not pages or sum(len(p["text"]) for p in pages) < 50:
        try:
            from pypdf import PdfReader
            reader = PdfReader(str(pdf_path))
            pages = []
            current_section = "Introduction"
            for i, page in enumerate(reader.pages, start=1):
                raw = page.extract_text() or ""
                cleaned = clean_line_breaks(raw)
                current_section = detect_section(cleaned, current_section)
                is_valid, score, _ = assess_quality(cleaned)
                pages.append({
                    "page_number": i,
                    "section": current_section,
                    "is_reference": current_section == "References",
                    "text": cleaned,
                    "quality_score": score,
                    "method": "pypdf",
                })
        except Exception as pErr:
            sys.stderr.write(f"[pypdf fallback error]: {pErr}\n")

    # Combine full text separated by form feed
    full_text = "\f".join(p["text"] for p in pages)

    # If called with --json, output full JSON; otherwise output form-feed separated text
    if "--json" in sys.argv:
        print(json.dumps({
            "total_pages": len(pages),
            "pages": pages,
            "full_text": full_text,
        }, ensure_ascii=False))
    else:
        sys.stdout.buffer.write(full_text.encode("utf-8", errors="replace"))

    sys.exit(0)


if __name__ == "__main__":
    main()
