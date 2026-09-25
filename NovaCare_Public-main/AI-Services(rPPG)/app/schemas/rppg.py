from typing import List, Optional, Union
from pydantic import BaseModel, Field


class SignalInput(BaseModel):
    """
    Input schema for processing raw color signals.
    Supports either single-channel (e.g., green channel only) or 3-channel (RGB) signals.
    """
    signal: Union[List[float], List[List[float]]] = Field(
        ...,
        description="A 1D list of green channel averages, or a 2D list of shape (N, 3) representing [R, G, B] channel averages over time."
    )
    fps: float = Field(
        default=30.0,
        ge=5.0,
        le=240.0,
        description="Sampling rate (frames per second) of the signal."
    )
    algorithm: str = Field(
        default="pos",
        description="The rPPG signal extraction algorithm to use. Options: 'pos', 'chrom', 'green'."
    )


class RppgOutput(BaseModel):
    """
    Output features computed from the rPPG signal, compatible with the main backend.
    """
    hrv_flag: bool = Field(
        ...,
        description="True if heart rate variability (HRV) metrics indicate elevated risk (e.g., low RMSSD or SDNN)."
    )
    hr_bpm: Optional[float] = Field(
        default=None,
        ge=20.0,
        le=240.0,
        description="Estimated heart rate in beats per minute (BPM)."
    )
    rr_rate: Optional[float] = Field(
        default=None,
        ge=4.0,
        le=60.0,
        description="Estimated respiratory rate in breaths per minute."
    )
    sdnn: Optional[float] = Field(
        default=None,
        description="Standard Deviation of Normal-to-Normal (NN) intervals in milliseconds."
    )
    rmssd: Optional[float] = Field(
        default=None,
        description="Root Mean Square of Successive Differences in milliseconds."
    )
