"""Schedule picker + sent-state idempotency."""
from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

from ipl.schedule import load_sent, mark_sent, pick_due_match


def _matches(now: datetime) -> list[dict]:
    return [
        {
            "match_key": "m-now",
            "scheduled_start_utc": (now + timedelta(minutes=30)).isoformat().replace("+00:00", "Z"),
        },
        {
            "match_key": "m-far",
            "scheduled_start_utc": (now + timedelta(hours=4)).isoformat().replace("+00:00", "Z"),
        },
        {
            "match_key": "m-past",
            "scheduled_start_utc": (now - timedelta(minutes=10)).isoformat().replace("+00:00", "Z"),
        },
    ]


def test_pick_due_match_inside_window():
    now = datetime(2026, 5, 10, 13, 30, tzinfo=timezone.utc)
    out = pick_due_match(_matches(now), now)
    assert out is not None
    assert out["match_key"] == "m-now"


def test_pick_due_match_skips_already_sent():
    now = datetime(2026, 5, 10, 13, 30, tzinfo=timezone.utc)
    out = pick_due_match(_matches(now), now, sent={"m-now"})
    assert out is None


def test_pick_due_match_outside_window():
    now = datetime(2026, 5, 10, 13, 30, tzinfo=timezone.utc)
    out = pick_due_match(_matches(now), now, lead_minutes=120, window_minutes=4)
    assert out is None  # nothing 2 hours out


def test_mark_sent_roundtrip(tmp_path):
    path = tmp_path / "sent.json"
    assert load_sent(path) == set()
    mark_sent("m-1", path)
    mark_sent("m-2", path)
    assert load_sent(path) == {"m-1", "m-2"}
    # Disk format is a sorted JSON array.
    with path.open() as fh:
        assert json.load(fh) == ["m-1", "m-2"]
