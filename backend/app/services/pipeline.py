import logging
import json
import uuid
from pathlib import Path

from app.database import SessionLocal
from app.models import Document, Course, Module, QuizQuestion, CheatSheetBullet, SprintPlan, SprintTopic
from app.config import settings
from app.services.pdf_parser import extract_text_from_pdf
from app.services.chunker import chunk_text
from app.services.embedder import embed_chunks, retrieve_chunks, client as chroma_client
from app.services.generator import generate_module_outline, generate_quiz_and_cheatsheet

logger = logging.getLogger(__name__)

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
            title = mod_outline.get("title", f"Module {i+1}")
            summary = mod_outline.get("summary", "")
            chunk_ids = mod_outline.get("chunk_ids", [])
            
            assigned_chunks = [c for c in all_chunks_raw if c["id"] in chunk_ids]
            if not assigned_chunks:
                assigned_chunks = retrieve_chunks(document_id, f"{title} {summary}", settings.TOP_K_CHUNKS)
            
            gen_result = generate_quiz_and_cheatsheet(title, summary, assigned_chunks)
            
            mod_id = str(uuid.uuid4())
            new_mod = Module(
                id=mod_id,
                course_id=course_id,
                title=title,
                summary=summary,
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
            results = pyq_collection.query(query_texts=[query], n_results=min(20, pyq_collection.count()))
            
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
            raise RuntimeError("No PYQ matches found above similarity threshold. The PYQ document may not match the syllabus subject.")
        
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
        
        sprint.total_days = scored[0]['total_days'] if scored else 1
        sprint.status = 'ready'
        db.commit()
    except Exception as e:
        logger.exception(f"Sprint generation failed for {sprint_plan_id}")
        sprint.status = 'failed'
        sprint.error_message = str(e)
        db.commit()
    finally:
        db.close()
