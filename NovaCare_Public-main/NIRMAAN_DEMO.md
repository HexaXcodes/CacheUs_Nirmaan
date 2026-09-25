# Nirmaan local demo

Frontend: http://localhost:3000. Backend: http://localhost:8020. Mongo database: `novacare_review`.
These accounts and readings are synthetic development fixtures, not real patients or medical measurements.

## Logins

| Role | Login | Secret |
| --- | --- | --- |
| ASHA | `NOVACARE-DEMO-24` | PIN `4826` |
| Doctor | `novacare.demo@example.com` | Password `NovaCareDemo!24` |

Doctor ID: `6ab4a7afad5120ae5e44cdb0`.
Demo village: `DEMO_NIRMAAN_24`; district: `DEMO_DISTRICT_24`.
Existing accounts keep their current access scope.

| Synthetic patient | Phone login | Patient local ID | Cloud ID |
| --- | --- | --- | --- |
| Hypertension only | `9000002401` | `nirmaan-demo-24-1` | `6ab4a693982f009b2aaefd13` |
| Diabetes only | `9000002402` | `nirmaan-demo-24-2` | `6ab4a6cf982f009b2aaefd14` |
| Both conditions | `9000002403` | `nirmaan-demo-24-3` | `6ab4a6d0982f009b2aaefd15` |
| No recorded condition | `9000002404` | `nirmaan-demo-24-4` | `6ab4a6d0982f009b2aaefd16` |

Patients request an OTP on the patient login page. Use the newly displayed development OTP; there is no fixed OTP or patient password.
Use the local ID when selecting a demo patient in the ASHA portal.

## Demo sequence

1. Sign in as ASHA, select a patient, answer all ten questions, and save to open finger PPG guidance. A saved questionnaire is available to the doctor even while PPG is pending.
2. Sign in as the doctor and open Review queue. The latest screening per patient appears, with answers and its linked PPG result, if available.
3. Open a patient and record an already established hypertension/diabetes condition. Only an authorized doctor can change this record.
4. Sign in as each patient. History remains available. Hypertension enables the cuff BP guide; diabetes enables the glucometer guide; both enables both; no recorded condition enables neither. Direct patient guide URLs also enforce this UI gate.
5. Switch between English, Hindi and Kannada. Core questionnaire, navigation, condition controls and guided steps are translated; some legacy copy and technical messages remain English.

## What the priority means

The new queue counts reported symptom concerns once each, orders higher counts first, and uses oldest screening time to break ties. Water/salt habits are recorded but do not add points. Voice and experimental BP do not determine this ordering. Missing/rejected PPG does not lower the symptom count.

This is an explainable demonstration of review ordering, **not a validated medical urgency score, disease probability, diagnosis, or emergency triage tool**. Zero concerns does not establish that someone is healthy. Clinical priority rules require professional review before real use.

The optional legacy IDRS form now uses published component points and rejects inconsistent sums. It is separate from the new ten-question flow. Source: https://pmc.ncbi.nlm.nih.gov/articles/PMC10438401/ . The older composite risk engine is retained for compatibility and is not used by the new review queue.

The seeded BP/glucose histories and HR-only PPG are visibly marked synthetic/mock. No trained BP model or clinical accuracy is claimed. The frontend condition gate controls patient guidance; it does not change the existing measurement API's recording permissions.

## Recreate fixtures

From `Backend`, with local development configuration and mock SMS, run `.venv\Scripts\python.exe seed_nirmaan_demo.py`. The script targets the local API on port 8020 and database `novacare_review`; verify those settings before running. It refuses to overwrite non-demo staff accounts.

## Verification

- 101 backend tests pass when run from `Backend`.
- Live Mongo/API: four distinct condition records, authenticated histories, patient self-access and doctor-only condition updates verified.
- Browser: ten questionnaire answers save and transition to finger PPG; Hindi guided instructions and Kannada core screens verified.
- Hardware and clinical calibration remain outside this software demo verification.
