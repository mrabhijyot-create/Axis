"""Hand-maintained IPL season schedule + idempotency state.

Schedule shape: see `data/fixtures/ipl_schedule.json`. Each entry needs a
unique `match_key`, `scheduled_start_utc` (ISO 8601), `venue.city`, and
`teams: [{name, ...}, {name, ...}]`. Anything else (playing_xi, context,
pitch_report) is forwarded into the prompt context but optional.

`sent.json` is the durable state file the cron commits back: a JSON array of
match_keys we've already notified for, so reruns within the trigger window
don't double-fire.
"""
from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from ipl.config import FIXTURES_DIR

SCHEDULE_PATH = FIXTURES_DIR / "ipl_schedule.json"
SENT_PATH = FIXTURES_DIR / "sent.json"


def load_schedule(path: Path | None = None) -> list[dict[str, Any]]:
    p = path if path is not None else SCHEDULE_PATH
    with p.open() as fh:
        data = json.load(fh)
    return data.get("matches", [])


def load_sent(path: Path | None = None) -> set[str]:
    p = path if path is not None else SENT_PATH
    if not p.exists():
        return set()
    with p.open() as fh:
        return set(json.load(fh))


def mark_sent(match_key: str, path: Path | None = None) -> None:
    p = path if path is not None else SENT_PATH
    sent = load_sent(p)
    sent.add(match_key)
    p.parent.mkdir(parents=True, exist_ok=True)
    with p.open("w") as fh:
        json.dump(sorted(sent), fh, indent=2)
        fh.write("\n")


def parse_iso(value: str) -> datetime:
    if value.endswith("Z"):
        value = value[:-1] + "+00:00"
    dt = datetime.fromisoformat(value)
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def pick_due_match(
    matches: list[dict[str, Any]],
    now: datetime,
    *,
    lead_minutes: int = 30,
    window_minutes: int = 6,
    sent: set[str] | None = None,
) -> dict[str, Any] | None:
    """Pick the match whose start is `lead_minutes` from `now` (within window).

    The window accommodates the cron's 5-minute granularity: a match is "due"
    when `lead - window/2  <=  start - now  <=  lead + window/2`.

    Already-sent matches are skipped.
    """
    sent = sent or set()
    target_low = timedelta(minutes=lead_minutes - window_minutes / 2)
    target_high = timedelta(minutes=lead_minutes + window_minutes / 2)

    for m in matches:
        if m.get("match_key") in sent:
            continue
        try:
            start = parse_iso(m["scheduled_start_utc"])
        except (KeyError, ValueError):
            continue
        delta = start - now
        if target_low <= delta <= target_high:
            return m
    return None
