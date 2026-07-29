"""SQLAlchemy declarative base (shared metadata for Alembic + models)."""
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Import all models via models so Base.metadata is complete for migrations."""

    pass
