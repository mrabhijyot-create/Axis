"""State-machine tests for the prediction scheduler. No real time involved —
we drive `now` through a manual clock and call tick() directly so the scheduler
never starts a background thread."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from apscheduler.schedulers.base import BaseScheduler

from ipl.api.scheduler import Phase, PredictionScheduler


class _FakeClock:
    def __init__(self, start: datetime) -> None:
        self.now_value = start

    def __call__(self) -> datetime:
        return self.now_value

    def advance(self, **kwargs) -> None:
        self.now_value += timedelta(**kwargs)


class _NoopScheduler(BaseScheduler):
    """No-op APScheduler so .start() / .shutdown() don't spawn threads in tests."""

    def start(self, paused: bool = False) -> None:  # noqa: D401
        pass

    def shutdown(self, wait: bool = True) -> None:  # noqa: D401
        pass

    def wakeup(self) -> None:
        pass

    def _create_default_executor(self):
        return None

    def _create_lock(self):
        import threading

        return threading.RLock()


def _make(now: _FakeClock, payload_seq: list[dict], on_predict=lambda: None) -> PredictionScheduler:
    iterator = iter(payload_seq)
    last = {"value": payload_seq[0] if payload_seq else {}}

    def fetch() -> dict:
        try:
            last["value"] = next(iterator)
        except StopIteration:
            pass
        return last["value"]

    return PredictionScheduler(
        on_predict=on_predict,
        now=now,
        live_fetcher=fetch,
        scheduler=_NoopScheduler(),
    )


def test_idle_to_warmup_transition_at_t_minus_30():
    start = datetime(2026, 5, 10, 14, 0, tzinfo=timezone.utc)
    clock = _FakeClock(start - timedelta(minutes=29))
    payload = {"scheduled_start_utc": start.isoformat(), "toss": None}
    sched = _make(clock, [payload])

    assert sched.tick() is Phase.WARMUP


def test_does_not_warmup_when_match_too_far_away():
    start = datetime(2026, 5, 10, 14, 0, tzinfo=timezone.utc)
    clock = _FakeClock(start - timedelta(hours=3))
    sched = _make(clock, [{"scheduled_start_utc": start.isoformat()}])

    assert sched.tick() is Phase.IDLE


def test_warmup_promotes_to_active_inside_t_minus_10():
    start = datetime(2026, 5, 10, 14, 0, tzinfo=timezone.utc)
    clock = _FakeClock(start - timedelta(minutes=20))
    payload = {"scheduled_start_utc": start.isoformat(), "toss": None}
    sched = _make(clock, [payload, payload])

    sched.tick()  # IDLE -> WARMUP
    clock.advance(minutes=12)  # now T-8
    assert sched.tick() is Phase.ACTIVE


def test_toss_detection_triggers_prediction_and_done():
    calls: list[int] = []
    start = datetime(2026, 5, 10, 14, 0, tzinfo=timezone.utc)
    clock = _FakeClock(start - timedelta(minutes=12))
    no_toss = {"scheduled_start_utc": start.isoformat(), "toss": None}
    with_toss = {
        "scheduled_start_utc": start.isoformat(),
        "toss": {"winner": "MI", "decision": "bat"},
    }
    sched = _make(clock, [no_toss, with_toss], on_predict=lambda: calls.append(1))

    sched.tick()  # WARMUP
    assert sched.tick() is Phase.DONE
    assert calls == [1]
