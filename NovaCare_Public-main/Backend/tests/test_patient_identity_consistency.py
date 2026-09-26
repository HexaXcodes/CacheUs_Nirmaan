"""
Regression tests for patient-identity resolution consistency between the
SQLite-first fresh-insert path (`create_patient`, returns `local_id` as `id`)
and the dedupe-by-phone re-registration path.

All fixture data uses a clearly-marked test phone hash / local_id prefix
(`FIXTURE-...`) and an isolated throwaway SQLite file (via the same
`db_setup` fixture/mock-Mongo convention already used in
test_sqlite_sync.py). No real dev DB or clinical data is touched.
"""
import os
import pytest
from unittest.mock import patch
from sqlalchemy import delete

from app.config import settings
from app.database import connect_sqlite, close_sqlite, get_sql_sessionmaker
from app.models.sqlite_models import SqlPatient, SqlScreening, SqlSyncQueue
from app.repositories import patient_repo, session_repo
from app.services.sync_worker import sync_once

from tests.test_sqlite_sync import MockMongoCollection, MockMongoDatabase

FIXTURE_PHONE_HASH = "FIXTURE-repro-phone-hash-0001"
FIXTURE_LOCAL_ID = "FIXTURE-repro-patient-local-id"


class _Cursor:
    def __init__(self, records):
        self._records = records

    def sort(self, *args, **kwargs):
        return self

    async def to_list(self, length=None):
        return self._records


class QueryableMockMongoCollection(MockMongoCollection):
    """Adds the minimal `find()` support list_for_patient() needs on top of
    the existing find_one/insert_one/replace_one mock used elsewhere."""

    def _matches(self, r, query):
        for k, v in query.items():
            if isinstance(v, dict) and "$in" in v:
                if r.get(k) not in v["$in"]:
                    return False
            elif r.get(k) != v:
                return False
        return True

    def find(self, query):
        return _Cursor([r for r in self.records if self._matches(r, query)])


class QueryableMockMongoDatabase(MockMongoDatabase):
    def __init__(self):
        self.patients = QueryableMockMongoCollection()
        self.sessions = QueryableMockMongoCollection()


@pytest.fixture
async def db_setup():
    settings.SQLITE_URL = "sqlite+aiosqlite:///./test_identity_temp.db"
    mock_db = MockMongoDatabase()

    with patch("app.database.connect_mongo", return_value=None), \
         patch("app.database.close_mongo", return_value=None), \
         patch("app.database.get_db", return_value=mock_db):
        await connect_sqlite()
        yield mock_db
        await close_sqlite()

    for suffix in ["", "-journal", "-wal", "-shm"]:
        path = f"./test_identity_temp.db{suffix}"
        if os.path.exists(path):
            try:
                os.remove(path)
            except Exception:
                pass


@pytest.mark.asyncio
async def test_fresh_create_id_is_stable_across_sync(db_setup):
    """Fresh creation returns a stable id that does not drift once the
    background sync worker assigns the record a Mongo cloud_id."""
    db = db_setup

    created = await patient_repo.create_patient(
        db,
        {
            "local_id": FIXTURE_LOCAL_ID,
            "phone_hash": FIXTURE_PHONE_HASH,
            "name": "Fixture Patient",
            "village_code": "FIXTURE_VIL",
        },
    )
    id_a = created["id"]
    assert id_a == FIXTURE_LOCAL_ID

    with patch("app.services.sync_worker.get_db", return_value=db):
        await sync_once()

    sessionmaker = get_sql_sessionmaker()
    async with sessionmaker() as session:
        p = await session.get(SqlPatient, FIXTURE_LOCAL_ID)
        assert p.cloud_id is not None  # sync did assign a cloud id...

    fetched = await patient_repo.get_patient(db, id_a)
    assert fetched["id"] == id_a  # ...but the reported `id` did not change


@pytest.mark.asyncio
async def test_dedupe_reregistration_returns_same_id_as_fresh_create(db_setup):
    """
    If the same phone number is "re-registered" from a device/session that
    only sees the record via its Mongo mirror (e.g. after the local SQLite
    row is unavailable), the dedupe-by-phone path must resolve to the SAME
    canonical id that the original fresh creation returned -- not the raw
    Mongo `_id`/cloud_id.
    """
    db = db_setup

    created = await patient_repo.create_patient(
        db,
        {
            "local_id": FIXTURE_LOCAL_ID,
            "phone_hash": FIXTURE_PHONE_HASH,
            "name": "Fixture Patient",
            "village_code": "FIXTURE_VIL",
        },
    )
    id_a = created["id"]
    assert id_a == FIXTURE_LOCAL_ID

    # Push to Mongo so the record gets a cloud_id (simulates background sync).
    with patch("app.services.sync_worker.get_db", return_value=db):
        await sync_once()

    sessionmaker = get_sql_sessionmaker()
    async with sessionmaker() as session:
        p = await session.get(SqlPatient, FIXTURE_LOCAL_ID)
        assert p.cloud_id is not None
        cloud_id = p.cloud_id

    # Simulate a second device/session whose local SQLite has no row for this
    # patient yet (e.g. different device, or cache cleared) re-registering
    # against the same phone number. find_by_phone_hash falls through to the
    # shared Mongo mirror.
    async with sessionmaker() as session:
        await session.execute(delete(SqlPatient).where(SqlPatient.local_id == FIXTURE_LOCAL_ID))
        await session.execute(delete(SqlSyncQueue).where(SqlSyncQueue.entity_id == FIXTURE_LOCAL_ID))
        await session.commit()

    existing = await patient_repo.find_by_phone_hash(db, FIXTURE_PHONE_HASH)
    assert existing is not None
    existing_id = str(existing.get("local_id") or existing.get("_id", ""))  # mirrors app.routers.patients dedupe preference

    # existing_id is still resolved to the ORIGINAL local_id, not cloud_id,
    # even though the SQLite copy of the record was rebuilt from Mongo.
    print(f"id_a={id_a!r} existing_id={existing_id!r} cloud_id={cloud_id!r}")
    assert existing_id == id_a
    assert existing_id != cloud_id

    # Re-registration path (create_patient endpoint calls update_patient on
    # dedupe hit) returns the same canonical id too.
    updated = await patient_repo.update_patient(db, existing_id, {"age": 41})
    assert updated is not None
    id_b = updated["id"]
    assert id_b == id_a  # same person, same id -- no drift
    assert id_b != cloud_id


@pytest.mark.asyncio
async def test_downstream_linkage_survives_reregistration(db_setup_queryable):
    """
    A screening created against the original id must still resolve via
    get_patient/list_for_patient after the phone-based dedupe/re-registration
    path has run and the record has been rebuilt from its Mongo mirror.
    """
    db = db_setup_queryable

    created = await patient_repo.create_patient(
        db,
        {
            "local_id": FIXTURE_LOCAL_ID,
            "phone_hash": FIXTURE_PHONE_HASH,
            "name": "Fixture Patient",
            "village_code": "FIXTURE_VIL",
        },
    )
    id_a = created["id"]

    await session_repo.create_session(
        db,
        {
            "local_id": "FIXTURE-repro-screening-id",
            "patient_id": id_a,
            "village_code": "FIXTURE_VIL",
            "asha_id": "fixture-asha",
        },
    )

    with patch("app.services.sync_worker.get_db", return_value=db):
        await sync_once()

    sessionmaker = get_sql_sessionmaker()
    async with sessionmaker() as session:
        await session.execute(delete(SqlPatient).where(SqlPatient.local_id == FIXTURE_LOCAL_ID))
        await session.execute(delete(SqlSyncQueue).where(SqlSyncQueue.entity_id == FIXTURE_LOCAL_ID))
        await session.commit()

    existing = await patient_repo.find_by_phone_hash(db, FIXTURE_PHONE_HASH)
    existing_id = str(existing.get("local_id") or existing.get("_id", ""))  # mirrors app.routers.patients dedupe preference
    updated = await patient_repo.update_patient(db, existing_id, {"age": 41})
    id_b = updated["id"]
    assert id_b == id_a

    sessions = await session_repo.list_for_patient(db, id_b)
    found_ids = {s.get("local_id") for s in sessions}
    assert "FIXTURE-repro-screening-id" in found_ids


@pytest.fixture
async def db_setup_queryable():
    settings.SQLITE_URL = "sqlite+aiosqlite:///./test_identity_temp2.db"
    mock_db = QueryableMockMongoDatabase()

    with patch("app.database.connect_mongo", return_value=None), \
         patch("app.database.close_mongo", return_value=None), \
         patch("app.database.get_db", return_value=mock_db):
        await connect_sqlite()
        yield mock_db
        await close_sqlite()

    for suffix in ["", "-journal", "-wal", "-shm"]:
        path = f"./test_identity_temp2.db{suffix}"
        if os.path.exists(path):
            try:
                os.remove(path)
            except Exception:
                pass


@pytest.mark.asyncio
async def test_history_lookup_misses_synced_sessions_when_queried_by_local_id(db_setup_queryable):
    """
    Impact trace: app/repositories/session_repo.py list_for_patient() queries
    SQLite screenings by the *resolved* local patient id, but queries the
    Mongo `sessions` collection using the *raw, unresolved* patient_id it was
    called with. sync_worker._sync_patient/_sync_screening always store
    Mongo session docs keyed by the patient's cloud_id (see
    test_sqlite_sync.py::test_offline_first_flow, which asserts
    `mongo_sess["patient_id"] == str(mongo_patient["_id"])`).

    So once a screening has been synced to Mongo and the local SQLite copy of
    that screening is no longer present (a second device, a reinstalled app,
    or a pruned local cache -- any case where the caller only holds the
    patient's local_id but the session record now only lives server-side),
    GET /patients/{local_id}/history silently drops that session.
    """
    db = db_setup_queryable

    await patient_repo.create_patient(
        db,
        {
            "local_id": FIXTURE_LOCAL_ID,
            "phone_hash": FIXTURE_PHONE_HASH,
            "name": "Fixture Patient",
            "village_code": "FIXTURE_VIL",
        },
    )
    await session_repo.create_session(
        db,
        {
            "local_id": "FIXTURE-repro-screening-id",
            "patient_id": FIXTURE_LOCAL_ID,
            "village_code": "FIXTURE_VIL",
            "asha_id": "fixture-asha",
        },
    )

    with patch("app.services.sync_worker.get_db", return_value=db):
        await sync_once()

    # Sanity: Mongo really did store the session under the patient's cloud_id.
    mongo_patient = await db.patients.find_one({"local_id": FIXTURE_LOCAL_ID})
    mongo_sess = await db.sessions.find_one({"local_id": "FIXTURE-repro-screening-id"})
    assert mongo_sess["patient_id"] == str(mongo_patient["_id"])

    # Simulate the local SQLite screening copy being unavailable (e.g. a
    # different device / a pruned cache) while the patient row (and thus the
    # id the caller holds -- the local_id) is still known.
    sessionmaker = get_sql_sessionmaker()
    async with sessionmaker() as session:
        await session.execute(delete(SqlScreening).where(SqlScreening.local_screening_id == "FIXTURE-repro-screening-id"))
        await session.commit()

    results = await session_repo.list_for_patient(db, FIXTURE_LOCAL_ID)
    ids_found = {r.get("local_id") or r.get("id") for r in results}

    print(f"history results when queried by local_id: {ids_found}")
    assert "FIXTURE-repro-screening-id" in ids_found, (
        "list_for_patient() must resolve the patient's cloud_id and include "
        "it in the Mongo query, so a synced session is still visible even "
        "when the caller only holds the patient's local_id."
    )
