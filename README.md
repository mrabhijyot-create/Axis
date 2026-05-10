# Axis — IPL Prediction & Analytics Dashboard

A two-step probabilistic IPL match-prediction system built around Claude Opus
4.6 with dynamically allocated weights across 8 core T20 variables.

## Layout

```
src/ipl/                  # Python package
  db/        SQLAlchemy models, session, schema
  etl/       Cricsheet bulk loader + live JSON feed scraper
  inference/ Prompt construction + Anthropic SDK call
  api/       FastAPI server + APScheduler state machine
  ui/        Streamlit dashboard
scripts/                  # CLI entry points (init_db, load_cricsheet, run_dev)
tests/                    # pytest suites
data/
  raw/                    # drop Cricsheet .json files here (gitignored)
  fixtures/               # mock JSON used when external APIs are unavailable
  ipl.db                  # local SQLite (gitignored)
web/                      # archived AXIS landing page (Vite/React/Three.js)
```

## The 8 dynamic-weight variables

1. Venue Target Pressure
2. Key Matchup Index
3. Squad Rotation Delta
4. Impact Player Variance
5. Phase Execution Delta
6. Toss
7. Tournament Context
8. Schedule Fatigue

Claude Opus is asked to allocate percentage weights to these variables based on
pitch, weather and tournament context, then produce a final win probability and
the primary textual drivers — all returned as a single structured JSON payload.

## Quickstart

```sh
python -m venv .venv && source .venv/bin/activate
pip install -e .[dev]
cp .env.example .env                       # fill keys you have

python scripts/init_db.py                  # create data/ipl.db
python scripts/load_cricsheet.py data/raw  # bulk load any Cricsheet json files

# Two processes:
uvicorn ipl.api.main:app --reload --port 8000
streamlit run src/ipl/ui/app.py
```

Without `ANTHROPIC_API_KEY` and `OPENWEATHER_API_KEY`, the inference engine and
weather adapter fall back to fixtures under `data/fixtures/` so the full app
runs end-to-end locally.

## Tests

```sh
pytest -q
```

## Archived: AXIS landing page

The original AXIS · Cyber Reality landing page (Vite + React + Three.js) lives
in `web/`. To run it: `cd web && npm install && npm run dev`.
