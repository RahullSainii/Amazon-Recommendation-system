import copy
from datetime import datetime, timezone

from sqlalchemy import DateTime, Integer, String, Text, create_engine, select
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker

from config import Config


class Base(DeclarativeBase):
    pass


class AppDocument(Base):
    __tablename__ = "app_documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    collection_name: Mapped[str] = mapped_column(String(80), index=True, nullable=False)
    payload: Mapped[dict] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


class PostgresDatabase:
    """
    Transition-friendly Postgres adapter.

    It preserves the existing document-style database API so the app can move
    off local JSON storage first, then normalize into relational tables next.
    """

    def __init__(self, database_url: str):
        self.database_url = self._normalize_database_url(database_url)
        self.engine = None
        self.SessionLocal = None
        self.init_error = None

        if database_url:
            try:
                self.engine = create_engine(
                    self.database_url,
                    future=True,
                    pool_pre_ping=True,
                )
                self.SessionLocal = sessionmaker(bind=self.engine, future=True, expire_on_commit=False)
                Base.metadata.create_all(self.engine)
            except Exception as exc:
                self.init_error = exc
                self.engine = None
                self.SessionLocal = None

    @staticmethod
    def _normalize_database_url(database_url: str) -> str:
        if not database_url:
            return database_url
        if database_url.startswith("postgresql://"):
            return database_url.replace("postgresql://", "postgresql+psycopg://", 1)
        if database_url.startswith("postgres://"):
            return database_url.replace("postgres://", "postgresql+psycopg://", 1)
        return database_url

    def _session(self) -> Session:
        if self.SessionLocal is None:
            if self.init_error is not None:
                raise RuntimeError(
                    f"Postgres database initialization failed. Check DATABASE_URL. {self.init_error}"
                ) from self.init_error
            raise RuntimeError("Postgres database is not configured. Set DATABASE_URL.")
        return self.SessionLocal()

    @staticmethod
    def _matches(document: dict, query: dict | None = None) -> bool:
        if not query:
            return True
        return all(document.get(key) == value for key, value in query.items())

    @staticmethod
    def _clone(document: dict) -> dict:
        return copy.deepcopy(document)

    def get_collection(self, collection_name):
        return self.find(collection_name)

    def insert_many(self, collection_name, documents):
        with self._session() as session:
            session.add_all(
                [AppDocument(collection_name=collection_name, payload=self._clone(document)) for document in documents]
            )
            session.commit()
        return len(documents)

    def insert_one(self, collection_name, document):
        with self._session() as session:
            record = AppDocument(collection_name=collection_name, payload=self._clone(document))
            session.add(record)
            session.commit()
        return document

    def delete_many(self, collection_name, query=None):
        query = query or {}
        with self._session() as session:
            rows = session.execute(
                select(AppDocument).where(AppDocument.collection_name == collection_name)
            ).scalars().all()
            matches = [row for row in rows if self._matches(row.payload, query)]
            for row in matches:
                session.delete(row)
            session.commit()
        return len(matches)

    def find(self, collection_name, query=None, limit=0):
        query = query or {}
        with self._session() as session:
            rows = session.execute(
                select(AppDocument)
                .where(AppDocument.collection_name == collection_name)
                .order_by(AppDocument.id.asc())
            ).scalars().all()
            results = [self._clone(row.payload) for row in rows if self._matches(row.payload, query)]
        return results[:limit] if limit else results

    def find_one(self, collection_name, query=None):
        results = self.find(collection_name, query=query or {}, limit=1)
        return results[0] if results else None

    def update_one(self, collection_name, query, update):
        with self._session() as session:
            rows = session.execute(
                select(AppDocument)
                .where(AppDocument.collection_name == collection_name)
                .order_by(AppDocument.id.asc())
            ).scalars().all()
            target = next((row for row in rows if self._matches(row.payload, query)), None)
            if target is None:
                return False

            payload = self._clone(target.payload)
            if "$set" in update and isinstance(update["$set"], dict):
                payload.update(update["$set"])
            else:
                payload.update(update)

            target.payload = payload
            target.updated_at = datetime.now(timezone.utc)
            session.commit()
        return True


db = PostgresDatabase(Config.DATABASE_URL)
