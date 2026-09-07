import logging
import json
import time
from typing import Any

from app.config import settings

logger = logging.getLogger(__name__)

def call_gemini(prompt: str, json_mode: bool = False) -> str:
    """Call Gemini API with retry logic."""
    import google.generativeai as genai

    if not settings.GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY not set.")

    genai.configure(api_key=settings.GEMINI_API_KEY)
    model = genai.GenerativeModel(settings.GEMINI_MODEL)

    config_kwargs: dict[str, Any] = {
        "max_output_tokens": settings.GEMINI_MAX_OUTPUT_TOKENS,
        "temperature": 0.3,
    }
    if json_mode:
        config_kwargs["response_mime_type"] = "application/json"

    for attempt in range(1, settings.MAX_LLM_RETRIES + 1):
        try:
            response = model.generate_content(
                prompt,
                generation_config=genai.GenerationConfig(**config_kwargs),
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
            if "rate_limit" in str(e).lower() or "429" in str(e):
                raise
            if attempt < settings.MAX_LLM_RETRIES:
                time.sleep(settings.LLM_RETRY_DELAY_SECONDS * attempt)
            else:
                raise RuntimeError(f"Groq failed after {settings.MAX_LLM_RETRIES} attempts") from e
    raise RuntimeError("Groq call failed")

def generate_module_outline(chunks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Pass 1 (Gemini with Groq fallback): Analyze all chunks and propose a module structure."""
    chunk_summaries = "\n".join(
        f"[{c['id']}]: {c['text'][:200]}..." if len(c["text"]) > 200 else f"[{c['id']}]: {c['text']}"
        for c in chunks
    )

    prompt = f"""You are a course designer. Analyze the following document chunks and propose a structured module outline for a learning course.

IMPORTANT RULES:
- Base your outline ONLY on the content in the chunks below. Do not add topics not present in the source material.
- Each module should cover a coherent topic area from the document.
- Assign 2 to 5 representative chunk IDs to each module.
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
    for attempt in range(1, settings.MAX_LLM_RETRIES + 1):
        try:
            raw_response = call_gemini(prompt, json_mode=True)
            json_str = raw_response.strip()
            if json_str.startswith("```"):
                lines = json_str.split("\n")
                json_str = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
            else:
                start_idx = json_str.find("[")
                end_idx = json_str.rfind("]")
                if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
                    json_str = json_str[start_idx : end_idx + 1]

            modules = json.loads(json_str)
            if isinstance(modules, list) and len(modules) > 0:
                logger.info(f"Pass 1 complete: {len(modules)} modules proposed via Gemini")
                return modules
        except Exception as e:
            logger.warning(f"Pass 1 Gemini attempt {attempt}/{settings.MAX_LLM_RETRIES} failed: {e}")
            if attempt < settings.MAX_LLM_RETRIES:
                time.sleep(settings.LLM_RETRY_DELAY_SECONDS * attempt)

    # Fallback to Groq if Gemini fails or returns truncated JSON
    logger.info("Pass 1: Falling back to Groq for module outline...")
    for attempt in range(1, settings.MAX_LLM_RETRIES + 1):
        try:
            raw_response = call_groq(prompt, json_mode=True)
            json_str = raw_response.strip()
            if json_str.startswith("```"):
                lines = json_str.split("\n")
                json_str = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
            else:
                start_idx = json_str.find("[")
                end_idx = json_str.rfind("]")
                if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
                    json_str = json_str[start_idx : end_idx + 1]

            modules = json.loads(json_str)
            if isinstance(modules, list) and len(modules) > 0:
                logger.info(f"Pass 1 complete: {len(modules)} modules proposed via Groq fallback")
                return modules
        except Exception as e:
            logger.warning(f"Pass 1 Groq fallback attempt {attempt}/{settings.MAX_LLM_RETRIES} failed: {e}")
            if attempt < settings.MAX_LLM_RETRIES:
                time.sleep(settings.LLM_RETRY_DELAY_SECONDS * attempt)

    raise RuntimeError("Failed to generate valid module outline with both Gemini and Groq")

def generate_quiz_and_cheatsheet(
    module_title: str,
    module_summary: str,
    chunks: list[dict[str, Any]],
) -> dict[str, Any]:
    """Pass 2 (Groq with Gemini fallback): Generate quiz questions and cheat sheet bullets for one module."""
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

    for attempt in range(1, settings.MAX_LLM_RETRIES + 1):
        try:
            raw_response = call_groq(prompt, json_mode=True)
            json_str = raw_response.strip()
            if json_str.startswith("```"):
                lines = json_str.split("\n")
                json_str = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
            else:
                start_idx = json_str.find("{")
                end_idx = json_str.rfind("}")
                if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
                    json_str = json_str[start_idx : end_idx + 1]

            result = json.loads(json_str)
            if isinstance(result, dict) and "quiz" in result:
                return result
        except Exception as e:
            logger.warning(f"Pass 2 Groq attempt {attempt}/{settings.MAX_LLM_RETRIES} failed for '{module_title}': {e}")
            if attempt < settings.MAX_LLM_RETRIES:
                time.sleep(settings.LLM_RETRY_DELAY_SECONDS * attempt)

    # Fallback to Gemini if Groq fails
    logger.info(f"Pass 2: Falling back to Gemini for module '{module_title}'...")
    for attempt in range(1, settings.MAX_LLM_RETRIES + 1):
        try:
            raw_response = call_gemini(prompt, json_mode=True)
            json_str = raw_response.strip()
            if json_str.startswith("```"):
                lines = json_str.split("\n")
                json_str = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
            else:
                start_idx = json_str.find("{")
                end_idx = json_str.rfind("}")
                if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
                    json_str = json_str[start_idx : end_idx + 1]

            result = json.loads(json_str)
            if isinstance(result, dict) and "quiz" in result:
                return result
        except Exception as e:
            logger.warning(f"Pass 2 Gemini fallback attempt {attempt}/{settings.MAX_LLM_RETRIES} failed: {e}")
            if attempt < settings.MAX_LLM_RETRIES:
                time.sleep(settings.LLM_RETRY_DELAY_SECONDS * attempt)

    raise RuntimeError(f"Failed to generate quiz and cheatsheet for module '{module_title}' with both Groq and Gemini")
