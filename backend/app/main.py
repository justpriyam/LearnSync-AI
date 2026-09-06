from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db
from app.routers import documents, courses, sprint, interview, deletion

app = FastAPI(title="LearnSync AI", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    init_db()

app.include_router(documents.router, prefix="", tags=["documents"])
app.include_router(courses.router, prefix="", tags=["courses"])
app.include_router(sprint.router, prefix="", tags=["sprint"])
app.include_router(interview.router, prefix="", tags=["interview"])
app.include_router(deletion.router, prefix="", tags=["admin"])
