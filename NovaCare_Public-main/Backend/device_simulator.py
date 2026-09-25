"""Explicit synthetic fixture or stored waveform sender; never impersonates hardware."""
import argparse
import json
import math
import os
from datetime import datetime, timezone
from pathlib import Path
import httpx
from app.schemas.measurement import PPG

def build_payload(patient_id, fixture=None, path=None):
    waveform = json.loads(Path(path).read_text(encoding='utf-8')) if path else {
        'samples': [round(math.sin(2 * math.pi * 1.2 * i / 100), 6) for i in range(1000)],
        'sampling_rate_hz': 100, 'sample_unit': 'normalized',
        'metadata': {'source': 'dataset_simulator', 'device_id': 'synthetic-simulator',
                     'description': 'Synthetic sine wave; not PulseDB or validated inference', 'synthetic': True}}
    waveform['metadata']['source'] = 'dataset_simulator'
    return PPG.model_validate({**waveform, 'patient_id': patient_id,
        'recorded_at': datetime.now(timezone.utc).isoformat(), 'fixture': fixture}).model_dump(mode='json')

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--patient-id', required=True)
    parser.add_argument('--url', default='http://localhost:8000')
    parser.add_argument('--file', help='Stored Waveform v1 JSON with honest source metadata')
    parser.add_argument('--fixture', choices=['good', 'poor', 'hr_only', 'unavailable', 'experimental'])
    args = parser.parse_args()
    token = os.environ.get('NOVACARE_TOKEN')
    if not token:
        parser.error('Set NOVACARE_TOKEN to an authorized login JWT')
    response = httpx.post(args.url.rstrip('/') + '/measurements/bp/ppg',
        headers={'Authorization': f'Bearer {token}'},
        json=build_payload(args.patient_id, args.fixture, args.file), timeout=70)
    print(json.dumps(response.json(), indent=2))
    response.raise_for_status()

if __name__ == '__main__':
    main()
