from pathlib import Path
from typing import List, Dict

from docx import Document


def extract_docx_text(file_path: str) -> List[Dict]:
    """
    Extract paragraphs from a DOCX document.

    Returns:
        [
            {
                "paragraph_number": 1,
                "text": "..."
            },
            ...
        ]
    """

    path = Path(file_path)

    if not path.exists():
        raise FileNotFoundError(
            f"DOCX file not found: {file_path}"
        )

    if path.suffix.lower() != ".docx":
        raise ValueError(
            "The provided file is not a DOCX file."
        )

    document = Document(str(path))

    paragraphs = []

    for number, paragraph in enumerate(
        document.paragraphs,
        start=1
    ):
        text = paragraph.text.strip()

        if text:
            paragraphs.append(
                {
                    "paragraph_number": number,
                    "text": text,
                }
            )

    return paragraphs


def extract_docx_full_text(file_path: str) -> str:
    """
    Extract all DOCX paragraphs into one text string.
    """

    paragraphs = extract_docx_text(file_path)

    return "\n\n".join(
        paragraph["text"]
        for paragraph in paragraphs
    )