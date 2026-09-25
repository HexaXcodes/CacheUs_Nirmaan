from copy import deepcopy
from types import SimpleNamespace
from unittest.mock import AsyncMock
import httpx
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.config import settings
from app.database import get_db
from app.core.deps import get_current_principal
from app.repositories import patient_repo
from app.services import ppg
from device_simulator import build_payload

class Collection:
    def __init__(self): self.docs = []
    async def insert_one(self, doc): self.docs.append(deepcopy(doc))
    def find(self, query, projection):
        self.selected = [d for d in self.docs if d['patient_id'] in query['patient_id']['$in']]
        return self
    def sort(self, order):
        self.selected.sort(key=lambda d: (d['recorded_at'], d['id']), reverse=True)
        return self
    def skip(self, n): self.selected = self.selected[n:]; return self
    def limit(self, n): self.selected = self.selected[:n]; return self
    async def to_list(self, length): return deepcopy(self.selected[:length])

@pytest.fixture
def api(monkeypatch):
    collection = Collection()
    principal = {'role': 'patient', 'patient_id': 'cloud-p1'}
    app.dependency_overrides[get_db] = lambda: SimpleNamespace(measurements=collection)
    app.dependency_overrides[get_current_principal] = lambda: principal
    monkeypatch.setattr(patient_repo, 'get_patient_raw', AsyncMock(return_value={
        '_id': 'cloud-p1', 'local_id': 'p1', 'village_code': 'v1', 'district_code': 'd1'}))
    monkeypatch.setattr(settings, 'APP_ENV', 'dev')
    monkeypatch.setattr(settings, 'PPG_ALLOW_FIXTURES', True)
    yield TestClient(app), collection, principal
    app.dependency_overrides.clear()

def reference(kind='bp'):
    base = {'patient_id': 'p1', 'recorded_at': '2026-01-01T10:00:00+05:30',
            'metadata': {'source': 'manual_reference', 'device_id': 'cuff', 'description': 'Reference device'}}
    return {**base, **({'systolic': 120, 'diastolic': 80, 'unit': 'mmHg'} if kind == 'bp' else
                      {'value': 95, 'unit': 'mg/dL', 'context': 'fasting'})}

def test_reference_and_glucose(api):
    client, store, _ = api
    for path, body in [('bp/reference', reference()), ('glucose', reference('glucose'))]:
        r = client.post('/measurements/' + path, json=body)
        assert r.status_code == 200, r.text
        assert r.json()['data']['analysis'] is None
        assert r.json()['data']['patient_id'] == 'p1'
        assert r.json()['data']['recorded_at'] == '2026-01-01T04:30:00Z'
    assert len(store.docs) == 2

@pytest.mark.parametrize('patch', [{'systolic': 70}, {'unit': 'kPa'}, {'diastolic': -1},
                                  {'recorded_at': '2026-01-01'}, {'extra': 1}])
def test_invalid_reference(api, patch):
    client, store, _ = api
    assert client.post('/measurements/bp/reference', json={**reference(), **patch}).status_code == 422
    assert not store.docs

@pytest.mark.parametrize('principal,code', [({'role': 'patient', 'patient_id': 'other'}, 403),
    ({'role': 'asha', 'village_code': 'v1'}, 200), ({'role': 'asha', 'village_code': 'v2'}, 403),
    ({'role': 'doctor', 'district_code': 'd1'}, 200), ({'role': 'doctor'}, 403)])
def test_authorization(api, principal, code):
    client, _, identity = api
    identity.clear(); identity.update(principal)
    assert client.post('/measurements/bp/reference', json=reference()).status_code == code
    assert client.get('/measurements/p1').status_code == code
    assert client.get('/measurements/p1/trends').status_code == code

@pytest.mark.parametrize('fixture,status,bp', [('good','accepted',False), ('hr_only','accepted',False),
                                            ('poor','rejected',False), ('experimental','accepted',True)])
def test_simulator(api, fixture, status, bp):
    client, store, _ = api
    response = client.post('/measurements/bp/ppg', json=build_payload('p1', fixture))
    assert response.status_code == 200, response.text
    row = response.json()['data']
    assert row['status'] == status and row['mock'] and row['metadata']['synthetic']
    assert bool(row['analysis']['experimental_bp']) == bp
    assert 'samples' not in store.docs[0]
    if status == 'rejected':
        assert row['analysis']['retry_reason']
        assert client.get('/measurements/p1/trends').json()['data']['series'] == []

def test_failures_and_gating(api, monkeypatch):
    client, store, _ = api
    assert client.post('/measurements/bp/ppg', json=build_payload('p1', 'unavailable')).status_code == 503
    monkeypatch.setattr(settings, 'PPG_ALLOW_FIXTURES', False)
    assert client.post('/measurements/bp/ppg', json=build_payload('p1', 'good')).status_code == 403
    monkeypatch.setattr(settings, 'PPG_ML_URL', '')
    assert client.post('/measurements/bp/ppg', json=build_payload('p1')).status_code == 503
    assert not store.docs

def test_bounds_and_provenance(api):
    client, store, _ = api
    body = build_payload('p1', 'good')
    body['metadata']['source'] = 'physical_sensor'
    assert client.post('/measurements/bp/ppg', json=body).status_code == 422
    body = build_payload('p1'); body['samples'] = [0] * 12001
    assert client.post('/measurements/bp/ppg', json=body).status_code == 422
    assert client.post('/measurements/bp/ppg', content=b' ' * 262145).status_code == 413
    assert not store.docs

def test_history_series(api):
    client, _, _ = api
    client.post('/measurements/bp/reference', json=reference())
    client.post('/measurements/glucose', json=reference('glucose'))
    client.post('/measurements/bp/ppg', json=build_payload('p1', 'experimental'))
    first = client.get('/measurements/cloud-p1?limit=2').json()['data']
    second = client.get('/measurements/p1?offset=2&limit=2').json()['data']
    assert first['has_more'] and len(second['items']) == 1
    assert not set(x['id'] for x in first['items']) & set(x['id'] for x in second['items'])
    series = client.get('/measurements/p1/trends').json()['data']['series']
    assert len(series) == 3
    assert any('mock' in x['key'] for x in series)

@pytest.mark.parametrize('mode,code', [('hr',200), ('bp',200), ('poor',200), ('bad',502), ('timeout',503), ('oversize',502)])
def test_upstream_adapter_with_http_double(api, monkeypatch, mode, code):
    client, store, _ = api
    monkeypatch.setattr(settings, 'PPG_ML_URL', 'http://ml')
    async def handler(request):
        import json
        body = json.loads(request.content)
        assert 'patient_id' not in body and 'fixture' not in body
        if mode == 'timeout': raise httpx.ReadTimeout('timeout')
        if mode == 'oversize': return httpx.Response(200, content=b'x' * 17000)
        result = {'contract_version': '1', 'quality_score': 0.9, 'acceptable': True,
                  'heart_rate_bpm': 72, 'model': 'test-model', 'model_version': '1'}
        if mode == 'bp': result['experimental_bp'] = {'systolic': 120, 'diastolic': 80}
        if mode in ('poor', 'bad'):
            result.update(acceptable=False, retry_reason='Motion')
            if mode == 'bad': result['experimental_bp'] = {'systolic': 120, 'diastolic': 80}
        return httpx.Response(200, json=result)
    original = httpx.AsyncClient
    monkeypatch.setattr(ppg.httpx, 'AsyncClient', lambda **kwargs: original(transport=httpx.MockTransport(handler), **kwargs))
    response = client.post('/measurements/bp/ppg', json=build_payload('p1'))
    assert response.status_code == code, response.text
    assert len(store.docs) == (1 if code == 200 else 0)

def test_missing_auth(api):
    client, _, _ = api
    del app.dependency_overrides[get_current_principal]
    assert client.get('/measurements/p1').status_code == 401

def test_storage_failure_and_missing_patient(api, monkeypatch):
    from pymongo.errors import ConnectionFailure
    client, store, _ = api
    store.insert_one = AsyncMock(side_effect=ConnectionFailure())
    response = client.post('/measurements/glucose', json=reference('glucose'))
    assert response.status_code == 503 and not response.json()['success']
    monkeypatch.setattr(patient_repo, 'get_patient_raw', AsyncMock(return_value=None))
    assert client.get('/measurements/missing').status_code == 404

def test_production_fixtures_disabled(api, monkeypatch):
    client, store, _ = api
    monkeypatch.setattr(settings, 'APP_ENV', 'prod')
    assert client.post('/measurements/bp/ppg', json=build_payload('p1', 'experimental')).status_code == 403
    assert not store.docs

@pytest.mark.parametrize('patch', [{'value': -1}, {'unit': 'mmHg'}, {'context': 'diagnosed'},
                                  {'value': 112, 'unit': 'mmol/L'}])
def test_invalid_glucose(api, patch):
    client, _, _ = api
    assert client.post('/measurements/glucose', json={**reference('glucose'), **patch}).status_code == 422

def test_stored_waveform_file_contract(api, tmp_path):
    import json
    body = build_payload('p1')
    for key in ('patient_id', 'recorded_at', 'fixture'): body.pop(key)
    body['metadata'].update(synthetic=False, description='Locally recorded test sample')
    path = tmp_path / 'waveform.json'
    path.write_text(json.dumps(body))
    loaded = build_payload('p1', path=path)
    assert loaded['metadata']['source'] == 'dataset_simulator'
    assert not loaded['metadata']['synthetic'] and loaded['fixture'] is None

def test_oversized_response_keeps_cors(api):
    client, _, _ = api
    origin = settings.cors_origins_list[0]
    response = client.post('/measurements/bp/ppg', content=b' ' * 262145,
                           headers={'Origin': origin})
    assert response.status_code == 413
    assert response.headers.get('access-control-allow-origin') == origin
    assert response.json()['success'] is False

@pytest.mark.parametrize('value', [True, '95'])
def test_glucose_requires_json_number(api, value):
    client, store, _ = api
    response = client.post('/measurements/glucose', json={**reference('glucose'), 'value': value})
    assert response.status_code == 422
    assert not store.docs

def test_waveform_requires_json_numbers(api):
    client, store, _ = api
    body = build_payload('p1', 'good')
    body['samples'][10] = True
    assert client.post('/measurements/bp/ppg', json=body).status_code == 422
    assert not store.docs

def test_ambiguous_write_failure_does_not_claim_unsaved(api):
    from pymongo.errors import AutoReconnect
    client, store, _ = api
    async def lost_acknowledgement(doc):
        store.docs.append(deepcopy(doc))
        raise AutoReconnect('Acknowledgement lost')
    store.insert_one = lost_acknowledgement
    response = client.post('/measurements/glucose', json=reference('glucose'))
    assert response.status_code == 503
    assert 'could not be confirmed' in response.json()['error']
    assert len(store.docs) == 1

def test_trends_order_subseconds_and_exclude_other_patient(api):
    client, store, _ = api
    for timestamp in ['2026-01-01T04:30:00.001Z', '2026-01-01T10:00:00+05:30']:
        response = client.post('/measurements/bp/reference', json={**reference(), 'recorded_at': timestamp})
        assert response.status_code == 200
    other = deepcopy(store.docs[0]); other['patient_id'] = 'other-patient'
    store.docs.append(other)
    history = client.get('/measurements/p1').json()['data']['items']
    points = client.get('/measurements/p1/trends').json()['data']['series'][0]['points']
    assert len(history) == len(points) == 2
    assert history[0]['recorded_at'] == points[-1]['recorded_at'] == '2026-01-01T04:30:00.001000Z'
    assert points[0]['recorded_at'] == '2026-01-01T04:30:00Z'
