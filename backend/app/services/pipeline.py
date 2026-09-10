import logging
import json
import uuid
import time
from pathlib import Path

from app.database import SessionLocal
from app.models import Document, Course, Module, QuizQuestion, CheatSheetBullet, SprintPlan, SprintTopic
from app.config import settings
from app.services.pdf_parser import extract_text_from_pdf
from app.services.chunker import chunk_text
from app.services.embedder import embed_chunks, retrieve_chunks, client as chroma_client
from app.services.generator import generate_module_outline, generate_full_module_content, generate_topic_course_outline, generate_topic_module_content

logger = logging.getLogger(__name__)

def run_sprint_generation_after_course(sprint_id: str, course_id: str) -> None:
    """Wait for automatic course generation, then build the sprint plan."""
    db = SessionLocal()
    try:
        for _ in range(90):
            course = db.query(Course).filter(Course.id == course_id).first()
            sprint = db.query(SprintPlan).filter(SprintPlan.id == sprint_id).first()
            if not course or not sprint:
                return
            if course.status == "ready":
                db.close()
                run_sprint_generation(sprint_id)
                return
            if course.status == "failed":
                sprint.status = "failed"
                sprint.error_message = course.error_message or "Course generation failed"
                db.commit()
                return
            time.sleep(2)

        sprint = db.query(SprintPlan).filter(SprintPlan.id == sprint_id).first()
        if sprint:
            sprint.status = "failed"
            sprint.error_message = "Course generation timed out. Please try again."
            db.commit()
    finally:
        db.close()

def run_ingestion(document_id: str) -> None:
    db = SessionLocal()
    try:
        doc = db.query(Document).filter(Document.id == document_id).first()
        if not doc:
            logger.error(f"Document {document_id} not found in db.")
            return

        doc.status = 'processing'
        db.commit()

        # Extract
        text = extract_text_from_pdf(Path(doc.file_path))
        
        # Chunk
        chunks = chunk_text(text, settings.CHUNK_SIZE, settings.CHUNK_OVERLAP)
        
        # Embed
        embed_chunks(document_id, chunks)
        
        doc.status = 'ready'
        doc.chunk_count = len(chunks)
        db.commit()
        logger.info(f"Ingestion successful for doc {document_id}")

    except Exception as e:
        logger.exception(f"Ingestion failed for doc {document_id}")
        doc.status = 'failed'
        doc.error_message = str(e)
        db.commit()
    finally:
        db.close()

def run_text_ingestion(document_id: str) -> None:
    db = SessionLocal()
    doc = None
    try:
        doc = db.query(Document).filter(Document.id == document_id).first()
        if not doc:
            return
        doc.status = "processing"
        db.commit()
        text = Path(doc.file_path).read_text(encoding="utf-8")
        chunks = chunk_text(text, settings.CHUNK_SIZE, settings.CHUNK_OVERLAP)
        embed_chunks(document_id, chunks)
        doc.status = "ready"
        doc.chunk_count = len(chunks)
        db.commit()
    except Exception as exc:
        logger.exception("Text ingestion failed for doc %s", document_id)
        if doc:
            doc.status = "failed"
            doc.error_message = str(exc)
            db.commit()
    finally:
        db.close()

def run_generation(course_id: str) -> None:
    db = SessionLocal()
    try:
        course = db.query(Course).filter(Course.id == course_id).first()
        if not course:
            logger.error(f"Course {course_id} not found.")
            return

        course.status = 'generating'
        db.commit()

        document_id = course.document_id
        
        # Get all chunks from ChromaDB for outline generation
        # Since we don't have a direct "get all" wrapper, we can query with a dummy text, 
        # or we could retrieve based on chunk count. Let's retrieve a large top_k.
        all_chunks_raw = retrieve_chunks(document_id, "summary", top_k=10000)
        
        # Pass 1
        module_outlines = generate_module_outline(all_chunks_raw)
        
        # Pass 2
        for i, mod_outline in enumerate(module_outlines):
            if i > 0:
                time.sleep(1.0)
            title = mod_outline.get("title", f"Module {i+1}")
            summary = mod_outline.get("summary", "")
            chunk_ids = mod_outline.get("chunk_ids", [])
            
            assigned_chunks = [c for c in all_chunks_raw if c["id"] in chunk_ids]
            if not assigned_chunks:
                assigned_chunks = retrieve_chunks(document_id, f"{title} {summary}", settings.TOP_K_CHUNKS)
            
            gen_result = generate_full_module_content(title, summary, assigned_chunks)
            
            mod_id = str(uuid.uuid4())
            new_mod = Module(
                id=mod_id,
                course_id=course_id,
                title=title,
                summary=summary,
                lesson_content=gen_result.get("lesson_content"),
                youtube_links=json.dumps(gen_result.get("youtube_search_queries", [])),
                order_index=i,
                source_chunk_ids=json.dumps([c["id"] for c in assigned_chunks])
            )
            db.add(new_mod)
            db.commit() # commit to get module id relations
            
            quiz_data = gen_result.get("quiz", {}).get("questions", [])
            for q_idx, q in enumerate(quiz_data):
                db.add(QuizQuestion(
                    id=str(uuid.uuid4()),
                    module_id=mod_id,
                    question=q.get("question", ""),
                    options=json.dumps(q.get("options", [])),
                    correct_answer=q.get("correct_answer", ""),
                    explanation=q.get("explanation", ""),
                    source_chunk_id=q.get("source_chunk_id", assigned_chunks[0]["id"] if assigned_chunks else "unknown"),
                    order_index=q_idx
                ))
            
            bullet_data = gen_result.get("cheatsheet", {}).get("bullets", [])
            for b_idx, b in enumerate(bullet_data):
                db.add(CheatSheetBullet(
                    id=str(uuid.uuid4()),
                    module_id=mod_id,
                    text=b,
                    order_index=b_idx
                ))
                
            db.commit()

        course.status = 'ready'
        db.commit()
        logger.info(f"Generation successful for course {course_id}")

    except Exception as e:
        logger.exception(f"Generation failed for course {course_id}")
        course.status = 'failed'
        course.error_message = str(e)
        db.commit()
    finally:
        db.close()

def run_sprint_generation(sprint_plan_id: str) -> None:
    db = SessionLocal()
    try:
        sprint = db.query(SprintPlan).filter(SprintPlan.id == sprint_plan_id).first()
        sprint.status = 'generating'
        db.commit()
        
        # 1. Get the course (with modules) for the syllabus document
        course = db.query(Course).filter(Course.document_id == sprint.syllabus_document_id).first()
        if not course or course.status != 'ready':
            raise RuntimeError("No ready course found for syllabus document")
        
        # 2. Get all modules for the course
        modules = db.query(Module).filter(Module.course_id == course.id).all()
        syllabus_modules = [
            {"module_id": m.id, "title": m.title, "summary": m.summary, 
             "source_chunk_ids": json.loads(m.source_chunk_ids)}
            for m in modules
        ]
        
        # 3. Get PYQ chunks from ChromaDB
        # Use a broad query to get all PYQ chunks
        pyq_chunks = retrieve_chunks(sprint.pyq_document_id, "exam questions", top_k=10000)
        
        # 4. For each module, query ChromaDB with module title+summary against PYQ collection
        # to find which PYQ chunks are similar
        similarity_results = {}
        for mod in syllabus_modules:
            query = f"{mod['title']} {mod['summary']}"
            # Query the PYQ document's ChromaDB collection
            pyq_collection_name = f"{settings.CHROMA_COLLECTION_PREFIX}{sprint.pyq_document_id}"
            pyq_collection = chroma_client.get_collection(pyq_collection_name)
            match_count = pyq_collection.count()
            if match_count == 0:
                similarity_results[mod['module_id']] = []
                continue
            results = pyq_collection.query(query_texts=[query], n_results=min(20, match_count))
            
            matches = []
            for i in range(len(results['ids'][0])):
                similarity = 1.0 - (results['distances'][0][i] if results['distances'] else 0)
                matches.append({
                    "pyq_chunk_id": results['ids'][0][i],
                    "similarity": similarity
                })
            similarity_results[mod['module_id']] = matches
        
        # 5. Score topics
        from app.services.sprint_scorer import score_topics
        from datetime import date
        
        scored = score_topics(
            syllabus_modules=syllabus_modules,
            pyq_chunks=pyq_chunks,
            similarity_results=similarity_results,
            deadline_date=date.fromisoformat(sprint.deadline),
            today=date.today(),
            similarity_threshold=settings.SIMILARITY_THRESHOLD,
            low_priority_threshold=settings.LOW_PRIORITY_FREQUENCY_THRESHOLD,
        )
        
        if not scored:
            total_days = max(1, (date.fromisoformat(sprint.deadline) - date.today()).days)
            scored = [
                {
                    "module_id": module["module_id"],
                    "topic_title": module["title"],
                    "pyq_frequency": 0,
                    "similarity_score": 0.0,
                    "priority_rank": index + 1,
                    "assigned_day": min((index * total_days) // max(1, len(syllabus_modules)) + 1, total_days),
                    "is_low_priority": True,
                }
                for index, module in enumerate(syllabus_modules)
            ]
        
        # 6. Save SprintTopic rows
        for topic_data in scored:
            db.add(SprintTopic(
                id=str(uuid.uuid4()),
                sprint_plan_id=sprint_plan_id,
                module_id=topic_data['module_id'],
                topic_title=topic_data['topic_title'],
                pyq_frequency=topic_data['pyq_frequency'],
                similarity_score=topic_data['similarity_score'],
                priority_rank=topic_data['priority_rank'],
                assigned_day=topic_data['assigned_day'],
                is_low_priority=topic_data['is_low_priority'],
            ))
        
        from datetime import date
        sprint.total_days = max(1, (date.fromisoformat(sprint.deadline) - date.today()).days)
        sprint.status = 'ready'
        db.commit()
    except Exception as e:
        logger.exception(f"Sprint generation failed for {sprint_plan_id}")
        sprint.status = 'failed'
        sprint.error_message = str(e)
        db.commit()
        db.close()

def run_topic_course_generation(course_id: str, depth: str) -> None:
    db = SessionLocal()
    try:
        course = db.query(Course).filter(Course.id == course_id).first()
        if not course:
            logger.error(f"Course {course_id} not found.")
            return

        course.status = 'generating'
        db.commit()
        
        module_outlines = generate_topic_course_outline(course.topic_name, depth)
        
        for i, mod_outline in enumerate(module_outlines):
            if i > 0:
                time.sleep(1.0)
            title = mod_outline.get("title", f"Module {i+1}")
            summary = mod_outline.get("summary", "")
            key_topics = mod_outline.get("key_topics", [])
            
            gen_result = generate_topic_module_content(course.topic_name, title, summary, key_topics, depth)
            
            mod_id = str(uuid.uuid4())
            new_mod = Module(
                id=mod_id,
                course_id=course_id,
                title=title,
                summary=summary,
                lesson_content=gen_result.get("lesson_content"),
                youtube_links=json.dumps(gen_result.get("youtube_links", [])),
                order_index=i,
                source_chunk_ids="[]"
            )
            db.add(new_mod)
            db.commit()
            
            quiz_data = gen_result.get("quiz", {}).get("questions", [])
            for q_idx, q in enumerate(quiz_data):
                db.add(QuizQuestion(
                    id=str(uuid.uuid4()),
                    module_id=mod_id,
                    question=q.get("question", ""),
                    options=json.dumps(q.get("options", [])),
                    correct_answer=q.get("correct_answer", ""),
                    explanation=q.get("explanation", ""),
                    source_chunk_id="topic",
                    order_index=q_idx
                ))
            
            bullet_data = gen_result.get("cheatsheet", {}).get("bullets", [])
            for b_idx, b in enumerate(bullet_data):
                db.add(CheatSheetBullet(
                    id=str(uuid.uuid4()),
                    module_id=mod_id,
                    text=b,
                    order_index=b_idx
                ))
                
            db.commit()

        course.status = 'ready'
        db.commit()
        logger.info(f"Topic course generation successful for course {course_id}")

    except Exception as e:
        logger.exception(f"Topic course generation failed for course {course_id}")
        course.status = 'failed'
        course.error_message = str(e)
        db.commit()
    finally:
        db.close()

def run_topic_sprint_generation(sprint_plan_id: str) -> None:
    db = SessionLocal()
    try:
        sprint = db.query(SprintPlan).filter(SprintPlan.id == sprint_plan_id).first()
        if not sprint:
            logger.error(f"Sprint {sprint_plan_id} not found.")
            return

        sprint.status = 'generating'
        db.commit()

        # Generate subtopics for the topic based on deadline and hours_per_day
        from datetime import date
        from app.services.generator import call_groq
        
        deadline_date = date.fromisoformat(sprint.deadline)
        total_days = max(1, (deadline_date - date.today()).days)
        sprint.total_days = total_days
        
        prompt = f"""You are an expert curriculum planner. Create a study sprint for the topic "{sprint.topic_name}".
The student has {total_days} days to study, for {sprint.hours_per_day} hours per day.

Generate a JSON array of {min(15, total_days * 2)} essential subtopics to cover, ordered by priority (highest priority first).
Each subtopic should be a JSON object with:
- "topic_title": The name of the subtopic
- "priority_rank": Integer from 1 (highest) to N

Return ONLY the JSON array."""

        raw_response = call_groq(prompt, json_mode=True, system_prompt="You are an expert curriculum planner.")
        json_str = raw_response.strip()
        if json_str.startswith("```"):
            lines = json_str.split("\n")
            json_str = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
        else:
            start_idx = json_str.find("[")
            end_idx = json_str.rfind("]")
            if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
                json_str = json_str[start_idx : end_idx + 1]

        subtopics = json.loads(json_str)
        
        for idx, t in enumerate(subtopics):
            # assign days evenly
            assigned_day = min((idx * total_days) // len(subtopics) + 1, total_days)
            
            db.add(SprintTopic(
                id=str(uuid.uuid4()),
                sprint_plan_id=sprint_plan_id,
                module_id="topic",
                topic_title=t.get("topic_title", f"Topic {idx+1}"),
                pyq_frequency=0,
                similarity_score=1.0,
                priority_rank=t.get("priority_rank", idx+1),
                assigned_day=assigned_day,
                is_low_priority=False
            ))

        sprint.status = 'ready'
        db.commit()
    except Exception as e:
        logger.exception(f"Topic sprint generation failed for {sprint_plan_id}")
        sprint.status = 'failed'
        sprint.error_message = str(e)
        db.commit()
    finally:
        db.close()
