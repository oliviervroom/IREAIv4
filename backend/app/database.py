from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import settings

# Database URL from environment variable with fallback for local development
# DATABASE_URL = os.getenv(
#     'DATABASE_URL',
#     "postgresql://postgres:realestate123@real-estate-db.c4l4ceo4uqh8.us-east-1.rds.amazonaws.com:5432/real_estate",
#     "postgresql://heechulchoi@localhost:5432/real_estate"  # for local development
# )

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
