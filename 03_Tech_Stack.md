# LearnSync AI — Tech Stack Document

**Version:** 1.0 (Draft)
**Purpose:** Define the concrete tools/services each track will use, and why.

---

## 1. Stack Summary

| Layer | Choice | Owning Track |
|---|---|---|
| Frontend framework | Next.js (React) | Track 2 |
| Styling | Tailwind CSS (recommended, not yet finalized) | Track 2 |
| Backend framework | FastAPI (Python) | Track 1 |
| Vector database | ChromaDB (start) → Pinecone (scale option) | Track 1 |
| LLM — fast inference | Groq | Track 1 |
| LLM — document understanding | Google AI Studio (Gemini API) | Track 1 |
| Speech-to-text / Text-to-speech | Web Speech API (browser-native) | Track 3 |
| Relational metadata store | Postgres (recommended — not in original doc, needed for structured metadata) | Track 1 |
| Version control | GitHub (shared repo, monorepo-style: `/frontend`, `/backend`) | All |

## 2. Frontend

**Framework:** Next.js
- Chosen for fast iteration, built-in routing, and strong React ecosystem — matches the "interactive module classroom view" and drag-and-drop UI requirements.
- **Track 2 responsibilities:** drag-and-drop upload zone, module/classroom view, slide-out cheat-sheet drawer, Sprint Dashboard, and the circular/glowing audio interface for Mock Mentor.

**Considerations to finalize:**
- Styling approach (Tailwind CSS is a natural fit for the "glowing" custom audio UI described in the vision doc).
- State management for multi-step flows (upload → processing → generated view) — React context or a lightweight state library depending on complexity.

## 3. Backend

**Framework:** FastAPI (Python)
- Chosen for async support (useful for long-running generation calls), automatic OpenAPI docs, and Python's strong PDF/NLP tooling ecosystem.
- **Track 1 responsibilities:** PDF/text ingestion, chunking pipeline, Vector DB writes/reads, prompt-template management, structured JSON output enforcement for quizzes/modules.

**Key libraries (typical choices, to be confirmed by Track 1):**
- PDF text extraction (e.g., a Python PDF-parsing library)
- Text chunking utilities (custom or via an LLM-framework helper)
- HTTP client for Groq / Gemini API calls

## 4. AI / LLM Providers

**Groq**
- Used for ultra-fast text inference — well suited to latency-sensitive paths like Mock Mentor's real-time Q&A loop and quick quiz-generation calls.
- Free developer account available for prototyping (per vision doc's "Next Steps").

**Google AI Studio (Gemini API)**
- Used for deep document processing — larger context windows are useful when reasoning over a full chunked textbook/manual to propose a module structure.
- Free tier API key available for prototyping.

**Division of labor (proposed):**
- Gemini: heavy, context-large tasks (initial module structuring, PYQ-to-syllabus topic mapping).
- Groq: fast, turn-by-turn tasks (interview question generation/evaluation, quiz item generation once chunks are already scoped).

*This split is a starting hypothesis — validate via the Phase 0 sandbox script before locking it in.*

## 5. Data Storage

**Vector Database:** ChromaDB (initial) or Pinecone (scale)
- ChromaDB: local-first, zero-cost, simplest to stand up for the Phase 0/1 sandbox and early MVP.
- Pinecone: managed, scales better for concurrent multi-user production load — revisit once usage patterns are known.
- Stores: chunk embeddings + metadata (document_id, user/session scope, chunk position).

**Relational store:** Postgres (recommended addition)
- The vision doc doesn't specify a relational store, but structured entities (Users, Documents, Modules, Quizzes, SprintPlans, InterviewSessions — see Design Doc §5) need one. Postgres is a safe, well-supported default that pairs cleanly with FastAPI (e.g., via SQLAlchemy).

## 6. Real-Time Audio

**Web Speech API (browser-native)**
- Handles both speech-to-text (capturing spoken interview answers) and text-to-speech (the AI "speaking" questions back).
- No third-party audio service required for v1 — keeps cost at zero and avoids extra infra, at the cost of browser-support variability (primarily strongest in Chromium-based browsers).
- **Track 3 responsibilities:** integrate this API, and build the "Interviewer State" logic that consumes backend evaluation scores to decide question difficulty.

## 7. Repository & Environment Setup

- **Single shared GitHub repository** with a boilerplate split:
  - `/frontend` — Next.js app
  - `/backend` — FastAPI app
- **Environment/config:** `.env` files for API keys (Groq, Gemini, Vector DB credentials) — never committed to the repo.
- **Local dev:** Track 1 begins with a standalone local Python script (no server, no UI) that reads a PDF and prints a generated quiz to the terminal — validates the core generation quality before any infra is built around it.

## 8. Suggested Additions Beyond the Original Vision Doc

These aren't explicitly named in the vision document but are typically needed and are flagged here for the team to confirm or reject:

- **Postgres** (or similar) for relational metadata — vector DBs alone aren't a good fit for structured records like sprint plans or session history.
- **Authentication** (e.g., NextAuth or a managed auth provider) — not mentioned, but needed once documents are tied to individual users.
- **File storage** (e.g., S3-compatible bucket) for raw uploaded PDFs, separate from the Vector DB which only holds embeddings/text chunks.
- **Basic CI** (GitHub Actions) to run backend tests/linting on push, once Phase 1 is underway.

## 9. Deployment (Not Yet Specified — Flag for Team Decision)

The vision doc doesn't specify hosting. Common lightweight options to evaluate:
- Frontend: Vercel (native fit for Next.js).
- Backend: Render, Railway, or Fly.io for a FastAPI service with reasonable free/low-cost tiers.
- Vector DB: self-hosted ChromaDB alongside the backend initially; migrate to managed Pinecone if/when scale demands it.

This section should be finalized once Phase 1 (Course Engine MVP) is functional locally.
