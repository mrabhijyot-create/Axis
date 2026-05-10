"""CricAPI fixture refresh — normalization + write path."""
from __future__ import annotations

import json

import pytest

from ipl.etl.fixtures import _normalize_matches, _to_utc_z, refresh


SERIES_SEARCH = {
    "status": "success",
    "data": [
        {"id": "ipl-2026", "name": "Indian Premier League 2026", "startDate": "2026-03-22"},
        {"id": "ipl-2025", "name": "Indian Premier League 2025", "startDate": "2025-03-22"},
    ],
}

SERIES_INFO = {
    "status": "success",
    "data": {
        "info": {"id": "ipl-2026", "name": "Indian Premier League 2026"},
        "matchList": [
            {
                "id": "match-002",
                "name": "Mumbai Indians vs Delhi Capitals, 31st Match",
                "matchType": "t20",
                "status": "Match not started",
                "venue": "Wankhede Stadium, Mumbai",
                "dateTimeGMT": "2026-05-12T14:00:00",
                "teams": ["Mumbai Indians", "Delhi Capitals"],
                "teamInfo": [
                    {"name": "Mumbai Indians", "shortname": "MI"},
                    {"name": "Delhi Capitals", "shortname": "DC"},
                ],
            },
            {
                "id": "match-001",
                "name": "Royal Challengers Bengaluru vs Chennai Super Kings, 27th Match",
                "matchType": "t20",
                "status": "Match not started",
                "venue": "M. Chinnaswamy Stadium, Bengaluru",
                "dateTimeGMT": "2026-05-10T14:00:00",
                "teams": ["Royal Challengers Bengaluru", "Chennai Super Kings"],
                "teamInfo": [
                    {"name": "Royal Challengers Bengaluru", "shortname": "RCB"},
                    {"name": "Chennai Super Kings", "shortname": "CSK"},
                ],
            },
            {
                # Malformed: missing one team. Should be skipped.
                "id": "match-bad",
                "name": "TBD",
                "venue": "TBD",
                "dateTimeGMT": "2026-05-15T14:00:00",
                "teams": ["Mumbai Indians"],
            },
        ],
    },
}


class _FakeResp:
    def __init__(self, body: dict) -> None:
        self._body = body

    def raise_for_status(self) -> None:
        return None

    def json(self) -> dict:
        return self._body


class _FakeClient:
    """Minimal httpx.Client stand-in routing the two endpoints we hit."""

    def __init__(self) -> None:
        self.calls: list[tuple[str, dict]] = []

    def get(self, url: str, params: dict | None = None) -> _FakeResp:
        self.calls.append((url, params or {}))
        if url.endswith("/series"):
            return _FakeResp(SERIES_SEARCH)
        if url.endswith("/series_info"):
            return _FakeResp(SERIES_INFO)
        raise AssertionError(f"unexpected URL {url}")

    def close(self) -> None:
        return None


def test_to_utc_z_handles_datetime_and_date_only():
    assert _to_utc_z("2026-05-10T14:00:00") == "2026-05-10T14:00:00Z"
    assert _to_utc_z("2026-05-10T14:00:00Z") == "2026-05-10T14:00:00Z"
    assert _to_utc_z("2026-05-10") == "2026-05-10T14:00:00Z"  # default to 14:00 UTC
    assert _to_utc_z("not-a-date") is None
    assert _to_utc_z(None) is None


def test_normalize_matches_skips_malformed_and_sorts_by_start():
    out = _normalize_matches(SERIES_INFO["data"])
    assert len(out) == 2  # malformed entry skipped
    # Sorted by scheduled_start_utc ascending.
    assert out[0]["scheduled_start_utc"] == "2026-05-10T14:00:00Z"
    assert out[1]["scheduled_start_utc"] == "2026-05-12T14:00:00Z"

    rcb_csk = out[0]
    assert rcb_csk["match_key"] == "match-001"  # uses CricAPI id
    assert rcb_csk["teams"][0]["short_name"] == "RCB"
    assert rcb_csk["teams"][1]["short_name"] == "CSK"
    assert rcb_csk["venue"]["name"] == "M. Chinnaswamy Stadium"
    assert rcb_csk["venue"]["city"] == "Bengaluru"
    assert rcb_csk["context"]["cricapi_match_id"] == "match-001"


def test_refresh_writes_payload_with_correct_season(tmp_path):
    output = tmp_path / "schedule.json"
    client = _FakeClient()
    n = refresh(season="2026", output=output, api_key="test-key", client=client)

    assert n == 2
    payload = json.loads(output.read_text())
    assert payload["season"] == "2026"
    assert len(payload["matches"]) == 2
    assert [m["match_key"] for m in payload["matches"]] == ["match-001", "match-002"]

    # Both endpoints were called exactly once each, with the api key forwarded.
    assert len(client.calls) == 2
    assert all(call[1].get("apikey") == "test-key" for call in client.calls)


def test_refresh_raises_without_api_key(monkeypatch, tmp_path):
    monkeypatch.delenv("CRICAPI_KEY", raising=False)
    with pytest.raises(RuntimeError, match="CRICAPI_KEY"):
        refresh(output=tmp_path / "x.json")
