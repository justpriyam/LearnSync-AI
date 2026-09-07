from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.core.config import settings

def get_engine_and_url():
    url = settings.DATABASE_URL
    # Fix Heroku/Render legacy postgres:// prefix for SQLAlchemy 2.0
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)

    connect_args = {}
    engine_kwargs = {}

    if url.startswith("sqlite"):
        connect_args["check_same_thread"] = False
    else:
        # Postgres connection pooling resilience for serverless/cloud DBs
        engine_kwargs["pool_pre_ping"] = True
        engine_kwargs["pool_recycle"] = 300

    engine = create_engine(url, connect_args=connect_args, **engine_kwargs)
    return engine, url

engine, _ = get_engine_and_url()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    Base.metadata.create_all(bind=engine)
