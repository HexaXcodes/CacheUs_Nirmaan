"""Screening session and risk schemas (Pydantic v2)."""
from __future__ import annotations

from datetime import datetime
from typing import Dict, List, Optional, Literal

from pydantic import BaseModel, Field, model_validator


# --------------------------------------------------------------------------- #
# Sessions
# --------------------------------------------------------------------------- #
class SessionCreate(BaseModel):
    patient_id: str
    village_code: str = Field(..., max_length=32)
    local_id: Optional[str] = Field(default=None, max_length=64)


class IdrsSubmit(BaseModel):
    """
    IDRS = Indian Diabetes Risk Score. Four scored components; total 0-100.
    Accept either the raw component answers or a precomputed total.
    Also accepts symptom_score (0-1) from the adaptive question engine.
    """
    age_score: Optional[Literal[0, 20, 30]] = None
    waist_score: Optional[Literal[0, 10, 20]] = None
    activity_score: Optional[Literal[0, 10, 20, 30]] = None
    family_history_score: Optional[Literal[0, 10, 20]] = None
    idrs_total: Optional[int] = Field(default=None, ge=0, le=100)
    # Adaptive symptom triage (new — supportive signal alongside IDRS)
    symptom_score: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    symptom_answers: Optional[Dict] = Field(default=None)

    @model_validator(mode='after')
    def consistent_total(self):
        parts = [self.age_score, self.waist_score, self.activity_score, self.family_history_score]
        if any(x is not None for x in parts):
            if any(x is None for x in parts):
                raise ValueError('All four IDRS components are required; missing is not zero')
            total = sum(parts)
            if self.idrs_total is not None and self.idrs_total != total:
                raise ValueError('IDRS total must equal the sum of the four components')
            self.idrs_total = total
        elif self.idrs_total is None:
            raise ValueError('IDRS components or total required')
        if self.idrs_total % 10:
            raise ValueError('IDRS total must be a multiple of 10')
        return self


class VoiceFeatures(BaseModel):
    """
    Extracted on-device. NEVER raw audio. `voice_score` is the model's
    risk probability (0-1). Other fields are optional feature-vector summaries.
    """
    voice_score: float = Field(..., ge=0.0, le=1.0)
    jitter: Optional[float] = None
    shimmer: Optional[float] = None
    hnr: Optional[float] = None  # harmonics-to-noise ratio
    feature_vector: Optional[List[float]] = None


class RppgFeatures(BaseModel):
    """Extracted on-device from a 60s front-camera scan."""
    hrv_flag: bool = Field(..., description="True if HRV indicates elevated risk")
    hr_bpm: Optional[float] = Field(default=None, ge=20, le=240)
    rr_rate: Optional[float] = Field(default=None, ge=4, le=60)
    sdnn: Optional[float] = None
    rmssd: Optional[float] = None


class SessionOut(BaseModel):
    id: str
    patient_id: str
    asha_id: Optional[str] = None
    village_code: str
    idrs_score: Optional[int] = None
    voice_score: Optional[float] = None
    rppg_hrv_flag: Optional[bool] = None
    tier: Optional[str] = None
    composite_score: Optional[float] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# --------------------------------------------------------------------------- #
# Risk engine
# --------------------------------------------------------------------------- #
class RiskComputeRequest(BaseModel):
    idrs_score: int = Field(..., ge=0, le=100)
    voice_score: float = Field(..., ge=0.0, le=1.0)
    rppg_hrv_flag: bool = False

    # Optional prediabetes-trajectory inputs
    waist_cm: Optional[float] = Field(default=None, ge=30, le=200)
    dietary_score: Optional[float] = Field(default=None, ge=0, le=100)
    occupation_transition_flag: bool = False
    family_history_flag: bool = False

    lang: str = Field(default="en", max_length=5)


class ComponentBreakdown(BaseModel):
    idrs_contribution: float
    voice_contribution: float
    rppg_contribution: float
    symptom_contribution: float = 0.0


class PrediabetesTrajectory(BaseModel):
    score: float
    label: str  # stable | rising | high_risk
    drivers: List[str]


class RiskResult(BaseModel):
    tier: str  # GREEN | AMBER | RED
    composite_score: float
    component_breakdown: ComponentBreakdown
    action_text: str
    explanation: str
    prediabetes_trajectory: Optional[PrediabetesTrajectory] = None


# --------------------------------------------------------------------------- #
# Patient-facing report
# --------------------------------------------------------------------------- #
class PatientReport(BaseModel):
    patient_id: str
    session_id: str
    tier: str
    headline: str
    explanation: str
    advice_preview: Optional[str] = None
    next_visit_hint: str
    lang: str
