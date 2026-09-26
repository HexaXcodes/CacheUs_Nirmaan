"""USB finger events trigger labelled dataset replay; never transmit LDR as PPG."""
import argparse
import copy
import getpass
import json
import math
import os
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]


class Trigger:
    def __init__(self, duration):
        self.duration = duration
        self.reset()

    def reset(self):
        self.armed = False
        self.deadline = None

    def feed(self, line, now):
        if line.startswith('READY'):
            self.reset()
        elif line == 'EVENT:FINGER_OUT':
            self.armed = True
            self.deadline = None
        elif line == 'EVENT:FINGER_IN' and self.armed:
            self.armed = False
            self.deadline = now + self.duration

    def due(self, now):
        if self.deadline is not None and now >= self.deadline:
            self.deadline = None
            return True
        return False


def prepare(template, patient_id, screening_id):
    body = copy.deepcopy(template)
    body.pop('_reference', None)
    body.pop('fixture', None)  # Always call ML, never substitute a fixture result.
    body['patient_id'] = patient_id
    body['recorded_at'] = datetime.now(timezone.utc).isoformat()
    meta = body['metadata']
    meta['source'] = 'dataset_simulator'
    meta['screening_id'] = screening_id
    meta['description'] = (
        'Uno finger-triggered DATASET REPLAY; not measured from current finger. '
        + meta.get('description', '')
    )[:200]
    return body


def submit(url, token, body):
    req = Request(url.rstrip('/') + '/measurements/bp/ppg',
                  data=json.dumps(body, allow_nan=False).encode(),
                  headers={'Authorization': 'Bearer ' + token,
                           'Content-Type': 'application/json'}, method='POST')
    try:
        with urlopen(req, timeout=70) as response:
            result = json.load(response)
    except HTTPError as exc:
        print(f'HTTP {exc.code}: submission failed. Check backend logs and measurement history.')
        print('No automatic retry. 401: login again; 422: payload/intake; 503: ML or storage.')
        return
    except (URLError, TimeoutError, ValueError):
        print('Response could not be confirmed. Check history before retrying; no automatic retry.')
        return
    data = result.get('data') or {}
    analysis = data.get('analysis') or {}
    print('REPLAY result:', data.get('status', 'unknown'), '| ID:', data.get('id', 'unknown'))
    print('Quality:', analysis.get('quality_score'), '| Dataset HR:', analysis.get('heart_rate_bpm'))
    print('Experimental dataset BP:', analysis.get('experimental_bp'))
    if analysis.get('retry_reason'):
        print('Reason:', analysis['retry_reason'])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', default='COM4')
    parser.add_argument('--payload', type=Path, default=ROOT / 'ppg_dataset/ppg_ready/bidmc_01_segment_1.json')
    parser.add_argument('--backend', default='http://127.0.0.1:8000')
    parser.add_argument('--patient-id')
    parser.add_argument('--screening-id')
    parser.add_argument('--send', action='store_true', help='Save to backend; default is dry run')
    args = parser.parse_args()
    if args.send and (not args.patient_id or not args.screening_id):
        parser.error('--send requires --patient-id and --screening-id for a demo patient/intake')
    template = json.loads(args.payload.read_text(encoding='utf-8'))
    samples, rate = template['samples'], template['sampling_rate_hz']
    if (not isinstance(rate, (int, float)) or not math.isfinite(rate) or not 20 <= rate <= 500
            or not 100 <= len(samples) <= 12000
            or any(not isinstance(x, (int, float)) or not math.isfinite(x) or abs(x) > 1e9 for x in samples)):
        parser.error('Invalid waveform samples or sampling rate')
    duration = len(samples) / rate
    if not 5 <= duration <= 60:
        parser.error('Waveform must contain 5 to 60 seconds')
    token = ''
    if args.send:
        token = os.environ.get('NOVACARE_TOKEN') or getpass.getpass('Paste ASHA JWT (hidden): ')
        if not token.strip():
            parser.error('A token is required')
    try:
        import serial
    except ImportError:
        parser.error('Install pyserial: python -m pip install pyserial')
    gate = Trigger(duration)
    print('DATASET REPLAY - not measured from current finger.')
    print(f'{len(samples)} samples at {rate} Hz; hold finger for {duration:g}s after FINGER_IN.')
    print('Mode:', 'SEND TO BACKEND' if args.send else 'DRY RUN - no network requests or saved measurements')
    print('Close Arduino Serial Monitor/Plotter. Start with finger OUT. Ctrl+C stops.')
    try:
        with serial.Serial(args.port, 115200, timeout=0.1) as device:
            # Opening the Uno port normally resets it. Do not discard its initial OUT event.
            last_seen = time.monotonic()
            while True:
                line = device.readline().decode('ascii', errors='replace').strip()
                now = time.monotonic()
                if line.startswith(('LIGHT:', 'EVENT:', 'READY')):
                    last_seen = now
                if line.startswith(('EVENT:', 'READY')):
                    previous = gate.deadline
                    gate.feed(line, now)
                    print(line)
                    if gate.deadline is not None and previous is None:
                        print('Replay interval started. Removal before completion cancels it.')
                    elif previous is not None and gate.deadline is None:
                        print('Pending replay cancelled.')
                if now - last_seen > 2:
                    if gate.deadline is not None:
                        print('Serial data stopped: pending replay cancelled.')
                    gate.reset()
                if gate.due(now):
                    if args.send:
                        submit(args.backend, token.strip(), prepare(template, args.patient_id, args.screening_id))
                        # Ignore gestures buffered during HTTP. Require a fresh OUT/IN sequence.
                        device.reset_input_buffer()
                        gate.reset()
                        print('Request finished. Remove finger now before the next insertion.')
                    else:
                        print('DRY RUN PASS: would submit one dataset segment now. Remove finger to rearm.')
                    last_seen = time.monotonic()
    except serial.SerialException:
        print('Serial port unavailable/disconnected. Close other serial apps and check the COM port.')
        raise SystemExit(1)
    except KeyboardInterrupt:
        print('\nBridge stopped.')


if __name__ == '__main__':
    main()
