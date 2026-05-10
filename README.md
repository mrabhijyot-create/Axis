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

`.github/workflows/predict.yml` runs `scripts/cron_tick.py` every 5 minutes.
The tick:

1. Reads `data/fixtures/ipl_schedule.json` (the season fixture list you
   maintain) and `data/fixtures/sent.json` (already-notified match keys).
2. Picks the unique match whose start is `T-30 ± 3 minutes` from now.
3. Calls Claude Opus, persists a `Prediction` row, sends the result to
   Telegram, and appends the match key to `sent.json` (committed back).

Setup steps:

1. Create a Telegram bot with [@BotFather](https://t.me/botfather) → copy the
   bot token. DM the bot once, then visit
   `https://api.telegram.org/bot<TOKEN>/getUpdates` to grab your chat ID.
2. In the GitHub repo, add these **Secrets**:
   `ANTHROPIC_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`,
   optional `OPENWEATHER_API_KEY`.
3. Update `data/fixtures/ipl_schedule.json` with the upcoming matches —
   `match_key`, `scheduled_start_utc`, `venue.city`, and a `teams` array of
   two `{name, ...}` objects is the minimum.
4. The workflow needs `contents: write` permission (already declared) so it
   can commit `sent.json` back. Verify it under
   *Settings → Actions → General → Workflow permissions* (set to "Read and
   write").

Without those secrets the cron still runs and prints the would-be Telegram
message to the Action log, so you can dry-run before flipping any keys.

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
