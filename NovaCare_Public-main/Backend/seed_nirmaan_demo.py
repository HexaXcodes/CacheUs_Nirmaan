"""Create isolated, clearly synthetic Nirmaan demo accounts via local APIs."""
import json
from datetime import datetime, timezone, timedelta
import httpx
from pymongo import MongoClient
from app.config import settings
from app.core.security import hash_password

assert settings.APP_ENV == 'dev' and settings.SMS_PROVIDER == 'mock', 'Demo seeding requires local dev and mock SMS'
db=MongoClient(settings.MONGO_URI)['novacare_review']
ASHA='NOVACARE-DEMO-24'; PIN='4826'; EMAIL='novacare.demo@example.com'; PASSWORD='NovaCareDemo!24'
for collection,query,values in [
    (db.asha_workers,{'asha_id':ASHA},{'name':'DEMO ASHA','pin_hash':hash_password(PIN),'village_code':'DEMO_NIRMAAN_24','district_code':'DEMO_DISTRICT_24'}),
    (db.doctors,{'email':EMAIL},{'name':'DEMO Doctor','password_hash':hash_password(PASSWORD),'district_code':'DEMO_DISTRICT_24'})]:
    old=collection.find_one(query)
    assert old is None or old.get('demo_fixture')=='nirmaan-20260924', 'Refusing to overwrite a non-demo account'
    collection.update_one(query,{'$setOnInsert':{**query,**values,'demo_fixture':'nirmaan-20260924'}},upsert=True)
base='http://localhost:8020'
a=httpx.Client(base_url=base,timeout=30);d=httpx.Client(base_url=base,timeout=30)
def post(c,path,body):
    r=c.post(path,json=body);r.raise_for_status();return r.json()['data']
al=post(a,'/auth/asha/login',{'asha_id':ASHA,'pin':PIN});dl=post(d,'/auth/doctor/login',{'email':EMAIL,'password':PASSWORD})
assert al['name']=='DEMO ASHA' and dl['name']=='DEMO Doctor','Live API points to another database; stop here'
a.headers['Authorization']='Bearer '+al['access_token'];d.headers['Authorization']='Bearer '+dl['access_token']
answers={'water':'1-2L','urination':'4-6','headache':'no','dizziness':'no','fatigue':'rarely','vision':'no','salt':'moderate','wounds':'no','neck_patches':'no','breathlessness':'no'}
records=[]
for i,(label,conditions) in enumerate([('Hypertension only',['hypertension']),('Diabetes only',['diabetes']),('Both conditions',['hypertension','diabetes']),('No recorded condition',[])],1):
    phone=f'900000240{i}'
    p=post(a,'/patients/',{'name':'DEMO — '+label,'phone':phone,'age':40+i*5,'sex':'female' if i%2 else 'male','village_code':'DEMO_NIRMAAN_24','district_code':'DEMO_DISTRICT_24','local_id':f'nirmaan-demo-24-{i}'})
    pid=p['id'];post(d,'/measurements/screening/care-plan/'+pid,{'conditions':conditions})
    # Fixed fixture identifier avoids duplicating screening/history on reruns.
    existing=db.screening_intakes.find_one({'patient_id':f'nirmaan-demo-24-{i}','demo_fixture':'nirmaan-20260924'})
    if not existing:
        selected={**answers,**({'headache':'sometimes'} if i==1 else {'fatigue':'daily','vision':'occasional'} if i==2 else {'headache':'yes','fatigue':'daily','urination':'>9'} if i==3 else {})}
        intake=post(a,'/measurements/screening/intake',{'patient_id':pid,'answers':selected})
        db.screening_intakes.update_one({'id':intake['id']},{'$set':{'demo_fixture':'nirmaan-20260924'}})
        from device_simulator import build_payload
        body=build_payload(pid,'hr_only');body['metadata']['screening_id']=intake['id'];post(a,'/measurements/bp/ppg',body)
    # Synthetic reference histories are fixture records, not accepted as real
    # device readings through the measurement API. Never disable that guard.
    for day in range(3):
        for condition,kind,extra in [('hypertension','bp_reference',{'systolic':132+day*2,'diastolic':84+day,'unit':'mmHg'}),('diabetes','glucose',{'value':110+day*3,'unit':'mg/dL','context':'fasting'})]:
            if condition not in conditions:continue
            now=datetime.now(timezone.utc)
            fixture_id=f'demo24-{i}-{kind}-{day}'
            from app.schemas.measurement import Measurement
            fixture=Measurement(id=fixture_id,patient_id=f'nirmaan-demo-24-{i}',kind=kind,status='recorded',mock=True,recorded_at=now-timedelta(days=day),received_at=now,metadata={'source':'manual_reference','device_id':'DEMO-FIXTURE','description':'SYNTHETIC DEMO RECORD — not a real measurement','synthetic':True},**extra).model_dump(mode='json')
            fixture['recorded_at']=(now-timedelta(days=day)).isoformat(timespec='microseconds').replace('+00:00','Z')
            db.measurements.update_one({'id':fixture_id},{'$setOnInsert':fixture},upsert=True)
    records.append({'name':p['name'],'phone':phone,'patient_id':pid,'local_id':f'nirmaan-demo-24-{i}','conditions':conditions})
print(json.dumps({'asha':{'id':ASHA,'pin':PIN},'doctor':{'email':EMAIL,'password':PASSWORD,'id':dl['doctor_id']},'patients':records},indent=2))


