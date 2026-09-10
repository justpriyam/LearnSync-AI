import logging
import json
import time
from typing import Any

from app.config import settings

logger = logging.getLogger(__name__)

COURSE_GENERATION_SYSTEM_PROMPT = (
    "You are a strict course-generation assistant. Return only valid JSON. "
    "Every generated course must contain at least 5 modules, and every module "
    "must contain exactly 5 multiple-choice questions. Use only the supplied source material."
)

def _parse_module_outline(raw_response: str) -> list[dict[str, Any]]:
    """Parse outline JSON from either provider's object or array response."""
    json_str = raw_response.strip()
    if json_str.startswith("```"):
        lines = json_str.split("\n")
        json_str = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])

    payload = json.loads(json_str)
    modules = payload.get("modules") if isinstance(payload, dict) else payload
    if not isinstance(modules, list):
        raise ValueError("Module outline must contain a modules array")

    valid_modules = [
        module for module in modules
        if isinstance(module, dict) and module.get("title") and module.get("summary")
    ]
    if not valid_modules:
        raise ValueError("Module outline contains no valid modules")
    return valid_modules

def _build_local_module_outline(chunks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Build a usable outline from source chunks when both LLMs are unavailable."""
    if not chunks:
        raise ValueError("The document contains no extractable chunks")

    module_count = min(8, max(5, len(chunks)))
    groups = [[] for _ in range(module_count)]
    for index, chunk in enumerate(chunks):
        groups[index % module_count].append(chunk)

    modules = []
    for index, group in enumerate(groups):
        if not group:
            continue
        first_text = " ".join(group[0]["text"].split())
        title = first_text[:70].rstrip(" .,;:") or f"Module {index + 1}"
        summary = " ".join(" ".join(chunk["text"].split()) for chunk in group)[:300]
        modules.append({
            "title": f"{index + 1}. {title}",
            "summary": summary,
            "chunk_ids": [chunk["id"] for chunk in group],
        })
    return modules

def _build_local_module_content(title: str, summary: str, chunks: list[dict[str, Any]]) -> dict[str, Any]:
    """Create source-grounded lesson material without an external provider."""
    source = " ".join(" ".join(chunk["text"].split()) for chunk in chunks)
    source = source[:5000]
    source_id = chunks[0]["id"] if chunks else "unknown"
    questions = [
        {
            "question": f"Which statement is directly supported by the lesson on {title}?",
            "options": [summary[:160] or "The source explains this topic.", "The source gives no information.", "This topic is unrelated.", "None of the source material applies."],
            "correct_answer": summary[:160] or "The source explains this topic.",
            "explanation": f"This answer is based on source chunk {source_id}.",
            "source_chunk_id": source_id,
        }
        for _ in range(settings.QUESTIONS_PER_MODULE)
    ]
    return {
        "lesson_content": f"# {title}\n\n{source}\n\n## Summary\n\n{summary}",
        "youtube_search_queries": [],
        "quiz": {"questions": questions},
        "cheatsheet": {"bullets": [summary] if summary else [source[:200]]},
    }

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
    provider_errors: list[str] = []
    chunk_summaries = "\n".join(
        f"[{c['id']}]: {c['text'][:200]}..." if len(c["text"]) > 200 else f"[{c['id']}]: {c['text']}"
        for c in chunks
    )

    prompt = f"""You are a course designer. Analyze the following document chunks and propose a structured module outline for a learning course.

IMPORTANT RULES:
- Base your outline ONLY on the content in the chunks below. Do not add topics not present in the source material.
- Each module should cover a coherent topic area from the document.
- Assign 2 to 5 representative chunk IDs to each module.
- Create at least 5 modules. If the source is narrow, split it into distinct subtopics without inventing facts.

CHUNKS:
{chunk_summaries}

Respond with ONLY a valid JSON object (no markdown, no explanation) in this format:
{{
    "modules": [
        {{
            "title": "Module title",
            "summary": "1-2 sentence description of what this module covers",
            "chunk_ids": ["chunk_0000", "chunk_0001"]
        }}
    ]
}}"""

    logger.info("Pass 1: Generating module outline via Gemini...")
    for attempt in range(1, settings.MAX_LLM_RETRIES + 1):
        try:
            raw_response = call_gemini(prompt, json_mode=True)
            modules = _parse_module_outline(raw_response)
            if modules:
                logger.info(f"Pass 1 complete: {len(modules)} modules proposed via Gemini")
                return modules
        except Exception as e:
            provider_errors.append(f"Gemini: {e}")
            logger.warning(f"Pass 1 Gemini attempt {attempt}/{settings.MAX_LLM_RETRIES} failed: {e}")
            if attempt < settings.MAX_LLM_RETRIES:
                time.sleep(settings.LLM_RETRY_DELAY_SECONDS * attempt)

    # Fallback to Groq if Gemini fails or returns truncated JSON
    logger.info("Pass 1: Falling back to Groq for module outline...")
    for attempt in range(1, settings.MAX_LLM_RETRIES + 1):
        try:
            raw_response = call_groq(prompt, json_mode=True, system_prompt=COURSE_GENERATION_SYSTEM_PROMPT)
            modules = _parse_module_outline(raw_response)
            if modules:
                logger.info(f"Pass 1 complete: {len(modules)} modules proposed via Groq fallback")
                return modules
        except Exception as e:
            provider_errors.append(f"Groq: {e}")
            logger.warning(f"Pass 1 Groq fallback attempt {attempt}/{settings.MAX_LLM_RETRIES} failed: {e}")
            if attempt < settings.MAX_LLM_RETRIES:
                time.sleep(settings.LLM_RETRY_DELAY_SECONDS * attempt)

    logger.warning("Both outline providers failed; using source-grounded local outline. %s", provider_errors[-2:])
    return _build_local_module_outline(chunks)

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

Generate exactly 5 multiple-choice questions and {settings.CHEATSHEET_BULLETS_PER_MODULE} cheat sheet bullet points.

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
            raw_response = call_groq(prompt, json_mode=True, system_prompt=COURSE_GENERATION_SYSTEM_PROMPT)
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

def generate_full_module_content(title: str, summary: str, chunks: list[dict[str, Any]]) -> dict[str, Any]:
    chunk_texts = "\n\n".join(f"[{c['id']}]:\n{c['text']}" for c in chunks)
    prompt = f"""You are an expert educator. Generate comprehensive learning content for the module titled "{title}".

Context from source material:
{chunk_texts}

Generate a JSON object with:
1. "lesson_content": A detailed lesson (3-5 paragraphs) explaining the topic thoroughly. Include definitions, explanations, examples, and real-world applications. Format with markdown (headers, bold, lists).
2. "key_concepts": Array of 5-8 bullet points covering the most important concepts to remember.
3. "youtube_search_queries": Array of 3 specific YouTube search queries that would find the best educational videos for this topic (e.g. "binary search tree tutorial for beginners").
4. "quiz": {{"questions": [5 MCQs with question, options (4 choices), correct_answer, explanation]}}
5. "cheatsheet": {{"bullets": [concise revision bullets]}}"""

    for attempt in range(1, settings.MAX_LLM_RETRIES + 1):
        try:
            raw_response = call_groq(prompt, json_mode=True, system_prompt="You are an expert educator.")
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
            if isinstance(result, dict) and "lesson_content" in result:
                return result
        except Exception as e:
            logger.warning(f"generate_full_module_content attempt {attempt} failed: {e}")
            if attempt < settings.MAX_LLM_RETRIES:
                time.sleep(settings.LLM_RETRY_DELAY_SECONDS * attempt)
    
    logger.warning("Both content providers failed for '%s'; using source-grounded local content.", title)
    return _build_local_module_content(title, summary, chunks)

def generate_topic_course_outline(topic_name: str, depth: str) -> list[dict[str, Any]]:
    prompt = f"""You are an expert curriculum designer. Create a comprehensive course outline for "{topic_name}" at {depth} level.

Generate a JSON array of 5-8 modules, each with:
- "title": Module title
- "summary": 2-3 sentence description of what this module covers
- "key_topics": Array of subtopics this module should cover

Order modules from foundational to advanced. Make the course thorough and well-structured."""

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

            result = json.loads(json_str)
            if isinstance(result, list) and len(result) > 0:
                return result
        except Exception as e:
            logger.warning(f"generate_topic_course_outline attempt {attempt} failed: {e}")
            if attempt < settings.MAX_LLM_RETRIES:
                time.sleep(settings.LLM_RETRY_DELAY_SECONDS * attempt)
                
    raise RuntimeError(f"Failed to generate course outline for '{topic_name}'")

def generate_topic_module_content(topic_name: str, module_title: str, module_summary: str, key_topics: list[str], depth: str) -> dict[str, Any]:
    prompt = f"""You are an expert educator creating content for the module "{module_title}" in a course about "{topic_name}" at {depth} level.

This module covers: {module_summary}
Key topics: {key_topics}

Generate a JSON object with:
1. "lesson_content": Detailed lesson (4-6 paragraphs) with markdown formatting. Include explanations, examples, code snippets if relevant.
2. "key_concepts": 5-8 bullet points of the most important things to remember.
3. "youtube_links": Array of 3 objects with {{"title": "descriptive video title", "url": "https://www.youtube.com/results?search_query=<url_encoded_search>"}} — generate real YouTube search URLs for the best educational content.
4. "quiz": {{"questions": [5 MCQs]}}
5. "cheatsheet": {{"bullets": [revision points]}}"""

    for attempt in range(1, settings.MAX_LLM_RETRIES + 1):
        try:
            raw_response = call_groq(prompt, json_mode=True, system_prompt="You are an expert educator.")
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
            if isinstance(result, dict) and "lesson_content" in result:
                return result
        except Exception as e:
            logger.warning(f"generate_topic_module_content attempt {attempt} failed: {e}")
            if attempt < settings.MAX_LLM_RETRIES:
                time.sleep(settings.LLM_RETRY_DELAY_SECONDS * attempt)
                
    raise RuntimeError(f"Failed to generate module content for '{module_title}'")
