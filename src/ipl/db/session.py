"""SQLAlchemy session factory + a CLI hook for `ipl-init-db`."""
from __future__ import annotations

from collections.abc import Iterator
from contextlib import contextmanager

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from ipl.config import DATA_DIR, settings
from ipl.db.models import Base

DATA_DIR.mkdir(parents=True, exist_ok=True)

engine = create_engine(
    settings.ipl_db_url,
    echo=False,
    future=True,
    connect_args={"check_same_thread": False} if settings.ipl_db_url.startswith("sqlite") else {},
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


def init_db() -> None:
    Base.metadata.create_all(engine)


@contextmanager
def get_session() -> Iterator[Session]:
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def cli_init() -> None:
    init_db()
    print(f"Initialised schema at {settings.ipl_db_url}")


if __name__ == "__main__":
    cli_init()
