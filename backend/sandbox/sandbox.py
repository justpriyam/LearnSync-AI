"""
LearnSync AI — Phase 0 Sandbox Script

End-to-end proof of concept: PDF → chunk → embed (ChromaDB) → generate (Gemini + Groq) → structured quiz JSON.

Usage:
    python sandbox.py path/to/document.pdf
    python sandbox.py path/to/document.pdf --output results.json

No server, no UI — just validates generation quality before any infrastructure is built.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
import traceback
from pathlib import Path
from typing import Any

import chromadb
import pymupdf  # PyMuPDF (modern import, replaces deprecated 'fitz')
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pydantic import BaseModel, ValidationError

import config

# ─── Pydantic schemas (match Sheet 04 data model) ───────────────────────────


class QuizQuestion(BaseModel):
    question: str
    options: list[str]
    correct_answer: str
    explanation: str
    source_chunk_id: str


class Quiz(BaseModel):
    questions: list[QuizQuestion]


class CheatSheet(BaseModel):
    bullets: list[str]


class Module(BaseModel):
    title: str
    summary: str
    source_chunk_ids: list[str]
    quiz: Quiz
    cheatsheet: CheatSheet


class Course(BaseModel):
    course_title: str
    modules: list[Module]


# ─── Step 1: PDF Text Extraction ────────────────────────────────────────────


def extract_text_from_pdf(pdf_path: Path) -> str:
    """Extract text from a PDF using PyMuPDF. Raises on empty/malformed files."""
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF not found: {pdf_path}")

    if pdf_path.stat().st_size == 0:
        raise ValueError(f"PDF file is empty: {pdf_path}")

    size_mb = pdf_path.stat().st_size / (1024 * 1024)
    if size_mb > config.MAX_UPLOAD_SIZE_MB:
        raise ValueError(
            f"PDF is {size_mb:.1f} MB, exceeds {config.MAX_UPLOAD_SIZE_MB} MB limit"
        )

    doc = pymupdf.open(str(pdf_path))
    if doc.page_count == 0:
        doc.close()
        raise ValueError(f"PDF has no pages: {pdf_path}")

    text_parts: list[str] = []
    for page_num in range(doc.page_count):
        page = doc[page_num]
        page_text = page.get_text("text")
        if page_text.strip():
            text_parts.append(page_text)

    doc.close()

    full_text = "\n\n".join(text_parts)
    if not full_text.strip():
        raise ValueError(
            f"No extractable text in PDF (possibly scanned/image-only): {pdf_path}"
        )

    print(f"[✓] Extracted {len(full_text):,} characters from {doc.page_count} pages")
    return full_text


# ─── Step 2: Chunking ───────────────────────────────────────────────────────


def chunk_text(text: str) -> list[dict[str, Any]]:
    """Split text into overlapping chunks with IDs."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=config.CHUNK_SIZE,
        chunk_overlap=config.CHUNK_OVERLAP,
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

    print(f"[✓] Split into {len(chunks)} chunks (size={config.CHUNK_SIZE}, overlap={config.CHUNK_OVERLAP})")
    return chunks


# ─── Step 3: Embed into ChromaDB ────────────────────────────────────────────


def embed_chunks(chunks: list[dict[str, Any]]) -> chromadb.Collection:
    """Embed chunks into a local ChromaDB collection. Returns the collection."""
    client = chromadb.Client()  # Ephemeral in-memory client for sandbox

    # Delete collection if it exists from a previous run
    try:
        client.delete_collection(config.CHROMA_COLLECTION_NAME)
    except ValueError:
        pass

    collection = client.create_collection(
        name=config.CHROMA_COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )

    collection.add(
        ids=[c["id"] for c in chunks],
        documents=[c["text"] for c in chunks],
        metadatas=[c["metadata"] for c in chunks],
    )

    print(f"[✓] Embedded {len(chunks)} chunks into ChromaDB collection '{config.CHROMA_COLLECTION_NAME}'")
    return collection


# ─── Step 4: Retrieve relevant chunks for a topic ───────────────────────────


def retrieve_chunks(
    collection: chromadb.Collection, query: str, top_k: int | None = None
) -> list[dict[str, Any]]:
    """Retrieve the top-K most relevant chunks for a query string."""
    k = top_k or config.TOP_K_CHUNKS
    results = collection.query(query_texts=[query], n_results=min(k, collection.count()))

    retrieved = []
    for i in range(len(results["ids"][0])):
        retrieved.append(
            {
                "id": results["ids"][0][i],
                "text": results["documents"][0][i],
                "distance": results["distances"][0][i] if results["distances"] else None,
            }
        )
    return retrieved


# ─── Step 5a: Generate module outline via Gemini ─────────────────────────────


def _call_gemini(prompt: str) -> str:
    """Call Gemini API with retry logic. Returns raw text response."""
    import google.generativeai as genai

    if not config.GEMINI_API_KEY:
        raise RuntimeError(
            "GEMINI_API_KEY not set. Copy .env.example to .env and add your key."
        )

    genai.configure(api_key=config.GEMINI_API_KEY)
    model = genai.GenerativeModel(config.GEMINI_MODEL)

    for attempt in range(1, config.MAX_LLM_RETRIES + 1):
        try:
            response = model.generate_content(
                prompt,
                generation_config=genai.GenerationConfig(
                    max_output_tokens=config.GEMINI_MAX_OUTPUT_TOKENS,
                    temperature=0.3,
                ),
            )
            return response.text
        except Exception as e:
            print(f"  [!] Gemini attempt {attempt}/{config.MAX_LLM_RETRIES} failed: {e}")
            if attempt < config.MAX_LLM_RETRIES:
                time.sleep(config.LLM_RETRY_DELAY_SECONDS * attempt)
            else:
                raise RuntimeError(
                    f"Gemini failed after {config.MAX_LLM_RETRIES} attempts"
                ) from e
    # Unreachable, but satisfies type checker
    raise RuntimeError("Gemini call failed")


def generate_module_outline(chunks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Pass 1 (Gemini): Analyze all chunks and propose a module structure.
    Returns a list of module dicts with titles and assigned chunk IDs.
    """
    # Build a compact representation of all chunks for the context window
    chunk_summaries = "\n".join(
        f"[{c['id']}]: {c['text'][:200]}..." if len(c["text"]) > 200 else f"[{c['id']}]: {c['text']}"
        for c in chunks
    )

    prompt = f"""You are a course designer. Analyze the following document chunks and propose a structured module outline for a learning course.

IMPORTANT RULES:
- Base your outline ONLY on the content in the chunks below. Do not add topics not present in the source material.
- Each module should cover a coherent topic area from the document.
- Assign each chunk to exactly one module (use the chunk IDs provided).
- Create between 3 and 8 modules depending on the document's scope.

CHUNKS:
{chunk_summaries}

Respond with ONLY a valid JSON array (no markdown, no explanation) in this format:
[
  {{
    "title": "Module title",
    "summary": "1-2 sentence description of what this module covers",
    "chunk_ids": ["chunk_0000", "chunk_0001", ...]
  }},
  ...
]"""

    print("[⟳] Pass 1: Generating module outline via Gemini...")
    raw_response = _call_gemini(prompt)

    # Parse JSON from response (handle markdown code fences if present)
    json_str = raw_response.strip()
    if json_str.startswith("```"):
        # Strip markdown code fences
        lines = json_str.split("\n")
        json_str = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])

    try:
        modules = json.loads(json_str)
    except json.JSONDecodeError as e:
        print(f"  [!] Failed to parse Gemini response as JSON: {e}")
        print(f"  Raw response (first 500 chars): {raw_response[:500]}")
        raise RuntimeError("Gemini returned invalid JSON for module outline") from e

    if not isinstance(modules, list) or len(modules) == 0:
        raise RuntimeError(f"Expected a non-empty list of modules, got: {type(modules)}")

    print(f"[✓] Pass 1 complete: {len(modules)} modules proposed")
    for m in modules:
        print(f"    • {m['title']} ({len(m.get('chunk_ids', []))} chunks)")

    return modules


# ─── Step 5b: Generate quiz + cheatsheet per module via Groq ─────────────────


def _call_groq(prompt: str) -> str:
    """Call Groq API with retry logic. Returns raw text response."""
    from groq import Groq

    if not config.GROQ_API_KEY:
        raise RuntimeError(
            "GROQ_API_KEY not set. Copy .env.example to .env and add your key."
        )

    client = Groq(api_key=config.GROQ_API_KEY)

    for attempt in range(1, config.MAX_LLM_RETRIES + 1):
        try:
            chat_completion = client.chat.completions.create(
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are a quiz and study material generator. "
                            "You MUST respond with ONLY valid JSON — no markdown fences, no explanation, no extra text. "
                            "Generate content based STRICTLY on the provided source material. "
                            "Do NOT use any outside knowledge."
                        ),
                    },
                    {"role": "user", "content": prompt},
                ],
                model=config.GROQ_MODEL,
                max_tokens=config.GROQ_MAX_TOKENS,
                temperature=0.4,
            )
            return chat_completion.choices[0].message.content or ""
        except Exception as e:
            print(f"  [!] Groq attempt {attempt}/{config.MAX_LLM_RETRIES} failed: {e}")
            if attempt < config.MAX_LLM_RETRIES:
                time.sleep(config.LLM_RETRY_DELAY_SECONDS * attempt)
            else:
                raise RuntimeError(
                    f"Groq failed after {config.MAX_LLM_RETRIES} attempts"
                ) from e
    raise RuntimeError("Groq call failed")


def generate_quiz_and_cheatsheet(
    module_title: str,
    module_summary: str,
    chunks: list[dict[str, Any]],
) -> dict[str, Any]:
    """
    Pass 2 (Groq): Generate quiz questions and cheat sheet bullets for one module.
    Only the provided chunks are given as context — strict grounding.
    """
    chunk_context = "\n\n".join(
        f"[{c['id']}]:\n{c['text']}" for c in chunks
    )

    prompt = f"""Generate a quiz and cheat sheet for the following module.

MODULE: {module_title}
DESCRIPTION: {module_summary}

SOURCE MATERIAL (use ONLY this — do not add outside knowledge):
{chunk_context}

Generate exactly {config.QUESTIONS_PER_MODULE} multiple-choice questions and {config.CHEATSHEET_BULLETS_PER_MODULE} cheat sheet bullet points.

Respond with ONLY valid JSON in this exact format:
{{
  "quiz": {{
    "questions": [
      {{
        "question": "The question text",
        "options": ["A) option", "B) option", "C) option", "D) option"],
        "correct_answer": "A) option",
        "explanation": "Why this is correct, referencing the source material",
        "source_chunk_id": "chunk_XXXX"
      }}
    ]
  }},
  "cheatsheet": {{
    "bullets": [
      "Key fact or concept from the source material"
    ]
  }}
}}"""

    raw_response = _call_groq(prompt)

    # Parse JSON from response
    json_str = raw_response.strip()
    if json_str.startswith("```"):
        lines = json_str.split("\n")
        json_str = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])

    try:
        result = json.loads(json_str)
    except json.JSONDecodeError as e:
        print(f"  [!] Failed to parse Groq response for module '{module_title}': {e}")
        print(f"  Raw response (first 500 chars): {raw_response[:500]}")
        raise RuntimeError(f"Groq returned invalid JSON for module '{module_title}'") from e

    return result


# ─── Step 6: Assemble and validate ──────────────────────────────────────────


def assemble_course(
    pdf_name: str,
    module_outlines: list[dict[str, Any]],
    all_chunks: list[dict[str, Any]],
    collection: chromadb.Collection,
) -> Course:
    """
    For each module in the outline, retrieve relevant chunks and generate
    quiz + cheatsheet. Assemble into a validated Course object.
    """
    # Build a lookup for chunks by ID
    chunk_lookup = {c["id"]: c for c in all_chunks}

    modules: list[Module] = []
    for i, mod_outline in enumerate(module_outlines):
        title = mod_outline["title"]
        summary = mod_outline.get("summary", "")
        chunk_ids = mod_outline.get("chunk_ids", [])

        print(f"\n[⟳] Pass 2: Module {i + 1}/{len(module_outlines)}: \"{title}\"")

        # Gather chunks assigned by Gemini, falling back to retrieval if IDs are missing
        assigned_chunks = [chunk_lookup[cid] for cid in chunk_ids if cid in chunk_lookup]

        if not assigned_chunks:
            # Fallback: retrieve chunks by semantic similarity to the module title
            print(f"  [!] No valid chunk IDs from outline — falling back to retrieval")
            retrieved = retrieve_chunks(collection, f"{title} {summary}")
            assigned_chunks = retrieved

        # Generate quiz and cheatsheet via Groq
        gen_result = generate_quiz_and_cheatsheet(title, summary, assigned_chunks)

        # Build the Module object
        quiz_data = gen_result.get("quiz", {})
        cheatsheet_data = gen_result.get("cheatsheet", {})

        module = Module(
            title=title,
            summary=summary,
            source_chunk_ids=[c["id"] for c in assigned_chunks],
            quiz=Quiz(
                questions=[
                    QuizQuestion(
                        question=q.get("question", ""),
                        options=q.get("options", []),
                        correct_answer=q.get("correct_answer", ""),
                        explanation=q.get("explanation", ""),
                        source_chunk_id=q.get("source_chunk_id", assigned_chunks[0]["id"] if assigned_chunks else "unknown"),
                    )
                    for q in quiz_data.get("questions", [])
                ]
            ),
            cheatsheet=CheatSheet(
                bullets=cheatsheet_data.get("bullets", [])
            ),
        )
        modules.append(module)
        print(f"  [✓] Generated {len(module.quiz.questions)} questions, {len(module.cheatsheet.bullets)} cheatsheet bullets")

    course = Course(
        course_title=f"Course: {pdf_name}",
        modules=modules,
    )
    return course


# ─── Main ────────────────────────────────────────────────────────────────────


def main() -> None:
    parser = argparse.ArgumentParser(
        description="LearnSync AI Phase 0 - PDF to Quiz sandbox"
    )
    parser.add_argument("pdf_path", type=Path, help="Path to the PDF document")
    parser.add_argument(
        "--output", "-o", type=Path, default=None,
        help="Write JSON output to a file instead of stdout",
    )
    args = parser.parse_args()

    print("=" * 60)
    print("  LearnSync AI - Phase 0 Sandbox")
    print("=" * 60)
    print()

    start_time = time.time()

    try:
        # Step 1: Extract
        text = extract_text_from_pdf(args.pdf_path)

        # Step 2: Chunk
        chunks = chunk_text(text)

        # Step 3: Embed
        collection = embed_chunks(chunks)

        # Step 4-5: Generate (two-pass)
        module_outlines = generate_module_outline(chunks)
        course = assemble_course(
            pdf_name=args.pdf_path.stem,
            module_outlines=module_outlines,
            all_chunks=chunks,
            collection=collection,
        )

        # Step 6: Output
        elapsed = time.time() - start_time
        course_json = course.model_dump_json(indent=2)

        print()
        print("=" * 60)
        print(f"  Generation complete in {elapsed:.1f}s")
        print(f"  {len(course.modules)} modules, "
              f"{sum(len(m.quiz.questions) for m in course.modules)} questions total")
        print("=" * 60)

        if args.output:
            args.output.write_text(course_json, encoding="utf-8")
            print(f"\n[✓] Output written to {args.output}")
        else:
            print()
            print(course_json)

    except FileNotFoundError as e:
        print(f"\n[✗] File error: {e}", file=sys.stderr)
        sys.exit(1)
    except ValueError as e:
        print(f"\n[✗] Validation error: {e}", file=sys.stderr)
        sys.exit(1)
    except RuntimeError as e:
        print(f"\n[✗] Generation error: {e}", file=sys.stderr)
        sys.exit(1)
    except ValidationError as e:
        print(f"\n[✗] Schema validation failed — LLM output didn't match expected structure:", file=sys.stderr)
        print(e, file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"\n[✗] Unexpected error: {e}", file=sys.stderr)
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
