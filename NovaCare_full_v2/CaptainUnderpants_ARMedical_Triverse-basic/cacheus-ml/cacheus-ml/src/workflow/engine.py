from dataclasses import dataclass
from typing import Optional


STEPS = [
    "remove_cap",
    "shake_inhaler",
    "exhale_away",
    "position_mouthpiece",
    "begin_slow_inhalation",
    "actuate_during_inhalation",
    "continue_inhalation",
    "breath_hold",
]


@dataclass
class WorkflowState:
    current_step: int = 0
    status: str = "uncertain"


class WorkflowEngine:
    def __init__(self):
        self.state = WorkflowState()

    @property
    def current_step_name(self) -> str:
        if self.state.current_step >= len(STEPS):
            return "complete"

        return STEPS[self.state.current_step]

    def reset(self):
        self.state = WorkflowState()

    def update(
        self,
        detected_step: Optional[str],
        confidence: float = 0.0,
    ):
        if detected_step is None:
            self.state.status = "uncertain"
            return self.state

        if detected_step not in STEPS:
            self.state.status = "uncertain"
            return self.state

        expected = self.current_step_name
        detected_index = STEPS.index(detected_step)

        # Correct current step.
        if detected_step == expected:
            self.state.status = "correct"

            if confidence >= 0.5:
                self.state.current_step += 1

            return self.state

        # Already-completed step appearing again.
        if detected_index < self.state.current_step:
            self.state.status = "correct"
            return self.state

        # A future step was detected before the expected step.
        self.state.status = "incorrect"
        return self.state

    def result(self):
        return {
            "current_step": self.state.current_step,
            "current_step_name": self.current_step_name,
            "status": self.state.status,
            "complete": self.state.current_step >= len(STEPS),
        }
