# Axis — IPL Prediction & Analytics Dashboard

A two-step probabilistic IPL match-prediction system built around Claude Opus
4.6 with dynamically allocated weights across 8 core T20 variables.

## Layout

```
src/ipl/                  # Python package
  db/        SQLAlchemy models, session, schema
  etl/       Cricsheet bulk loader + live JSON feed scraper
  inference/ Prompt construction + Anthropic SDK call
  notify/    Telegram notifier + prediction formatter
  schedule.py  Hand-maintained season schedule + sent-state idempotency
  api/       FastAPI server + APScheduler state machine
  ui/        Streamlit dashboard
scripts/                  # CLI entry points (init_db, load_cricsheet, run_dev, cron_tick)
.github/workflows/        # GitHub Actions cron — predict & notify every 5 min
tests/                    # pytest suites
data/
  raw/                    # drop Cricsheet .json files here (gitignored)
  fixtures/               # ipl_schedule.json, sent.json, mock JSON for APIs
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

## Automated notifications via GitHub Actions

Two workflows run the whole loop:

| Workflow | Cadence | Purpose |
|---|---|---|
| `.github/workflows/refresh_schedule.yml` | daily, 04:00 IST | Pulls the IPL fixture list from CricAPI and rewrites `data/fixtures/ipl_schedule.json`. |
| `.github/workflows/predict.yml` | every 5 minutes | Picks the next match in a T-30 ± 3-min window, calls Claude, sends Telegram, marks `sent.json`. |

### predict.yml

`scripts/cron_tick.py` runs every 5 minutes. The tick:

1. Reads `data/fixtures/ipl_schedule.json` (the season fixture list you
   maintain) and `data/fixtures/sent.json` (already-notified match keys).
2. Picks the unique match whose start is `T-30 ± 3 minutes` from now.
3. Calls Claude Opus, persists a `Prediction` row, sends the result to
   Telegram, and appends the match key to `sent.json` (committed back).

### refresh_schedule.yml

`scripts/refresh_schedule.py` calls CricAPI's `/v1/series` then
`/v1/series_info` to pull the upcoming IPL fixture list, normalizes it
into the schema `ipl.schedule` reads, and writes `ipl_schedule.json`.
The match key prefers CricAPI's stable `id` so reschedules don't
double-fire notifications.

### Setup

1. Create a Telegram bot with [@BotFather](https://t.me/botfather) → copy the
   bot token. DM the bot once, then visit
   `https://api.telegram.org/bot<TOKEN>/getUpdates` to grab your chat ID.
2. Sign up at [cricapi.com](https://cricapi.com) for a free API key
   (~100 calls/day; we use 2 per refresh).
3. In the GitHub repo, add these **Secrets**:
   `ANTHROPIC_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`,
   `CRICAPI_KEY`, optional `OPENWEATHER_API_KEY`.
4. Set workflow permissions to "Read and write" under
   *Settings → Actions → General → Workflow permissions* so each workflow
   can commit its state file back.
5. Manually trigger `Refresh IPL Schedule` once to populate
   `ipl_schedule.json` with real upcoming matches; from then on it runs
   itself every morning.

Without those secrets the workflows still run and dry-print the would-be
Telegram message to the Action log, so you can validate end-to-end before
flipping any keys.

> The trigger fires at **T-30 from scheduled start**, which is when the toss
> is normally already decided. Wiring a real `LIVE_FEED_URL` for true
> toss-detect is a future upgrade.

## Tests

```sh
pytest -q
```

## Archived: AXIS landing page

The original AXIS · Cyber Reality landing page (Vite + React + Three.js) lives
in `web/`. To run it: `cd web && npm install && npm run dev`.
