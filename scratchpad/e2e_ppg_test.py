import json, sys
sys.path.insert(0, r"C:\Users\Aadvik Gowda\OneDrive\Desktop\sihbackup\NovaCare_Public-main\Backend")
import httpx
from pymongo import MongoClient
from app.config import settings
from app.core.security import hash_password

db = MongoClient(settings.MONGO_URI)[settings.MONGO_DB]
ASHA = 'E2E-UNO-TEST'; PIN = '1234'
db.asha_workers.delete_one({'asha_id': ASHA})
db.asha_workers.insert_one({'asha_id': ASHA, 'name': 'E2E Uno Test', 'pin_hash': hash_password(PIN),
                            'village_code': 'E2E_VILLAGE', 'district_code': 'E2E_DISTRICT'})

base = 'http://127.0.0.1:8021'
c = httpx.Client(base_url=base, timeout=30)
def post(path, body):
    r = c.post(path, json=body)
    if r.status_code >= 400:
        print('ERROR', path, r.status_code, r.text)
        r.raise_for_status()
    return r.json()['data']

login = post('/auth/asha/login', {'asha_id': ASHA, 'pin': PIN})
c.headers['Authorization'] = 'Bearer ' + login['access_token']

patient = post('/patients/', {'name': 'E2E Uno Test Patient', 'phone': '9000001234', 'age': 45, 'sex': 'male',
                               'village_code': 'E2E_VILLAGE', 'district_code': 'E2E_DISTRICT', 'local_id': 'e2e-uno-test-patient'})
pid = patient['id']
print('patient', pid)

answers = {'water':'1-2L','urination':'4-6','headache':'no','dizziness':'no','fatigue':'rarely',
           'vision':'no','salt':'moderate','wounds':'no','neck_patches':'no','breathlessness':'no'}
intake = post('/measurements/screening/intake', {'patient_id': pid, 'answers': answers})
sid = intake['id']
print('screening', sid)

segment = json.load(open(r"C:\Users\Aadvik Gowda\OneDrive\Desktop\sihbackup\ppg_dataset\ppg_ready\bidmc_02_segment_1.json"))
segment.pop('_reference', None)
from datetime import datetime, timezone
payload = {**segment, 'patient_id': pid, 'recorded_at': datetime.now(timezone.utc).isoformat(), 'fixture': None,
           'metadata': {**segment['metadata'], 'source': 'dataset_simulator', 'synthetic': True,
                        'device_id': 'arduino-uno-finger-trigger',
                        'description': f"Dataset replay — not measured from the current finger. Original segment: {segment['metadata']['description']}"[:200],
                        'screening_id': sid}}
result = post('/measurements/bp/ppg', payload)
print(json.dumps(result, indent=2))

# cleanup
db.measurements.delete_many({'patient_id': pid})
db.screening_intakes.delete_many({'patient_id': pid})
db.patients.delete_many({'local_id': 'e2e-uno-test-patient'})
db.asha_workers.delete_one({'asha_id': ASHA})
print('cleaned up')
