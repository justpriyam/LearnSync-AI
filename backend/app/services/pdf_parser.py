import logging
from pathlib import Path
import pymupdf

from app.config import settings

logger = logging.getLogger(__name__)

def extract_text_from_pdf(pdf_path: Path) -> str:
    """Extract text from a PDF using PyMuPDF. Raises on empty/malformed files."""
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF not found: {pdf_path}")

    if pdf_path.stat().st_size == 0:
        raise ValueError(f"PDF file is empty: {pdf_path}")

    size_mb = pdf_path.stat().st_size / (1024 * 1024)
    if size_mb > settings.MAX_UPLOAD_SIZE_MB:
        raise ValueError(f"PDF is {size_mb:.1f} MB, exceeds {settings.MAX_UPLOAD_SIZE_MB} MB limit")

    with pymupdf.open(str(pdf_path)) as doc:
        page_count = doc.page_count
        if page_count == 0:
            raise ValueError(f"PDF has no pages: {pdf_path}")

        text_parts: list[str] = []
        for page_num in range(page_count):
            page = doc[page_num]
            page_text = page.get_text("text")
            if page_text.strip():
                text_parts.append(page_text)

    full_text = "\n\n".join(text_parts)
    if not full_text.strip():
        raise ValueError(f"No extractable text in PDF (possibly scanned/image-only): {pdf_path}")

    logger.info(f"Extracted {len(full_text):,} characters from {page_count} pages")
    return full_text
