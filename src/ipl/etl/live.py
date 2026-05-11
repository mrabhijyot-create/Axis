"""Live JSON feed scraper for playing-XI / toss announcements.

Real implementation hits `settings.live_feed_url` with browser-style headers.
When that env var is unset, we fall back to `data/fixtures/live_match.json` so
the rest of the system still runs end-to-end.
"""
from __future__ import annotations

import json
from typing import Any

import httpx

from ipl.config import FIXTURES_DIR, settings

BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 "
        "(KHTML, like Gecko) Version/17.4 Safari/605.1.15"
    ),
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Cache-Control": "no-cache",
}

LIVE_FIXTURE = FIXTURES_DIR / "live_match.json"
WEATHER_FIXTURE = FIXTURES_DIR / "weather.json"


def fetch_live_match(client: httpx.Client | None = None) -> dict[str, Any]:
    """Return the current live-match payload (toss, XIs, venue, context)."""
    if not settings.live_feed_url:
        with LIVE_FIXTURE.open() as fh:
            return json.load(fh)

    owns_client = client is None
    client = client or httpx.Client(headers=BROWSER_HEADERS, timeout=10.0)
    try:
        resp = client.get(settings.live_feed_url)
        resp.raise_for_status()
        return resp.json()
    finally:
        if owns_client:
            client.close()


def fetch_weather(city: str, client: httpx.Client | None = None) -> dict[str, Any]:
    """OpenWeatherMap current-weather; falls back to fixture when no key."""
    if not settings.openweather_api_key:
        with WEATHER_FIXTURE.open() as fh:
            return json.load(fh)

    owns_client = client is None
    client = client or httpx.Client(timeout=10.0)
    try:
        resp = client.get(
            "https://api.openweathermap.org/data/2.5/weather",
            params={"q": city, "appid": settings.openweather_api_key, "units": "metric"},
        )
        resp.raise_for_status()
        raw = resp.json()
    finally:
        if owns_client:
            client.close()

    return {
        "city": city,
        "temperature_c": raw.get("main", {}).get("temp"),
        "humidity_pct": raw.get("main", {}).get("humidity"),
        "wind_kph": (raw.get("wind", {}).get("speed") or 0) * 3.6,
        "cloud_cover_pct": raw.get("clouds", {}).get("all"),
        "precipitation_mm": (raw.get("rain") or {}).get("1h", 0.0),
        "summary": (raw.get("weather") or [{}])[0].get("description"),
    }


def toss_decided(payload: dict[str, Any]) -> bool:
    toss = payload.get("toss") or {}
    return bool(toss.get("winner") and toss.get("decision"))
