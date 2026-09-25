# NovaCare / Nirmaan

An app supporting diabetes and hypertension awareness, assisted screening, and measurement recording in rural India.

## Repository layout

- `frontend/`: maintained React/Vite app for patients, ASHA workers, and doctors, including AR measurement guidance.
- `Backend/`: FastAPI API, data access, tests, device simulator, and synthetic demo setup.
- `AI-Services(rPPG)/`: facial-video signal processing service.
- `AI-Services-MultiLang/`: translation and speech service.
- `NovaCare-ai_services1/`: voice triage service.

This repository root corresponds to the local `NovaCare_Public-main` directory. The older sibling projects and design exports are not runtime dependencies.

## Run locally

Use Python 3.11+, Node.js, and a running MongoDB instance. From this repository root, start the backend in PowerShell:

```powershell
cd Backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
python -m uvicorn app.main:app --reload --port 8000
```

In a second terminal, from the repository root:

```powershell
cd frontend
npm.cmd ci
npm.cmd run dev
```

Open http://localhost:3000. Configure local credentials in `.env`; use a unique JWT secret for deployment. Local environments, databases, logs, dependency folders, and generated builds are intentionally excluded from Git.

See [measurement setup and API](NIRMAAN.md), [backend documentation](Backend/README.md), [synthetic demo instructions](NIRMAAN_DEMO.md), and [frontend integration notes](frontend/STITCH_INTEGRATION.md). Optional AI services have separate requirements files and are configured through the backend environment.

## Checks

Run `python -m pytest` from `Backend`, and `npm.cmd run build` from `frontend`. Frontend geometry checks run with `node --test src/components/ar/*.test.js` from `frontend`.

This is an awareness and demonstration project; experimental PPG estimates are not clinically validated blood pressure measurements.
