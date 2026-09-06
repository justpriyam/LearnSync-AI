import logging
import json
import time
from typing import Any

from app.config import settings

logger = logging.getLogger(__name__)

def call_gemini(prompt: str) -> str:
    """Call Gemini API with retry logic."""
    import google.generativeai as genai

    if not settings.GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY not set.")

    genai.configure(api_key=settings.GEMINI_API_KEY)
    model = genai.GenerativeModel(settings.GEMINI_MODEL)

    for attempt in range(1, settings.MAX_LLM_RETRIES + 1):
        try:
            response = model.generate_content(
                prompt,
                generation_config=genai.GenerationConfig(
                    max_output_tokens=settings.GEMINI_MAX_OUTPUT_TOKENS,
                    temperature=0.3,
                ),
            )
            return response.text
        except Exception as e:
            logger.warning(f"Gemini attempt {attempt}/{settings.MAX_LLM_RETRIES} failed: {e}")
            if attempt < settings.MAX_LLM_RETRIES:
                time.sleep(settings.LLM_RETRY_DELAY_SECONDS * attempt)
            else:
                raise RuntimeError(f"Gemini failed after {settings.MAX_LLM_RETRIES} attempts") from e
    raise RuntimeError("Gemini call failed")

def call_groq(
    prompt: str,
    model: str | None = None,
    max_tokens: int | None = None,
    json_mode: bool = False,
    system_prompt: str | None = None,
) -> str:
    """Call Groq API with retry logic. Returns raw text response."""
    from groq import Groq

    if not settings.GROQ_API_KEY:
        raise RuntimeError("GROQ_API_KEY not set.")

    client = Groq(api_key=settings.GROQ_API_KEY)
    
    use_model = model or settings.GROQ_MODEL
    use_max_tokens = max_tokens or settings.GROQ_MAX_TOKENS
    use_system = system_prompt or (
        "You are a quiz and study material generator. "
        "You MUST respond with ONLY valid JSON — no markdown fences, no explanation, no extra text. "
        "Generate content based STRICTLY on the provided source material. "
        "Do NOT use any outside knowledge."
    )

    for attempt in range(1, settings.MAX_LLM_RETRIES + 1):
        try:
            create_kwargs: dict[str, Any] = {
                "messages": [
                    {"role": "system", "content": use_system},
                    {"role": "user", "content": prompt},
                ],
                "model": use_model,
                "max_tokens": use_max_tokens,
                "temperature": 0.4,
            }
            if json_mode:
                create_kwargs["response_format"] = {"type": "json_object"}
            
            chat_completion = client.chat.completions.create(**create_kwargs)
            return chat_completion.choices[0].message.content or ""
        except Exception as e:
            logger.warning(f"Groq attempt {attempt}/{settings.MAX_LLM_RETRIES} failed: {e}")
            if attempt < settings.MAX_LLM_RETRIES:
                time.sleep(settings.LLM_RETRY_DELAY_SECONDS * attempt)
            else:
                raise RuntimeError(f"Groq failed after {settings.MAX_LLM_RETRIES} attempts") from e
    raise RuntimeError("Groq call failed")

def generate_module_outline(chunks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Pass 1 (Gemini): Analyze all chunks and propose a module structure."""
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
    "chunk_ids": ["chunk_0000", "chunk_0001"]
  }}
]"""

    logger.info("Pass 1: Generating module outline via Gemini...")
    raw_response = call_gemini(prompt)

    json_str = raw_response.strip()
    if json_str.startswith("```"):
        lines = json_str.split("\n")
        json_str = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])

    try:
        modules = json.loads(json_str)
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Gemini response as JSON: {e}")
        raise RuntimeError("Gemini returned invalid JSON for module outline") from e

    if not isinstance(modules, list) or len(modules) == 0:
        raise RuntimeError(f"Expected a non-empty list of modules, got: {type(modules)}")

    logger.info(f"Pass 1 complete: {len(modules)} modules proposed")
    return modules

def generate_quiz_and_cheatsheet(
    module_title: str,
    module_summary: str,
    chunks: list[dict[str, Any]],
) -> dict[str, Any]:
    """Pass 2 (Groq): Generate quiz questions and cheat sheet bullets for one module."""
    chunk_context = "\n\n".join(f"[{c['id']}]:\n{c['text']}" for c in chunks)

    prompt = f"""Generate a quiz and cheat sheet for the following module.

MODULE: {module_title}
DESCRIPTION: {module_summary}

SOURCE MATERIAL (use ONLY this — do not add outside knowledge):
{chunk_context}

Generate exactly {settings.QUESTIONS_PER_MODULE} multiple-choice questions and {settings.CHEATSHEET_BULLETS_PER_MODULE} cheat sheet bullet points.

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

    raw_response = call_groq(prompt)

    json_str = raw_response.strip()
    if json_str.startswith("```"):
        lines = json_str.split("\n")
        json_str = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])

    try:
        result = json.loads(json_str)
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Groq response for module '{module_title}': {e}")
        raise RuntimeError(f"Groq returned invalid JSON for module '{module_title}'") from e

    return result
