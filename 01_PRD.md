# LearnSync AI — Product Requirements Document (PRD)

**Version:** 1.0 (Draft)
**Status:** Pre-build / Planning
**Owner:** Engineering Team

---

## 1. Overview

LearnSync AI is an all-in-one AI learning platform that converts raw, unstructured study material (textbooks, manuals, PYQ sheets, resumes, job descriptions) into three structured outcomes:

1. A self-paced, quiz-and-cheat-sheet-backed **course** (Course Engine)
2. A deadline-driven, PYQ-weighted **exam sprint plan** (Sprint Engine)
3. A voice-based, difficulty-adaptive **mock interview** with analytics (Mock Mentor)

The platform is a content **pipeline**, not a content **library** — it ships with zero pre-seeded courses and generates everything on demand, strictly grounded in what the user uploads.

## 2. Problem Statement

Existing tools fail learners in three specific ways:

| Gap | Current behavior | LearnSync fix |
|---|---|---|
| Generic AI chat dumps raw text | User uploads a PDF, gets a wall of text back | Auto-structured modules, quizzes, cheat sheets |
| No urgency-aware planning | Study tools ignore exam deadlines and past-paper patterns | Sprint Engine cross-references PYQs + calendar to build a compressed plan |
| Static interview prep | Same canned questions for every candidate | Mock Mentor adapts question difficulty in real time based on spoken answers |

## 3. Goals & Success Metrics

**Primary goals**
- Reduce time from "raw document" to "usable study material" to under 60 seconds.
- Make exam prep prioritization automatic and evidence-based (PYQ frequency), not guesswork.
- Give interview candidates a realistic, adaptive practice loop with actionable feedback.

**Success metrics (initial targets — to be validated with team/stakeholders)**
- ≥90% of uploaded documents successfully parsed into a module structure without manual cleanup.
- Median time from upload to first generated quiz < 60s for a 100-page document.
- Sprint Dashboard correctly ranks topics by PYQ frequency with a verifiable, auditable score.
- Mock Mentor sessions produce a completed analytics report for ≥95% of finished sessions.
- Zero instances of AI-generated course content that isn't traceable to the source document (grounding integrity).

## 4. Target Users / Personas

1. **The Cramming Student** — has an exam in days, has PYQs, needs a ranked, compressed plan.
2. **The Self-Learner** — has a large manual/textbook and wants a structured "classroom" without enrolling anywhere.
3. **The Job Candidate** — has a resume + JD, wants realistic, adaptive interview practice with a scorecard.

## 5. Core Features & Requirements

### Feature A — The Automated Classroom (Course Engine)

**User flow:** User drops a document (PDF/text) into the dashboard.

**Functional requirements:**
- FR-A1: System shall accept PDF and plain text uploads up to a defined size limit (e.g., 100 pages / X MB — to be finalized).
- FR-A2: System shall parse and chunk the document, then generate a hierarchical **Module** structure (course → modules → sub-topics).
- FR-A3: Each module shall include: text highlights, an auto-generated multiple-choice quiz, and a slide-out "Cheat Sheet."
- FR-A4: Generation shall complete within a target time budget (see Success Metrics) with a visible progress state for the user.
- FR-A5: Quiz questions and cheat sheets must be traceable to specific source passages (no hallucinated facts).

**Out of scope for v1:** collaborative/shared classrooms, instructor-side authoring tools, non-PDF formats (audio/video ingestion).

### Feature B — The "Last-Minute" Exam Scheduler (Sprint Engine)

**User flow:** User states a deadline ("exam in 3 days") and uploads a second document containing Previous Year Questions (PYQs).

**Functional requirements:**
- FR-B1: System shall accept a natural-language or structured deadline input and compute the available prep window.
- FR-B2: System shall cross-reference PYQ content against the master syllabus generated in Feature A to score topics by frequency/importance.
- FR-B3: System shall generate a prioritized "3-Day Sprint Dashboard" (or N-day, based on input) that visually de-emphasizes or hides low-yield filler content.
- FR-B4: The sprint plan must update if the user uploads additional PYQ sets or changes the deadline.

**Open questions:** How ties in PYQ frequency are broken; whether sprint plans support multiple exams concurrently.

### Feature C — The Adaptive "Interview Sense" AI (Mock Mentor)

**User flow:** User uploads a resume and pastes a job description, then speaks answers aloud.

**Functional requirements:**
- FR-C1: System shall parse resume + JD to generate a contextually relevant opening question.
- FR-C2: System shall capture spoken answers via browser speech-to-text and evaluate them for depth/competence.
- FR-C3: Based on evaluation, the system shall dynamically increase difficulty (strong answer) or pivot to a foundational question (weak answer) to find the candidate's true baseline.
- FR-C4: At session end, system shall generate a granular analytics report (strengths, weaknesses, topic coverage, suggested next steps).
- FR-C5: The interaction shall feel real-time: the AI must speak questions back (text-to-speech) with acceptable latency.

**Open questions:** How "competence" is scored (rubric definition), whether sessions can be paused/resumed, data retention policy for recorded/transcribed audio.

## 6. Data Strategy Requirements

- DR-1: Platform starts with **zero seeded content** — 100% of course material is user-generated at upload time.
- DR-2: Uploaded documents shall be embedded and chunked into a **Vector Database** for retrieval-augmented generation.
- DR-3: **Strict context grounding** — generation must be constrained to the user's uploaded document(s) only; open-web lookups are explicitly forbidden for course/quiz generation.
- DR-4: User data (documents, resumes, transcripts) must be stored with clear ownership and deletion capability.

## 7. Non-Functional Requirements

- **Latency:** Course generation under 60s for a 100-page doc (target, to be benchmarked); interview Q&A round-trip latency low enough to feel conversational.
- **Reliability:** Generation pipeline must degrade gracefully (partial results) rather than fail silently on large/malformed documents.
- **Privacy/Security:** Resumes and personal documents are sensitive — require secure storage, scoped access, and a clear data-retention/deletion policy.
- **Accuracy/Grounding:** No hallucinated facts in quizzes/cheat sheets; all generated content must be checkable against the source.
- **Scalability:** Vector DB and generation pipeline should handle concurrent users without cross-contamination of one user's documents into another's context.

## 8. Team Ownership Mapping (from Vision Doc)

| Track | Owns | Primary PRD sections |
|---|---|---|
| Track 1 — AI & Data Engineer (Backend) | FastAPI server, PDF parsing, chunking, Vector DB, prompt templates | Feature A, B, C generation logic; Data Strategy |
| Track 2 — UI/UX Architect (Frontend) | Next.js app, upload zone, classroom view, cheat sheet drawer, audio UI | Feature A, B UI; Feature C interface |
| Track 3 — Real-Time Audio & Analytics Engineer | Web Speech API integration, "Interviewer State" logic | Feature C adaptive logic and analytics |

## 9. Milestones (Proposed)

1. **Phase 0 — Sandbox:** Local Python script: read PDF → generate quiz in terminal (validates core generation quality before any UI work).
2. **Phase 1 — Course Engine MVP:** End-to-end upload → module/quiz/cheat-sheet generation in the web app.
3. **Phase 2 — Sprint Engine:** PYQ ingestion + prioritized sprint dashboard.
4. **Phase 3 — Mock Mentor:** Resume/JD ingestion, adaptive Q&A loop, analytics report.
5. **Phase 4 — Hardening:** Grounding checks, latency optimization, privacy review.

## 10. Risks

- **Grounding failure:** LLM ignoring "no open-web" constraint and hallucinating — needs prompt engineering + output validation.
- **PYQ cross-referencing accuracy:** Matching PYQ topics to syllabus topics reliably is a non-trivial NLP problem.
- **Real-time audio latency:** Web Speech API browser support and latency variability could hurt the "real-time" feel of Mock Mentor.
- **Cold-start free-tier APIs:** Reliance on free tiers (Groq, Gemini) may hit rate limits under real usage.
