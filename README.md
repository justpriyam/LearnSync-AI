# LearnSync AI

**AI-powered study companion** that turns any PDF into structured courses with quizzes, builds exam-priority study plans from previous year questions, and conducts adaptive mock interviews with voice — all grounded strictly in your uploaded documents.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi)
![Python](https://img.shields.io/badge/Python-3.13-3776AB?logo=python&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)

---

## Features

### 📚 Course Engine
Upload any textbook PDF and get a complete course structure:
- **Module breakdown** — AI analyzes the document and organizes content into coherent learning modules
- **MCQ quizzes** — 5 multiple-choice questions per module with instant right/wrong feedback
- **Cheat sheets** — Key bullet points for quick revision, accessible via slide-out drawer
- **Source grounding** — Every quiz question traces back to a specific document chunk (`source_chunk_id`)

### 🎯 Sprint Engine
Upload previous year questions (PYQs) + set an exam deadline:
- **PYQ frequency analysis** — Ranks syllabus topics by how often they appear in past exams
- **Day-by-day study plan** — High-priority topics scheduled first, low-priority de-emphasized (not hidden)
- **Re-runnable** — Change deadline or add more PYQs, get a fresh plan without teardown
- **Confidence scores** — See how well each PYQ matched each topic (cosine similarity %)

### 🎙️ Mock Mentor
Upload a resume + paste a job description, then do a spoken interview:
- **Adaptive difficulty** — AI escalates to harder questions when you score well, pivots to basics when you struggle
- **Voice + text** — Web Speech API for spoken Q&A, with text fallback for unsupported browsers
- **Turn-by-turn scoring** — Each answer evaluated on a 1–5 scale with detailed feedback
- **Analytics report** — Strengths, weaknesses, topic coverage, and suggestions at the end

### 🔒 Hardening
- **Grounding audit** — Automated tests verify every generated artifact traces to source chunks
- **Deletion endpoints** — Full cleanup of documents, courses, embeddings, and interview data
- **Error handling** — Corrupt PDFs, rate limits, oversized files — all produce clear, actionable messages

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React, TypeScript (strict), Tailwind CSS |
| Backend | FastAPI, Python 3.13, SQLAlchemy 2.0, Pydantic v2 |
| Vector DB | ChromaDB (persistent, per-document collections) |
| LLM (fast) | Groq — `llama-3.3-70b-versatile` |
| LLM (heavy context) | Google Gemini — `gemini-2.0-flash` |
| Speech | Web Speech API (browser-native, no server cost) |
| Database | SQLite (dev) / PostgreSQL (prod) — one-line `.env` switch |

---

## Project Structure

```
LearnSync AI/
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI app, CORS, router registration
│   │   ├── config.py               # All settings (env-driven, pydantic-settings)
│   │   ├── database.py             # SQLAlchemy engine + session
│   │   ├── models.py               # ORM: Document, Course, Module, Quiz, Sprint, Interview
│   │   ├── schemas.py              # Pydantic request/response schemas
│   │   ├── routers/
│   │   │   ├── documents.py        # Upload + ingestion status
│   │   │   ├── courses.py          # Course generation + retrieval
│   │   │   ├── sprint.py           # Sprint plan generation
│   │   │   ├── interview.py        # Interview start/turn/report
│   │   │   └── deletion.py         # Admin deletion endpoints
│   │   └── services/
│   │       ├── pdf_parser.py       # PyMuPDF text extraction
│   │       ├── chunker.py          # Recursive text splitting
│   │       ├── embedder.py         # ChromaDB embed/retrieve
│   │       ├── generator.py        # Gemini + Groq LLM calls
│   │       ├── pipeline.py         # Background task orchestrators
│   │       ├── sprint_scorer.py    # PYQ frequency scoring (pure function)
│   │       └── interviewer.py      # Difficulty state machine (pure functions)
│   ├── tests/                      # 20 tests across 5 test files
│   ├── sandbox/                    # Phase 0 proof-of-concept script
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx            # Home: upload + document list
│   │   │   ├── layout.tsx          # Root layout with nav
│   │   │   ├── courses/[courseId]/  # Classroom view
│   │   │   ├── sprint/             # Sprint wizard + dashboard
│   │   │   └── interview/          # Interview session + report
│   │   ├── components/
│   │   │   ├── UploadZone.tsx      # Drag-and-drop PDF upload
│   │   │   ├── ProcessingStatus.tsx # Ingestion status poller
│   │   │   ├── QuizView.tsx        # MCQ with feedback + source refs
│   │   │   ├── CheatSheetDrawer.tsx # Slide-out cheat sheet
│   │   │   ├── SprintDashboard.tsx # Ranked topics by day
│   │   │   ├── InterviewSession.tsx # Voice + text Q&A loop
│   │   │   └── InterviewReport.tsx # End-of-session analytics
│   │   └── lib/
│   │       ├── types.ts            # TypeScript interfaces
│   │       └── api.ts              # Typed API client
│   ├── package.json
│   ├── tailwind.config.ts
│   └── .env.example
├── 01_PRD.md                       # Product Requirements Document
├── 02_Design_Doc.html              # Technical Design Document
├── 03_Tech_Stack.md                # Stack Decisions & Rationale
├── .gitignore
└── README.md
```

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/documents` | Upload PDF, start ingestion |
| `GET` | `/documents/{id}/status` | Poll ingestion progress |
| `GET` | `/documents` | List all documents |
| `POST` | `/courses/{doc_id}/generate` | Generate course from document |
| `GET` | `/courses/{id}` | Get full course with modules/quizzes |
| `POST` | `/sprint/generate` | Generate sprint plan (syllabus + PYQ + deadline) |
| `GET` | `/sprint/{id}` | Get sprint plan with ranked topics |
| `POST` | `/interview/start` | Start interview session (resume + JD) |
| `POST` | `/interview/{id}/turn` | Submit answer, get next question |
| `GET` | `/interview/{id}/report` | Get analytics report |
| `DELETE` | `/admin/documents/{id}` | Delete document + all artifacts |
| `DELETE` | `/admin/interviews/{id}` | Delete interview + all turns |

---

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- [Groq API Key](https://console.groq.com/) (free tier available)
- [Google Gemini API Key](https://aistudio.google.com/apikey) (free tier available)

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/learnsync-ai.git
cd learnsync-ai
```

### 2. Backend setup
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Edit .env and add your API keys:
#   GROQ_API_KEY=gsk_...
#   GEMINI_API_KEY=AI...
```

### 3. Frontend setup
```bash
cd frontend
npm install
cp .env.example .env.local
```

### 4. Run
```bash
# Terminal 1 — Backend (http://localhost:8000)
cd backend
uvicorn app.main:app --reload --port 8000

# Terminal 2 — Frontend (http://localhost:3000)
cd frontend
npm run dev
```

### 5. Use it
1. Open **http://localhost:3000**
2. Upload a PDF textbook → wait for processing → click **Generate Course**
3. Browse modules, take quizzes, open cheat sheets
4. Go to **Sprint Planner** → select syllabus → upload PYQ PDF → set deadline → generate plan
5. Go to **Mock Interview** → upload resume + JD → start speaking!

---

## Production Deployment

Deploy the frontend and backend as separate services:

1. **Backend on Render:** create a new Blueprint from this repository. Render will use [`render.yaml`](render.yaml), install `backend/requirements.txt`, and start FastAPI on the assigned port. Add `GROQ_API_KEY`, `GEMINI_API_KEY`, and set `CORS_ORIGINS` to the deployed Vercel URL, such as `https://learnsync-ai.vercel.app`.
2. **Frontend on Vercel:** import the repository with `frontend` as the **Root Directory** and select the Next.js preset. Add `NEXT_PUBLIC_API_URL` with the public Render backend URL, such as `https://learnsync-api.onrender.com`.
3. Keep the Render persistent disk enabled. SQLite, uploaded files, and ChromaDB are stored under `/var/data`; removing the disk removes those records and files.

The frontend cannot be deployed from the repository root because the root has no `package.json`. The backend should not be deployed as a normal Vercel Next.js project because it requires persistent storage and background processing.

---

## Testing

```bash
cd backend
python -m pytest tests/ -v
```

**20 tests across 5 suites:**
- `test_quiz_schema.py` — Quiz JSON schema + source_chunk_id grounding
- `test_sprint_scorer.py` — Frequency ranking, tie-breaking, day assignment
- `test_interviewer_state.py` — Difficulty escalation/pivot sequences
- `test_grounding.py` — Grounding integrity audit
- `test_deletion.py` — Cascade deletion verification

---

## Architecture

```
┌─────────────────┐       ┌──────────────────────────────┐
│   Next.js UI    │◄─────►│        FastAPI Backend        │
│   (Port 3000)   │  REST │         (Port 8000)           │
└─────────────────┘       ├──────────────────────────────┤
                          │  Services Layer               │
                          │  ├── pdf_parser (PyMuPDF)     │
                          │  ├── chunker (LangChain)      │
                          │  ├── embedder (ChromaDB)      │
                          │  ├── generator (Gemini/Groq)  │
                          │  ├── sprint_scorer            │
                          │  └── interviewer              │
                          ├──────────────────────────────┤
                          │  Data Layer                   │
                          │  ├── SQLite/Postgres (SQLAlchemy) │
                          │  └── ChromaDB (embeddings)    │
                          └──────────────────────────────┘
                                      │
                          ┌───────────┴───────────┐
                          │    LLM Providers      │
                          │  ├── Gemini (outlines) │
                          │  └── Groq (quizzes,   │
                          │       interviews)     │
                          └───────────────────────┘
```

**LLM Division of Labor:**
- **Gemini** (`gemini-2.0-flash`) — Heavy context tasks: module outline generation from full document
- **Groq** (`llama-3.3-70b-versatile`) — Fast turn-by-turn tasks: quiz generation, interview Q&A, evaluation

---

## Configuration

All settings are environment-driven via `backend/.env`. See [`.env.example`](backend/.env.example) for the full list.

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./learnsync.db` | Database connection string |
| `GROQ_API_KEY` | *(required)* | Groq API key |
| `GEMINI_API_KEY` | *(required)* | Google Gemini API key |
| `MAX_UPLOAD_SIZE_MB` | `50` | Maximum upload file size |
| `CHUNK_SIZE` | `1000` | Text chunk size (characters) |
| `SIMILARITY_THRESHOLD` | `0.4` | Min cosine similarity for PYQ matching |
| `MAX_INTERVIEW_TURNS` | `10` | Questions per interview session |
| `DIFFICULTY_ESCALATION_THRESHOLD` | `4` | Score to trigger harder questions |
| `DIFFICULTY_PIVOT_THRESHOLD` | `2` | Score to trigger easier questions |
| `CORS_ORIGINS` | `http://localhost:3000` | Comma-separated frontend origins allowed by the API |
| `CHROMA_DATA_DIR` | `.chroma_data` | Persistent ChromaDB directory |

---

## Design Decisions

- **Strict context grounding** — Every LLM call only receives chunks from the user's own document. No open web access during generation. Every quiz question carries a `source_chunk_id` (non-nullable).
- **Backend-authoritative interview** — Difficulty escalation/pivot logic lives entirely in the backend. The frontend only renders what the backend decides.
- **Voice as enhancement** — Web Speech API is detected at runtime. If unsupported or mic denied, the text input works identically. Same API contract either way.
- **Pure scoring functions** — Sprint scoring and interview difficulty are pure functions with no DB/API side effects, making them independently testable.
- **Per-document ChromaDB collections** — Each uploaded document gets its own embedding collection for isolation and clean deletion.

---

## License

This project is for educational purposes.

---

## Acknowledgments

Built with [Groq](https://groq.com/), [Google Gemini](https://ai.google.dev/), [ChromaDB](https://www.trychroma.com/), [FastAPI](https://fastapi.tiangolo.com/), and [Next.js](https://nextjs.org/).
