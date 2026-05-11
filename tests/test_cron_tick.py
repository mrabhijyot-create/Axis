"""End-to-end cron tick: schedule pick → predict → notify → mark sent.

Uses an isolated SQLite DB and an isolated sent.json so the test never
mutates real data on disk.
"""
from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

from ipl.db.models import Base, Prediction


def _patch_paths(monkeypatch, tmp_path):
    # Isolated DB
    db_url = f"sqlite:///{tmp_path / 'test.db'}"
    engine = create_engine(db_url, future=True)
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    monkeypatch.setattr("ipl.db.session.engine", engine)
    monkeypatch.setattr("ipl.db.session.SessionLocal", Session)
    monkeypatch.setattr("ipl.cron.SessionLocal", Session, raising=False)
    monkeypatch.setattr("ipl.cron.init_db", lambda: None)

    # Isolated schedule + sent
    schedule_path = tmp_path / "schedule.json"
    sent_path = tmp_path / "sent.json"
    monkeypatch.setattr("ipl.schedule.SCHEDULE_PATH", schedule_path)
    monkeypatch.setattr("ipl.schedule.SENT_PATH", sent_path)
    return Session, schedule_path, sent_path


def _write_schedule(path, start: datetime):
    payload = {
        "season": "2026",
        "matches": [
            {
                "match_key": "test-match-1",
                "match_label": "Test Match",
                "scheduled_start_utc": start.isoformat().replace("+00:00", "Z"),
                "venue": {"name": "Test Stadium", "city": "Mumbai"},
                "teams": [
                    {"name": "Mumbai Indians"},
                    {"name": "Chennai Super Kings"},
                ],
            }
        ],
    }
    path.write_text(json.dumps(payload))


def test_cron_tick_inside_window_predicts_and_marks_sent(monkeypatch, tmp_path):
    Session, schedule_path, sent_path = _patch_paths(monkeypatch, tmp_path)
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    monkeypatch.delenv("TELEGRAM_BOT_TOKEN", raising=False)

    now = datetime(2026, 5, 10, 13, 30, tzinfo=timezone.utc)
    _write_schedule(schedule_path, now + timedelta(minutes=30))

    from ipl import cron

    rc = cron.main(now=now)
    assert rc == 0

    # Prediction persisted
    with Session() as s:
        rows = s.execute(select(Prediction)).scalars().all()
        assert len(rows) == 1
        assert rows[0].match_key == "test-match-1"
        assert abs(rows[0].win_probability_a + rows[0].win_probability_b - 1.0) < 1e-6

    # sent.json updated
    assert json.loads(sent_path.read_text()) == ["test-match-1"]


def test_cron_tick_outside_window_is_noop(monkeypatch, tmp_path):
    Session, schedule_path, sent_path = _patch_paths(monkeypatch, tmp_path)
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    monkeypatch.delenv("TELEGRAM_BOT_TOKEN", raising=False)

    now = datetime(2026, 5, 10, 13, 30, tzinfo=timezone.utc)
    # Match is 4 hours away.
    _write_schedule(schedule_path, now + timedelta(hours=4))

    from ipl import cron

    rc = cron.main(now=now)
    assert rc == 0

    with Session() as s:
        assert s.execute(select(Prediction)).scalars().all() == []
    assert not sent_path.exists()


def test_cron_tick_idempotent_for_same_match(monkeypatch, tmp_path):
    Session, schedule_path, sent_path = _patch_paths(monkeypatch, tmp_path)
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    monkeypatch.delenv("TELEGRAM_BOT_TOKEN", raising=False)

    now = datetime(2026, 5, 10, 13, 30, tzinfo=timezone.utc)
    _write_schedule(schedule_path, now + timedelta(minutes=30))

    from ipl import cron

    cron.main(now=now)
    cron.main(now=now + timedelta(seconds=30))  # second tick same window

    with Session() as s:
        rows = s.execute(select(Prediction)).scalars().all()
        # Idempotent: only one row, even though we ticked twice.
        assert len(rows) == 1
