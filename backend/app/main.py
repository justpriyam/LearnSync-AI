from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db
from app.config import settings
from app.routers import documents, courses, sprint, interview, deletion
from app.routers import auth as auth_router
from app.routers import dashboard as dashboard_router

app = FastAPI(title="LearnSync AI", version="0.2.0")

# CORS: allow Vercel deployments + localhost
_origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_origin_regex=r"^https:\/\/.*\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/health")
def health_check():
    return {"status": "ok"}


app.include_router(auth_router.router)
app.include_router(dashboard_router.router)
app.include_router(documents.router, prefix="", tags=["documents"])
app.include_router(courses.router, prefix="", tags=["courses"])
app.include_router(sprint.router, prefix="", tags=["sprint"])
app.include_router(interview.router, prefix="", tags=["interview"])
app.include_router(deletion.router, prefix="", tags=["admin"])
