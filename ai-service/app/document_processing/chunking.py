from typing import List, Dict


def clean_text(text: str) -> str:
    """
    Basic text cleaning.

    Removes excessive whitespace while preserving
    meaningful paragraph separation.
    """

    if not text:
        return ""

    lines = [
        line.strip()
        for line in text.splitlines()
        if line.strip()
    ]

    return "\n".join(lines)


def chunk_text(
    text: str,
    chunk_size: int = 1000,
    chunk_overlap: int = 200,
) -> List[str]:
    """
    Split text into overlapping chunks.

    Args:
        text: Text to split.
        chunk_size: Maximum approximate character size.
        chunk_overlap: Number of overlapping characters.

    Returns:
        List of text chunks.
    """

    if not text:
        return []

    if chunk_size <= 0:
        raise ValueError(
            "chunk_size must be greater than 0."
        )

    if chunk_overlap < 0:
        raise ValueError(
            "chunk_overlap cannot be negative."
        )

    if chunk_overlap >= chunk_size:
        raise ValueError(
            "chunk_overlap must be smaller than chunk_size."
        )

    text = clean_text(text)

    chunks = []

    start = 0
    text_length = len(text)

    while start < text_length:

        end = start + chunk_size

        chunk = text[start:end].strip()

        if chunk:
            chunks.append(chunk)

        if end >= text_length:
            break

        start = end - chunk_overlap

    return chunks


def create_chunks_with_metadata(
    pages: List[Dict],
    chunk_size: int = 1000,
    chunk_overlap: int = 200,
) -> List[Dict]:
    """
    Create chunks while preserving page information.

    This metadata will later be stored with the
    embeddings in Qdrant.
    """

    results = []

    chunk_id = 1

    for page in pages:
        page_number = page.get("page_number")
        text = page.get("text", "")

        chunks = chunk_text(
            text,
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
        )

        from app.document_processing.pdf import is_valid_page_text

        for chunk in chunks:
            if is_valid_page_text(chunk):
                results.append(
                    {
                        "chunk_id": chunk_id,
                        "page_number": page_number,
                        "text": chunk,
                    }
                )
                chunk_id += 1

    return results