# LearnSync AI

**AI-powered study companion** that turns any PDF into structured courses with quizzes, builds exam-priority study plans from previous year questions, and conducts adaptive mock interviews with voice — all grounded strictly in your uploaded documents.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi)
![Python](https://img.shields.io/badge/Python-3.13-3776AB?logo=python&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)

---

## Features

### 📚 Course Engine (`/courses`)
Upload any textbook PDF and get a complete course structure:
- **Module breakdown** — AI analyzes the document and organizes content into coherent learning modules
- **MCQ quizzes** — 5 multiple-choice questions per module with instant right/wrong feedback and grounded explanations
- **Cheat sheets** — Key bullet points for quick revision, accessible via slide-out drawer
- **Source grounding** — Every quiz question traces back to a specific document chunk (`source_chunk_id`)

### 🎯 Sprint Engine (`/sprint`)
Upload previous year questions (PYQs) + set an exam deadline:
- **PYQ frequency analysis** — Ranks syllabus topics by how often they appear in past exams
- **Day-by-day study plan** — High-priority topics scheduled first, low-priority de-emphasized
- **Re-runnable** — Change deadline or add more PYQs, get a fresh plan without teardown
- **Confidence scores** — See how well each PYQ matched each topic (cosine similarity %)

### 🎙️ Mock Mentor (`/interview`)
Upload a resume + job description, then participate in an interactive spoken interview:
- **Adaptive difficulty** — AI escalates to harder questions when you score well, pivots to basics when you struggle
- **Voice + text** — Web Speech API for spoken Q&A with text fallback
- **Turn-by-turn scoring** — Each answer evaluated on a 1–5 scale with detailed feedback
- **Analytics report** — Strengths, weaknesses, topic coverage, and suggestions upon completion

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript (strict), Tailwind CSS v4, Lucide Icons |
| Backend | FastAPI, Python 3.13, SQLAlchemy 2.0, Pydantic v2 |
| Vector DB | ChromaDB (persistent, per-document collections) |
| LLM (fast) | Groq — `llama-3.3-70b-versatile` |
| LLM (heavy context) | Google Gemini — `gemini-2.0-flash` |
| Speech | Web Speech API (browser-native, zero server latency) |
| Database | SQLite (dev) / PostgreSQL (prod e.g. Neon, Supabase, Render) |

---

## Project Structure

```
LearnSync AI/
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI app, CORS, router mounting
│   │   ├── core/                   # Core configuration & settings
│   │   │   └── config.py           # Pydantic settings, env loading
│   │   ├── db/                     # Database layer & models
│   │   │   ├── database.py         # SQLAlchemy engine (SQLite & Postgres)
│   │   │   └── models.py           # ORM models (Document, Course, Sprint, Interview)
│   │   ├── api/                    # Route handlers grouped by feature
│   │   │   ├── health.py           # /health check and server warming
│   │   │   ├── documents.py        # Upload + ingestion status
│   │   │   ├── courses.py          # Course generation + retrieval
│   │   │   ├── sprint.py           # Sprint plan generation
│   │   │   ├── interview.py        # Interview start, turn evaluation, report
│   │   │   └── deletion.py         # Admin deletion endpoints
│   │   ├── services/               # Business logic per engine
│   │   │   ├── pdf_parser.py       # PyMuPDF text extraction
│   │   │   ├── chunker.py          # Recursive text splitting
│   │   │   ├── embedder.py         # ChromaDB embed/retrieve
│   │   │   ├── generator.py        # Gemini + Groq LLM calls
│   │   │   ├── pipeline.py         # Background task orchestrators
│   │   │   ├── sprint_scorer.py    # PYQ frequency scoring (pure function)
│   │   │   └── interviewer.py      # Difficulty state machine (pure functions)
│   │   └── schemas.py              # Pydantic request/response schemas
│   ├── tests/                      # 20 automated unit and integration tests
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx          # Root layout with server warming notice
│   │   │   ├── page.tsx            # Cinematic hero landing page
│   │   │   ├── (dashboard)/
│   │   │   │   ├── courses/        # Hero courses page + [courseId] classroom
│   │   │   │   ├── sprint/         # Hero sprint planner + [sprintId] dashboard
│   │   │   │   └── interview/      # Hero mock mentor + session & report
│   │   ├── components/
│   │   │   ├── common/             # Shared UI (UploadZone, ProcessingStatus, WarmingNotice)
│   │   │   ├── courses/            # Course engine UI (DocumentCard, ModuleList, QuizView, CheatSheet)
│   │   │   ├── sprint/             # Sprint dashboard UI (SprintDashboard)
│   │   │   └── interview/          # Mock mentor UI (InterviewSession, InterviewReport)
│   │   └── lib/
│   │       ├── api.ts              # Resilient API client with timeout & warming
│   │       └── types.ts            # TypeScript interfaces
│   ├── package.json
│   └── .env.example
├── render.yaml                     # Render deployment blueprint
├── .gitignore
└── README.md
```

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check & cold-start warming ping |
| `POST` | `/documents` | Upload PDF & start background ingestion |
| `GET` | `/documents/{id}/status` | Poll document ingestion progress |
| `GET` | `/documents` | List all uploaded documents |
| `POST` | `/courses/{doc_id}/generate` | Generate course from document |
| `GET` | `/courses/{id}` | Get course details with modules & quizzes |
| `POST` | `/sprint/generate` | Generate sprint plan (syllabus + PYQ + deadline) |
| `GET` | `/sprint/{id}` | Get sprint plan with daily breakdown |
| `POST` | `/interview/start` | Start interview session (resume + JD) |
| `POST` | `/interview/{id}/turn` | Submit response, evaluate & get next question |
| `GET` | `/interview/{id}/report` | Get performance evaluation report |
| `DELETE` | `/admin/documents/{id}` | Cascade delete document + all artifacts |
| `DELETE` | `/admin/interviews/{id}` | Delete interview session + turns |

---

## Quick Start (Local Development)

### 1. Prerequisites
- Python 3.11+
- Node.js 18+
- [Groq API Key](https://console.groq.com/) (free tier)
- [Google Gemini API Key](https://aistudio.google.com/apikey) (free tier)

### 2. Backend Setup
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env

# Edit .env and add your API keys:
# GROQ_API_KEY=gsk_...
# GEMINI_API_KEY=AI...

uvicorn app.main:app --reload --port 8000
```

### 3. Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env.local

npm run dev
```

Visit **http://localhost:3000** in your browser.

---

## Automated Tests

Run backend test suite:
```bash
cd backend
python -m pytest tests/ -v
```

All 20 tests verify:
- `test_quiz_schema.py` — Quiz JSON validation & `source_chunk_id` grounding
- `test_sprint_scorer.py` — Frequency ranking, priority scoring, daily assignment
- `test_interviewer_state.py` — Difficulty escalation & pivot rules
- `test_grounding.py` — Document grounding integrity
- `test_deletion.py` — Cascade deletion across all models

---

## Production Deployment

### 1. Backend (Render Free Tier)
- Create a new **Web Service** on Render from this repository.
- Root Directory: `backend`
- Build Command: `pip install -r requirements.txt`
- Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Health Check Path: `/health`
- Set Environment Variables:
  - `GROQ_API_KEY`
  - `GEMINI_API_KEY`
  - `CORS_ORIGINS`: `https://frontend-six-omega-55.vercel.app`
  - `DATABASE_URL`: `sqlite:///./learnsync.db` (or your free Neon/Supabase PostgreSQL connection string)

### 2. Frontend (Vercel Free Tier)
- Import repository into Vercel.
- Root Directory: `frontend`
- Framework Preset: **Next.js**
- Set Environment Variable:
  - `NEXT_PUBLIC_API_URL`: `https://learnsync-api.onrender.com` (your Render backend URL)

> **Note on Free Tier Cold Starts:** Render's free tier sleeps after 15 minutes of inactivity and takes ~30–60 seconds to wake up. The frontend includes automatic background pre-warming via `/health` and a non-intrusive status indicator when waking up.
