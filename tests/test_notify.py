"""Telegram notifier — message shape + send/stub paths."""
from __future__ import annotations

import json
from pathlib import Path

import httpx

from ipl.notify import format_prediction, send_telegram

FIXTURE = Path(__file__).resolve().parents[1] / "data" / "fixtures" / "claude_response.json"


def _payload() -> dict:
    with FIXTURE.open() as fh:
        return json.load(fh)


def test_format_prediction_contains_teams_and_drivers():
    text = format_prediction(_payload(), match_label="RCB vs CSK")
    assert "Royal Challengers Bengaluru" in text
    assert "Chennai Super Kings" in text
    assert "Edge" in text
    assert "Top drivers" in text
    # At most three drivers in the formatted message.
    driver_lines = [line for line in text.splitlines() if line.startswith("•")]
    assert 1 <= len(driver_lines) <= 3


def test_format_prediction_html_escapes_team_names():
    bad = _payload()
    bad["step2_prediction"]["team_a"] = "X & <Co>"
    text = format_prediction(bad)
    assert "&amp;" in text
    assert "&lt;Co&gt;" in text
    assert "<Co>" not in text  # raw < not present (HTML safe)


def test_send_telegram_returns_false_without_credentials(monkeypatch, capsys):
    monkeypatch.delenv("TELEGRAM_BOT_TOKEN", raising=False)
    monkeypatch.delenv("TELEGRAM_CHAT_ID", raising=False)
    assert send_telegram("hello") is False
    out = capsys.readouterr().out
    assert "[telegram-stub]" in out
    assert "hello" in out


def test_send_telegram_posts_with_credentials(monkeypatch):
    monkeypatch.setenv("TELEGRAM_BOT_TOKEN", "tok")
    monkeypatch.setenv("TELEGRAM_CHAT_ID", "42")
    captured: dict = {}

    def fake_post(url, json=None, timeout=None):
        captured["url"] = url
        captured["json"] = json
        return httpx.Response(200, json={"ok": True}, request=httpx.Request("POST", url))

    monkeypatch.setattr(httpx, "post", fake_post)
    assert send_telegram("hi there") is True
    assert captured["url"].endswith("/bottok/sendMessage")
    assert captured["json"]["chat_id"] == "42"
    assert captured["json"]["text"] == "hi there"
    assert captured["json"]["parse_mode"] == "HTML"
