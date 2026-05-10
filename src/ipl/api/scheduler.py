"""APScheduler-driven state machine that runs the live ingestion / prediction loop.

States (single match in flight):
  IDLE     — hourly tick, no live match within `warmup_lead_minutes`
  WARMUP   — T-30 → T-10: poll the live JSON feed every 30s for XIs / toss
  ACTIVE   — T-10 → toss: also fetch weather; keep polling for the toss
  EXECUTE  — toss detected → trigger Claude Opus → store Prediction → DONE
  DONE     — no further work for this match

`now()` is injected so tests can freeze the clock.
"""
from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Any

from apscheduler.schedulers.background import BackgroundScheduler

from ipl.config import settings
from ipl.etl.live import fetch_live_match, toss_decided


class Phase(str, Enum):
    IDLE = "idle"
    WARMUP = "warmup"
    ACTIVE = "active"
    EXECUTE = "execute"
    DONE = "done"


@dataclass
class State:
    phase: Phase = Phase.IDLE
    next_match_start_utc: datetime | None = None
    last_payload: dict[str, Any] | None = None


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _parse_iso(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        if value.endswith("Z"):
            value = value[:-1] + "+00:00"
        dt = datetime.fromisoformat(value)
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    except ValueError:
        return None


class PredictionScheduler:
    """Wraps APScheduler with a tiny state machine. Designed to be unit-testable."""

    def __init__(
        self,
        on_predict: Callable[[], Any],
        *,
        now: Callable[[], datetime] = _utcnow,
        live_fetcher: Callable[[], dict[str, Any]] = fetch_live_match,
        scheduler: BackgroundScheduler | None = None,
    ) -> None:
        self._on_predict = on_predict
        self._now = now
        self._fetch = live_fetcher
        self._scheduler = scheduler or BackgroundScheduler(timezone="UTC")
        self.state = State()

    @property
    def phase(self) -> str:
        return self.state.phase.value

    def start(self) -> None:
        self._scheduler.add_job(self.tick, "interval", seconds=60, id="state-tick", replace_existing=True)
        self._scheduler.start()

    def shutdown(self) -> None:
        if self._scheduler.running:
            self._scheduler.shutdown(wait=False)

    def tick(self) -> Phase:
        """Single state-machine step. Returns the resulting phase (handy for tests)."""
        now = self._now()

        if self.state.phase is Phase.DONE:
            return self.state.phase

        if self.state.phase is Phase.IDLE:
            self._maybe_enter_warmup(now)
            return self.state.phase

        # WARMUP / ACTIVE both keep polling the live feed.
        payload = self._fetch()
        self.state.last_payload = payload

        if self.state.phase is Phase.WARMUP:
            self._maybe_promote_to_active(now)
        if self.state.phase in {Phase.WARMUP, Phase.ACTIVE} and toss_decided(payload):
            self._execute()

        return self.state.phase

    def _maybe_enter_warmup(self, now: datetime) -> None:
        try:
            payload = self._fetch()
        except Exception:
            return
        start = _parse_iso(payload.get("scheduled_start_utc"))
        if not start:
            return
        if start - now <= timedelta(minutes=settings.warmup_lead_minutes) and start > now:
            self.state.next_match_start_utc = start
            self.state.last_payload = payload
            self.state.phase = Phase.WARMUP

    def _maybe_promote_to_active(self, now: datetime) -> None:
        start = self.state.next_match_start_utc
        if start and start - now <= timedelta(minutes=settings.active_lead_minutes):
            self.state.phase = Phase.ACTIVE

    def _execute(self) -> None:
        self.state.phase = Phase.EXECUTE
        try:
            self._on_predict()
        finally:
            self.state.phase = Phase.DONE

    def reset(self) -> None:
        self.state = State()
