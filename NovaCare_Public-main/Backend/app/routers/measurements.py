from datetime import datetime, timezone
from uuid import uuid4
from fastapi import APIRouter, Depends, Query
from pymongo.errors import PyMongoError
from app.core.deps import require_any, require_asha, require_doctor
from app.core.responses import AppError, Envelope, ok
from app.database import get_db
from app.repositories import patient_repo
from app.schemas.measurement import Glucose, ReferenceBP, PPG, Measurement, History, Trends
from app.schemas.measurement import ScreeningIntake, CarePlan
from app.services.screening_priority import review_priority
from app.services.ppg import analyze

router = APIRouter(prefix='/measurements', tags=['measurements'])

async def authorize(db, patient_id, principal):
    try:
        patient = await patient_repo.get_patient_raw(db, patient_id)
    except PyMongoError as exc:
        raise AppError('Patient storage unavailable', 503) from exc
    if not patient or patient.get('is_deleted'):
        raise AppError('Patient not found', 404)
    aliases = {str(patient.get('_id')), str(patient.get('local_id')), str(patient.get('cloud_id'))} - {'None', ''}
    role = principal.get('role')
    allowed = role == 'patient' and principal.get('patient_id') in aliases
    if role in ('asha', 'doctor'):
        field = 'village_code' if role == 'asha' else 'district_code'
        allowed = bool(principal.get(field)) and principal[field] == patient.get(field)
    if not allowed:
        raise AppError('Patient access denied', 403)
    return str(patient.get('local_id') or patient['_id']), aliases

async def save(db, body, principal, kind):
    received_at = datetime.now(timezone.utc)
    patient_id, _ = await authorize(db, body.patient_id, principal)
    if body.metadata.screening_id:
        intake = await db.screening_intakes.find_one({'id': body.metadata.screening_id, 'patient_id': patient_id})
        if kind != 'ppg' or not intake:
            raise AppError('Screening intake does not match this PPG measurement', 422)
    analysis = await analyze(body) if kind == 'ppg' else None
    fields = body.model_dump(exclude={'samples', 'sampling_rate_hz', 'sample_unit', 'contract_version', 'fixture'})
    fields.update(id=str(uuid4()), patient_id=patient_id, received_at=received_at,
                  kind=kind, status=('accepted' if analysis.acceptable else 'rejected') if analysis else 'recorded',
                  mock=bool(getattr(body, 'fixture', None)), analysis=analysis)
    record = Measurement(**fields)
    if kind == 'ppg':
        record.contract_version = body.contract_version
        record.sampling_rate_hz = body.sampling_rate_hz
        record.sample_unit = body.sample_unit
        record.sample_count = len(body.samples)
    # Reference and experimental values have distinct kinds and distinct fields.
    try:
        document = record.model_dump(mode='json')
        # Fixed-width UTC strings keep Mongo's lexical index order chronological.
        document['recorded_at'] = record.recorded_at.isoformat(timespec='microseconds').replace('+00:00', 'Z')
        await db.measurements.insert_one(document)
    except PyMongoError as exc:
        raise AppError('Measurement save could not be confirmed; check history before retrying', 503) from exc
    return ok(record)

@router.post('/glucose', response_model=Envelope[Measurement])
async def glucose(body: Glucose, db=Depends(get_db), principal=Depends(require_any)):
    return await save(db, body, principal, 'glucose')

@router.post('/screening/intake')
async def screening_intake(body: ScreeningIntake, db=Depends(get_db), principal=Depends(require_asha)):
    patient_id, _ = await authorize(db, body.patient_id, principal)
    patient = await patient_repo.get_patient_raw(db, body.patient_id)
    record = {'id': str(uuid4()), 'patient_id': patient_id, 'asha_id': principal.get('asha_id'),
              'questionnaire_version': 'yenapoya-intake-10-v1', 'answers': body.answers.model_dump(),
              'created_at': datetime.now(timezone.utc).isoformat()}
    record.update(district_code=patient.get('district_code'), village_code=patient.get('village_code'),
                  patient_name=patient.get('name'), priority=review_priority(record['answers']))
    try:
        await db.screening_intakes.insert_one(dict(record))
    except PyMongoError as exc:
        raise AppError('Unable to save questionnaire; retry before starting PPG', 503) from exc
    return ok(record)

@router.get('/screening/queue')
async def screening_queue(db=Depends(get_db), principal=Depends(require_doctor),
                          offset: int = Query(0, ge=0), limit: int = Query(30, ge=1, le=100)):
    district = principal.get('district_code')
    if not district:
        raise AppError('Doctor district assignment required', 403)
    try:
        records = await db.screening_intakes.aggregate([
            {'$match': {'district_code': district}},
            {'$sort': {'created_at': -1, 'id': -1}},
            {'$group': {'_id': '$patient_id', 'latest': {'$first': '$$ROOT'}}},
            {'$replaceRoot': {'newRoot': '$latest'}},
            {'$sort': {'priority.concern_count': -1, 'created_at': 1, 'id': 1}},
            {'$skip': offset}, {'$limit': limit + 1}, {'$project': {'_id': 0}},
        ]).to_list(length=limit+1)
        for row in records[:limit]:
            row['ppg'] = await db.measurements.find_one(
                {'patient_id': row['patient_id'], 'metadata.screening_id': row['id'], 'kind': 'ppg'},
                {'_id': 0}, sort=[('received_at', -1)])
    except PyMongoError as exc:
        raise AppError('Screening queue unavailable', 503) from exc
    return ok({'items': records[:limit], 'has_more': len(records)>limit})

@router.get('/screening/care-plan/{patient_id}')
async def care_plan(patient_id: str, db=Depends(get_db), principal=Depends(require_any)):
    canonical, _ = await authorize(db, patient_id, principal)
    record = await db.care_plans.find_one({'patient_id': canonical}, {'_id': 0})
    return ok(record or {'patient_id': canonical, 'conditions': []})

@router.post('/screening/care-plan/{patient_id}')
async def record_care_plan(patient_id: str, body: CarePlan, db=Depends(get_db), principal=Depends(require_doctor)):
    canonical, _ = await authorize(db, patient_id, principal)
    record = {'patient_id': canonical, 'conditions': sorted(set(body.conditions)),
              'recorded_by': principal.get('doctor_id') or principal.get('email'),
              'recorded_at': datetime.now(timezone.utc).isoformat(), 'source': 'doctor_recorded'}
    await db.care_plans.update_one({'patient_id': canonical}, {'$set': record}, upsert=True)
    return ok(record)

@router.post('/bp/reference', response_model=Envelope[Measurement])
async def reference(body: ReferenceBP, db=Depends(get_db), principal=Depends(require_any)):
    return await save(db, body, principal, 'bp_reference')

@router.post('/bp/ppg', response_model=Envelope[Measurement])
async def ppg(body: PPG, db=Depends(get_db), principal=Depends(require_any)):
    return await save(db, body, principal, 'ppg')

async def rows(db, patient_id, principal, offset, limit):
    _, aliases = await authorize(db, patient_id, principal)
    try:
        return await db.measurements.find({'patient_id': {'$in': list(aliases)}}, {'_id': 0}).sort(
            [('recorded_at', -1), ('id', -1)]).skip(offset).limit(limit).to_list(length=limit)
    except PyMongoError as exc:
        raise AppError('Measurement storage unavailable', 503) from exc

@router.get('/{patient_id}/trends', response_model=Envelope[Trends])
async def trends(patient_id: str, limit: int = Query(200, ge=1, le=1000),
                 db=Depends(get_db), principal=Depends(require_any)):
    records = await rows(db, patient_id, principal, 0, limit + 1)
    groups = {}
    for row in reversed(records[:limit]):
        if row['status'] == 'rejected':
            continue
        # Units, glucose context, source and mock status never share a series.
        key = ':'.join([row['kind'], row.get('unit') or 'PPG', row.get('context') or '',
                        row['metadata']['source'], 'mock' if row['mock'] else
                        ('synthetic' if row['metadata']['synthetic'] else 'measured')])
        if row.get('analysis'):
            key += ':' + row['analysis']['model'] + ':' + row['analysis']['model_version']
        groups.setdefault(key, []).append(row)
    return ok({'series': [{'key': k, 'points': v} for k, v in groups.items()],
               'truncated': len(records) > limit, 'order': 'chronological'})

@router.get('/{patient_id}', response_model=Envelope[History])
async def history(patient_id: str, offset: int = Query(0, ge=0, le=100000),
                  limit: int = Query(20, ge=1, le=100), db=Depends(get_db), principal=Depends(require_any)):
    records = await rows(db, patient_id, principal, offset, limit + 1)
    return ok({'items': records[:limit], 'offset': offset, 'limit': limit, 'has_more': len(records) > limit})
