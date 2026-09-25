from types import SimpleNamespace
from unittest.mock import AsyncMock
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import get_db
from app.core.deps import get_current_principal
from app.repositories import patient_repo
BASE={'water':'1-2L','urination':'4-6','headache':'no','dizziness':'no','fatigue':'rarely','vision':'no','salt':'moderate','wounds':'no','neck_patches':'no','breathlessness':'no'}

@pytest.fixture
def api(monkeypatch):
    principal={'role':'asha','asha_id':'worker','village_code':'v1'}
    db=SimpleNamespace(screening_intakes=SimpleNamespace(insert_one=AsyncMock(),find_one=AsyncMock(return_value=None)),care_plans=SimpleNamespace(find_one=AsyncMock(return_value=None),update_one=AsyncMock()))
    monkeypatch.setattr(patient_repo,'get_patient_raw',AsyncMock(return_value={'_id':'p1','local_id':'local-p1','village_code':'v1','district_code':'d1'}))
    app.dependency_overrides[get_db]=lambda:db
    app.dependency_overrides[get_current_principal]=lambda:principal
    yield TestClient(app),db,principal
    app.dependency_overrides.clear()

def test_intake_stored_without_fake_risk_and_requires_all_ten(api):
    c,db,_=api
    r=c.post('/measurements/screening/intake',json={'patient_id':'p1','answers':BASE})
    assert r.status_code==200,r.text
    assert r.json()['data']['priority']['clinical_risk_score'] is None
    assert r.json()['data']['patient_id']=='local-p1'
    assert db.screening_intakes.insert_one.await_count==1
    r=c.post('/measurements/screening/intake',json={'patient_id':'p1','answers':{}})
    assert r.status_code==422 and db.screening_intakes.insert_one.await_count==1

def test_intake_scope_and_roles(api):
    c,db,p=api
    p['village_code']='other'
    assert c.post('/measurements/screening/intake',json={'patient_id':'p1','answers':BASE}).status_code==403
    p.update(role='patient',patient_id='p1')
    assert c.post('/measurements/screening/intake',json={'patient_id':'p1','answers':BASE}).status_code==403
    db.screening_intakes.insert_one.assert_not_awaited()

def test_only_authorized_doctor_records_conditions(api):
    c,db,p=api
    path='/measurements/screening/care-plan/p1'
    assert c.post(path,json={'conditions':['diabetes']}).status_code==403
    p.clear();p.update(role='doctor',doctor_id='doc',district_code='other')
    assert c.post(path,json={'conditions':['diabetes']}).status_code==403
    p['district_code']='d1'
    r=c.post(path,json={'conditions':['diabetes']})
    assert r.status_code==200 and r.json()['data']['recorded_by']=='doc'
    assert c.post(path,json={'conditions':['inferred_from_ppg']}).status_code==422
    db.care_plans.update_one.assert_awaited_once()

def test_patient_reads_only_own_care_plan(api):
    c,db,p=api
    p.clear();p.update(role='patient',patient_id='other')
    assert c.get('/measurements/screening/care-plan/p1').status_code==403
    p['patient_id']='p1'
    assert c.get('/measurements/screening/care-plan/p1').json()['data']['conditions']==[]

