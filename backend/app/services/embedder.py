import os
import logging
import chromadb
from typing import Any

from app.core.config import settings

logger = logging.getLogger(__name__)

# Ensure persistence directory exists
os.makedirs(settings.CHROMA_DATA_DIR, exist_ok=True)
client = chromadb.PersistentClient(path=settings.CHROMA_DATA_DIR)

def get_or_create_collection(document_id: str) -> chromadb.Collection:
    collection_name = f"{settings.CHROMA_COLLECTION_PREFIX}{document_id}"
    try:
        client.delete_collection(collection_name)
    except Exception:
        pass
    collection = client.create_collection(
        name=collection_name,
        metadata={"hnsw:space": "cosine"},
    )
    return collection

def embed_chunks(document_id: str, chunks: list[dict[str, Any]]) -> chromadb.Collection:
    collection = get_or_create_collection(document_id)
    if chunks:
        collection.add(
            ids=[c["id"] for c in chunks],
            documents=[c["text"] for c in chunks],
            metadatas=[c["metadata"] for c in chunks],
        )
    logger.info(f"Embedded {len(chunks)} chunks into ChromaDB collection for doc {document_id}")
    return collection

def retrieve_chunks(document_id: str, query: str, top_k: int) -> list[dict[str, Any]]:
    collection_name = f"{settings.CHROMA_COLLECTION_PREFIX}{document_id}"
    try:
        collection = client.get_collection(collection_name)
    except Exception as e:
        logger.warning(f"ChromaDB collection {collection_name} not found: {e}")
        return []

    count = collection.count()
    if count == 0:
        return []

    results = collection.query(query_texts=[query], n_results=min(top_k, count))

    retrieved = []
    if results and results.get("ids") and results["ids"][0]:
        for i in range(len(results["ids"][0])):
            retrieved.append(
                {
                    "id": results["ids"][0][i],
                    "text": results["documents"][0][i],
                    "distance": results["distances"][0][i] if results.get("distances") and results["distances"] else None,
                }
            )
    return retrieved
