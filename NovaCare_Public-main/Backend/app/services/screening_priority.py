"""Transparent review ordering, NOT disease risk or clinical urgency.

Each non-baseline symptom response counts once. Lifestyle responses, voice,
and experimental BP are not used to infer a diagnosis or lower priority.
This operational heuristic requires clinician review; no clinical validation
is claimed. Unlike the legacy score it is neither weighted nor a percentage.
"""
SYMPTOM_BASELINES = {'urination': '4-6', 'headache': 'no', 'dizziness': 'no',
                     'fatigue': 'rarely', 'vision': 'no', 'wounds': 'no',
                     'neck_patches': 'no', 'breathlessness': 'no'}

def review_priority(answers):
    concerns = [key for key, baseline in SYMPTOM_BASELINES.items() if answers.get(key) not in (None, baseline)]
    return {'policy': 'reported-symptoms-v1', 'concerns': concerns, 'concern_count': len(concerns),
            'label': 'Doctor review requested', 'clinical_risk_score': None,
            'explanation': 'Ordered by number of reported symptom concerns, then oldest first. Not a diagnosis or validated urgency score.'}
