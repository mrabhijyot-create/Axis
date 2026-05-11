"""Send IPL predictions to Telegram.

Required env vars:
  TELEGRAM_BOT_TOKEN   — token from @BotFather
  TELEGRAM_CHAT_ID     — your chat ID (DM the bot then GET getUpdates)

If either is unset, `send_telegram` prints to stdout and returns False, so the
GitHub Actions log still shows the message body during dry runs.
"""
from __future__ import annotations

import os
from typing import Any

import httpx

TELEGRAM_API = "https://api.telegram.org"


def send_telegram(text: str, *, parse_mode: str = "HTML") -> bool:
    """Return True iff the message was actually delivered to Telegram."""
    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    chat_id = os.environ.get("TELEGRAM_CHAT_ID")
    if not token or not chat_id:
        print("[telegram-stub]\n" + text)
        return False
    resp = httpx.post(
        f"{TELEGRAM_API}/bot{token}/sendMessage",
        json={
            "chat_id": chat_id,
            "text": text,
            "parse_mode": parse_mode,
            "disable_web_page_preview": True,
        },
        timeout=10.0,
    )
    resp.raise_for_status()
    return True


def format_prediction(payload: dict[str, Any], match_label: str | None = None) -> str:
    """Render a Claude response into a compact Telegram HTML message."""
    pred = payload["step2_prediction"]
    weights = payload.get("step1_weights", {})

    a = pred["team_a"]
    b = pred["team_b"]
    pa = pred["win_probability_a"] * 100
    pb = pred["win_probability_b"] * 100
    favored = a if pa >= pb else b
    confidence = pred.get("confidence", "—")

    drivers = pred.get("primary_drivers", [])[:3]
    drivers_block = "\n".join(f"• {_escape(d)}" for d in drivers)

    top_weights = sorted(weights.items(), key=lambda kv: -kv[1])[:3]
    weights_block = " · ".join(
        f"{_escape(k.replace('_', ' '))} {v}%" for k, v in top_weights
    )

    header = f"🏏 <b>IPL Prediction</b>"
    if match_label:
        header += f"\n<i>{_escape(match_label)}</i>"

    return (
        f"{header}\n\n"
        f"<b>{_escape(a)}</b> {pa:.0f}%   vs   <b>{_escape(b)}</b> {pb:.0f}%\n"
        f"Edge → <b>{_escape(favored)}</b>  <i>(confidence: {_escape(confidence)})</i>\n\n"
        f"<b>Top drivers</b>\n{drivers_block}\n\n"
        f"<i>Top weights</i>: {weights_block}"
    )


def _escape(s: Any) -> str:
    return (
        str(s)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )
