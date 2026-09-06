import logging
from typing import Any
from langchain_text_splitters import RecursiveCharacterTextSplitter

logger = logging.getLogger(__name__)

def chunk_text(text: str, chunk_size: int, chunk_overlap: int) -> list[dict[str, Any]]:
    """Split text into overlapping chunks with IDs."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=len,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    raw_chunks = splitter.split_text(text)

    chunks = []
    for i, chunk_text_content in enumerate(raw_chunks):
        chunks.append(
            {
                "id": f"chunk_{i:04d}",
                "text": chunk_text_content,
                "metadata": {"chunk_index": i, "char_start": text.find(chunk_text_content)},
            }
        )

    logger.info(f"Split into {len(chunks)} chunks (size={chunk_size}, overlap={chunk_overlap})")
    return chunks
