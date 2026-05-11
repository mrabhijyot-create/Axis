"""Single-shot prediction tick. Run by GitHub Actions cron every 5 minutes.

See `scripts/cron_tick.py` for the CLI entry point.

Behaviour:
  1. Load the season schedule + already-sent state.
  2. Pick the unique match whose scheduled start is T-30 ± 3 minutes from now.
  3. If none, exit 0 silently.
  4. Otherwise: build prompt context, call Claude (or fixture), persist the
     Prediction row, send a Telegram message, and append match_key to sent.json.

Idempotency comes from `data/fixtures/sent.json`, which the GitHub Actions
workflow commits back after a successful run.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from ipl.db import Prediction, SessionLocal, init_db
from ipl.etl.live import fetch_weather
from ipl.inference import build_prompt_context, predict
from ipl.notify import format_prediction, send_telegram
from ipl.schedule import load_schedule, load_sent, mark_sent, pick_due_match


def _live_payload_from_schedule(match: dict[str, Any]) -> dict[str, Any]:
    """The schedule entries are already shape-compatible with the live feed,
    minus a real toss field — fill it with placeholders for the prompt."""
    out = dict(match)
    out.setdefault("toss", {"winner": None, "decision": None})
    out["teams"] = [
        {
            "name": t["name"],
            "short_name": t.get("short_name"),
            "playing_xi": t.get("playing_xi", []),
            "impact_options": t.get("impact_options", []),
            "recent_form": t.get("recent_form", []),
        }
        for t in out.get("teams", [])
    ]
    return out


def main(now: datetime | None = None) -> int:
    init_db()
    now = now or datetime.now(timezone.utc)

    schedule = load_schedule()
    sent = load_sent()
    due = pick_due_match(schedule, now, sent=sent)
    if not due:
        print(f"[cron] {now.isoformat()} — no match due")
        return 0

    print(f"[cron] {now.isoformat()} — predicting for {due['match_key']}")

    live = _live_payload_from_schedule(due)
    city = (live.get("venue") or {}).get("city") or ""
    weather = fetch_weather(city)

    with SessionLocal() as session:
        ctx = build_prompt_context(live, weather, session=session)
        result = predict(ctx)

        teams = live.get("teams", [])
        team_a = teams[0]["name"]
        team_b = teams[1]["name"]
        match_label = due.get("match_label", f"{team_a} vs {team_b}")

        session.add(
            Prediction(
                match_key=due["match_key"],
                match_label=match_label,
                team_a=team_a,
                team_b=team_b,
                venue=(live.get("venue") or {}).get("name"),
                win_probability_a=float(result["step2_prediction"]["win_probability_a"]),
                win_probability_b=float(result["step2_prediction"]["win_probability_b"]),
                weights=result["step1_weights"],
                drivers=result["step2_prediction"].get("primary_drivers", []),
                raw_response=result,
            )
        )
        session.commit()

    text = format_prediction(result, match_label=match_label)
    delivered = send_telegram(text)
    mark_sent(due["match_key"])
    print(f"[cron] delivered={delivered} match_key={due['match_key']}")
    return 0
