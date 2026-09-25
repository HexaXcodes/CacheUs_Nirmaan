# CacheUs Phase 1 — Dataset Status

## Target

pMDI (pressurized metered-dose inhaler) technique verification using smartphone video.

## Current public sources

### HealthHub / ACE technique videos
Purpose:
- Reference for correct pMDI technique
- Establish visual workflow
- Establish expected technique sequence

These are reference/educational materials, not labelled ML training data.

### Published smartphone-video inhaler study
A study from the Chest Research Foundation, Pune investigated smartphone video recording of inhaler technique at home.

Purpose:
- Validate that smartphone video can capture inhaler technique
- Understand real-world technique errors
- Inform our label/error taxonomy

The underlying patient videos are not publicly available for direct model training.

## Current limitation

No suitable openly downloadable, labelled pMDI human-video dataset has been identified for direct training of the CacheUs CV technique model.

## Planned training data

A consented dataset will eventually be required for:
- correct technique
- incorrect technique
- individual technique-step labels
- different users
- different lighting/backgrounds
- different camera positions
- different skin tones
- different inhaler orientations

## Important

Do not scrape or redistribute patient videos from published studies.

Do not treat educational/reference videos as labelled clinical training data.