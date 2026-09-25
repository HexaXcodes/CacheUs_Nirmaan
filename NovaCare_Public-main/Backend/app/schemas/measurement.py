"""Version 1 shared waveform contract; no diagnostic thresholds."""
from datetime import datetime
from typing import Annotated, Literal
from pydantic import BaseModel, ConfigDict, Field, AwareDatetime, model_validator

Number = Annotated[float, Field(strict=True, allow_inf_nan=False)]
Identifier = Annotated[str, Field(min_length=1, max_length=128)]

class StrictModel(BaseModel):
    model_config = ConfigDict(extra='forbid')

class Metadata(StrictModel):
    source: Literal['manual_reference', 'dataset_simulator', 'physical_sensor']
    device_id: Identifier
    description: Annotated[str, Field(min_length=1, max_length=200)]
    synthetic: bool = False
    screening_id: Identifier | None = None

class ScreeningAnswers(StrictModel):
    water: Literal['>2L', '1-2L', '<1L']
    urination: Literal['4-6', '7-9', '>9']
    headache: Literal['no', 'sometimes', 'yes']
    dizziness: Literal['no', 'yes']
    fatigue: Literal['rarely', 'sometimes', 'daily']
    vision: Literal['no', 'occasional', 'often']
    salt: Literal['none', 'moderate', 'heavy']
    wounds: Literal['no', 'yes']
    neck_patches: Literal['no', 'yes']
    breathlessness: Literal['no', 'sometimes', 'yes']

class ScreeningIntake(StrictModel):
    patient_id: Identifier
    answers: ScreeningAnswers

class CarePlan(StrictModel):
    conditions: list[Literal['hypertension', 'diabetes']] = Field(max_length=2)

class BaseInput(StrictModel):
    patient_id: Identifier
    recorded_at: AwareDatetime
    metadata: Metadata

    @model_validator(mode='after')
    def timestamp(self):
        from datetime import timezone, timedelta
        if self.recorded_at > datetime.now(timezone.utc) + timedelta(minutes=5):
            raise ValueError('recorded_at cannot be in the future')
        self.recorded_at = self.recorded_at.astimezone(timezone.utc)
        return self

class ReferenceBP(BaseInput):
    systolic: Annotated[Number, Field(gt=0, le=400)]
    diastolic: Annotated[Number, Field(gt=0, le=300)]
    unit: Literal['mmHg'] = 'mmHg'

    @model_validator(mode='after')
    def reference(self):
        if self.systolic <= self.diastolic:
            raise ValueError('systolic must exceed diastolic')
        if self.metadata.source != 'manual_reference' or self.metadata.synthetic:
            raise ValueError('Reference readings require a real reference device')
        return self

class Glucose(BaseInput):
    value: Annotated[Number, Field(gt=0, le=2000)]
    unit: Literal['mg/dL', 'mmol/L']
    context: Literal['fasting', 'post_meal', 'unspecified'] = 'unspecified'

    @model_validator(mode='after')
    def reference(self):
        if self.unit == 'mmol/L' and self.value > 111:
            raise ValueError('Value exceeds supported measurement range')
        if self.metadata.source != 'manual_reference' or self.metadata.synthetic:
            raise ValueError('Glucose requires a real glucometer reading')
        return self

class Waveform(StrictModel):
    contract_version: Literal['1'] = '1'
    samples: Annotated[list[Number], Field(min_length=100, max_length=12000)]
    sampling_rate_hz: Annotated[Number, Field(ge=20, le=500)]
    sample_unit: Literal['adc', 'normalized']
    metadata: Metadata

    @model_validator(mode='after')
    def waveform(self):
        if not 5 <= len(self.samples) / self.sampling_rate_hz <= 60:
            raise ValueError('Waveform duration must be 5–60 seconds')
        if self.metadata.source == 'manual_reference':
            raise ValueError('PPG requires simulator or physical sensor provenance')
        if self.metadata.synthetic and self.metadata.source != 'dataset_simulator':
            raise ValueError('Synthetic data must use dataset_simulator provenance')
        if any(abs(x) > 1e9 for x in self.samples):
            raise ValueError('Sample magnitude exceeds supported range')
        return self

class PPG(BaseInput, Waveform):
    fixture: Literal['good', 'poor', 'hr_only', 'unavailable', 'experimental'] | None = None

class ExperimentalBP(StrictModel):
    label: Literal['Experimental BP Estimate'] = 'Experimental BP Estimate'
    systolic: Annotated[Number, Field(gt=0, le=400)]
    diastolic: Annotated[Number, Field(gt=0, le=300)]
    unit: Literal['mmHg'] = 'mmHg'

    @model_validator(mode='after')
    def ordered(self):
        if self.systolic <= self.diastolic:
            raise ValueError('Invalid BP ordering')
        return self

class Analysis(StrictModel):
    model_config = ConfigDict(extra='forbid', strict=True)
    contract_version: Literal['1'] = '1'
    quality_score: Annotated[Number, Field(ge=0, le=1)]
    acceptable: bool
    retry_reason: Annotated[str, Field(min_length=1, max_length=300)] | None = None
    heart_rate_bpm: Annotated[Number, Field(ge=20, le=300)] | None = None
    experimental_bp: ExperimentalBP | None = None
    model: Identifier
    model_version: Identifier

    @model_validator(mode='after')
    def consistent(self):
        if not self.acceptable and (not self.retry_reason or self.experimental_bp is not None):
            raise ValueError('Rejected signals require a retry reason and cannot contain BP')
        return self

class Measurement(StrictModel):
    id: str
    patient_id: str
    recorded_at: datetime
    received_at: datetime
    kind: Literal['glucose', 'bp_reference', 'ppg']
    status: Literal['recorded', 'accepted', 'rejected']
    metadata: Metadata
    mock: bool = False
    value: float | None = None
    unit: str | None = None
    context: str | None = None
    systolic: float | None = None
    diastolic: float | None = None
    analysis: Analysis | None = None
    contract_version: Literal['1'] | None = None
    sampling_rate_hz: float | None = None
    sample_unit: Literal['adc', 'normalized'] | None = None
    sample_count: int | None = None

class History(StrictModel):
    items: list[Measurement]
    offset: int
    limit: int
    has_more: bool

class TrendSeries(StrictModel):
    key: str
    points: list[Measurement]

class Trends(StrictModel):
    series: list[TrendSeries]
    truncated: bool
    order: Literal['chronological'] = 'chronological'
