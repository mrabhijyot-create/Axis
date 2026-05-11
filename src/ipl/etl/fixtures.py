"""Refresh `data/fixtures/ipl_schedule.json` from CricAPI.

CricAPI v1 (https://cricapi.com) has a free tier of ~100 calls/day. We use:
  GET /v1/series          ?apikey=&search=indian premier league
  GET /v1/series_info     ?apikey=&id=<series_id>

The two-step flow is required because the matches list is series-scoped. We
pick the IPL series whose name matches the requested season (defaulting to
the current calendar year), then transform CricAPI's `matchList` into the
schema `ipl.schedule` expects.

Match key strategy: prefer CricAPI's own `id` (stable across reschedules);
fall back to a synthetic `<date>-<short_a>-vs-<short_b>` for entries missing it.
"""
from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx

from ipl.config import FIXTURES_DIR

CRICAPI_BASE = "https://api.cricapi.com/v1"
SCHEDULE_PATH = FIXTURES_DIR / "ipl_schedule.json"


def refresh(
    *,
    season: str | None = None,
    output: Path | None = None,
    api_key: str | None = None,
    client: httpx.Client | None = None,
) -> int:
    """Pull the IPL fixture list from CricAPI and write `ipl_schedule.json`.

    Returns the number of upcoming matches written.
    """
    api_key = api_key or os.environ.get("CRICAPI_KEY")
    if not api_key:
        raise RuntimeError("CRICAPI_KEY env var is not set")

    output = output or SCHEDULE_PATH
    season = season or str(datetime.now(timezone.utc).year)

    owns_client = client is None
    client = client or httpx.Client(timeout=15.0)
    try:
        series_id = _find_series_id(client, api_key, season)
        if not series_id:
            raise RuntimeError(f"could not find IPL {season} series in CricAPI")
        info = _get_series_info(client, api_key, series_id)
    finally:
        if owns_client:
            client.close()

    matches = _normalize_matches(info)
    payload = {"season": season, "matches": matches}
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, indent=2) + "\n")
    return len(matches)


def _find_series_id(client: httpx.Client, api_key: str, season: str) -> str | None:
    resp = client.get(
        f"{CRICAPI_BASE}/series",
        params={"apikey": api_key, "search": "indian premier league"},
    )
    resp.raise_for_status()
    body = resp.json()
    if body.get("status") != "success":
        raise RuntimeError(f"CricAPI series search failed: {body!r}")

    candidates = body.get("data") or []
    candidates.sort(key=lambda r: r.get("startDate", ""), reverse=True)
    for row in candidates:
        if season in (row.get("name") or ""):
            return row.get("id")
    return candidates[0].get("id") if candidates else None


def _get_series_info(client: httpx.Client, api_key: str, series_id: str) -> dict[str, Any]:
    resp = client.get(
        f"{CRICAPI_BASE}/series_info",
        params={"apikey": api_key, "id": series_id},
    )
    resp.raise_for_status()
    body = resp.json()
    if body.get("status") != "success":
        raise RuntimeError(f"CricAPI series_info failed: {body!r}")
    return body.get("data") or {}


def _normalize_matches(info: dict[str, Any]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for m in info.get("matchList") or []:
        teams = m.get("teams") or []
        if len(teams) < 2:
            continue
        team_a, team_b = teams[0], teams[1]

        team_info = m.get("teamInfo") or []
        short_lookup = {t.get("name"): t.get("shortname") for t in team_info}

        scheduled = _to_utc_z(m.get("dateTimeGMT") or m.get("date"))
        if not scheduled:
            continue

        venue_name, city = _split_venue(m.get("venue"))

        match_key = m.get("id") or _synth_key(
            scheduled, short_lookup.get(team_a, team_a), short_lookup.get(team_b, team_b)
        )

        out.append(
            {
                "match_key": match_key,
                "match_label": m.get("name") or f"{team_a} vs {team_b}",
                "scheduled_start_utc": scheduled,
                "venue": {
                    "name": venue_name or "Unknown",
                    "city": city or None,
                    "country": "India",
                },
                "teams": [
                    {"name": team_a, "short_name": short_lookup.get(team_a)},
                    {"name": team_b, "short_name": short_lookup.get(team_b)},
                ],
                "context": {
                    "cricapi_match_id": m.get("id"),
                    "match_type": m.get("matchType"),
                    "status": m.get("status"),
                },
            }
        )

    out.sort(key=lambda r: r["scheduled_start_utc"])
    return out


def _split_venue(value: str | None) -> tuple[str, str]:
    if not value:
        return "", ""
    parts = [p.strip() for p in value.split(",")]
    if len(parts) == 1:
        return parts[0], ""
    return parts[0], parts[-1]


def _to_utc_z(value: str | None) -> str | None:
    """Parse a CricAPI date(time) string into 'YYYY-MM-DDTHH:MM:SSZ'."""
    if not value:
        return None
    try:
        normalised = value.replace("Z", "+00:00")
        if "T" in normalised:
            dt = datetime.fromisoformat(normalised)
        else:
            # date-only entries default to 14:00 UTC ≈ 19:30 IST evening match
            dt = datetime.fromisoformat(normalised).replace(hour=14, minute=0)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    except ValueError:
        return None


def _synth_key(scheduled: str, a: str | None, b: str | None) -> str:
    date_part = scheduled[:10]
    a_short = (a or "a").lower().replace(" ", "-")
    b_short = (b or "b").lower().replace(" ", "-")
    return f"{date_part}-{a_short}-vs-{b_short}"
