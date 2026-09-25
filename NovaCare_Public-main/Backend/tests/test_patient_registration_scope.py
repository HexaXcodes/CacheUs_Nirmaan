from types import SimpleNamespace
from unittest.mock import AsyncMock
import pytest
from app.core.responses import AppError
from app.routers.patients import create_patient
from app.repositories import patient_repo
from app.schemas.patient import PatientCreate

@pytest.mark.asyncio
async def test_rejects_registration_outside_worker_village(monkeypatch):
    create = AsyncMock()
    monkeypatch.setattr(patient_repo, 'create_patient', create)
    with pytest.raises(AppError):
        await create_patient(PatientCreate(phone='9990000991', village_code='KA001'),
                             SimpleNamespace(), {'role':'asha','village_code':'DEV_VILLAGE'})
    create.assert_not_awaited()

@pytest.mark.asyncio
async def test_dedup_cannot_reassign_another_villages_patient(monkeypatch):
    monkeypatch.setattr(patient_repo,'find_by_phone_hash',AsyncMock(return_value={'_id':'p1','village_code':'OTHER'}))
    update=AsyncMock()
    monkeypatch.setattr(patient_repo,'update_patient',update)
    with pytest.raises(AppError):
        await create_patient(PatientCreate(phone='9990000991',village_code='DEV_VILLAGE'),
                             SimpleNamespace(),{'role':'asha','village_code':'DEV_VILLAGE'})
    update.assert_not_awaited()

@pytest.mark.asyncio
async def test_matching_village_registration_remains_available(monkeypatch):
    monkeypatch.setattr(patient_repo,'find_by_phone_hash',AsyncMock(return_value=None))
    create=AsyncMock(return_value={'id':'p1','village_code':'DEV_VILLAGE'})
    monkeypatch.setattr(patient_repo,'create_patient',create)
    await create_patient(PatientCreate(phone='9990000991',village_code='DEV_VILLAGE'),
                         SimpleNamespace(),{'role':'asha','village_code':'DEV_VILLAGE'})
    create.assert_awaited_once()

@pytest.mark.asyncio
async def test_old_session_scope_resolves_missing_district(monkeypatch):
    from app.routers.auth import asha_scope
    from app.repositories import misc_repo
    from app.config import settings
    monkeypatch.setattr(settings, 'APP_ENV', 'dev')
    monkeypatch.setattr(misc_repo, 'get_asha', AsyncMock(return_value=None))
    result = await asha_scope(SimpleNamespace(), {'role':'asha','asha_id':'test','village_code':'DEV_VILLAGE'})
    assert result['data'] == {'village_code':'DEV_VILLAGE','district_code':'DEV_DISTRICT'}
