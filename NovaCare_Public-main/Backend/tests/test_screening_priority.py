import pytest
from pydantic import ValidationError
from app.schemas.measurement import ScreeningAnswers
from app.schemas.session import IdrsSubmit
from app.services.screening_priority import review_priority

BASE={'water':'1-2L','urination':'4-6','headache':'no','dizziness':'no','fatigue':'rarely','vision':'no','salt':'moderate','wounds':'no','neck_patches':'no','breathlessness':'no'}
def test_all_ten_required():
    assert len(ScreeningAnswers(**BASE).model_dump())==10
    with pytest.raises(ValidationError):ScreeningAnswers(**{k:v for k,v in BASE.items() if k!='vision'})
    with pytest.raises(ValidationError):ScreeningAnswers(**{**BASE,'headache':'maybe'})
def test_priority_not_probability_or_lifestyle_penalty():
    p=review_priority({**BASE,'water':'<1L','salt':'heavy'})
    assert p['concern_count']==0 and p['clinical_risk_score'] is None
    p=review_priority({**BASE,'headache':'sometimes','fatigue':'daily'})
    assert p['concerns']==['headache','fatigue'] and p['concern_count']==2

def test_published_idrs_maximum_and_missing_components():
    assert IdrsSubmit(age_score=30,waist_score=20,activity_score=30,family_history_score=20).idrs_total==100
    with pytest.raises(ValidationError):IdrsSubmit(age_score=40,waist_score=20,activity_score=30,family_history_score=10)
    with pytest.raises(ValidationError):IdrsSubmit(age_score=20)
    with pytest.raises(ValidationError):IdrsSubmit(age_score=20,waist_score=10,activity_score=10,family_history_score=0,idrs_total=60)
