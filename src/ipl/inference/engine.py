"""Anthropic SDK call + response parsing.

When ANTHROPIC_API_KEY is unset the engine returns the canned
`data/fixtures/claude_response.json` payload so the rest of the system
(API, scheduler, dashboard, tests) still functions end-to-end locally.
"""
from __future__ import annotations

import json
from typing import Any

from ipl.config import FIXTURES_DIR, settings
from ipl.inference.prompt import (
    SYSTEM_PROMPT,
    WEIGHT_VARIABLES,
    PromptContext,
    render_prompt,
)

CLAUDE_FIXTURE = FIXTURES_DIR / "claude_response.json"


def predict(ctx: PromptContext) -> dict[str, Any]:
    """Send the prompt to Claude Opus and return the validated JSON response."""
    user_prompt = render_prompt(ctx)
    raw = _call_claude(user_prompt) if settings.anthropic_api_key else _load_fixture()
    return _validate(raw)


def _call_claude(user_prompt: str) -> dict[str, Any]:
    from anthropic import Anthropic

    client = Anthropic(api_key=settings.anthropic_api_key)
    message = client.messages.create(
        model=settings.anthropic_model,
        max_tokens=2048,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}],
    )
    text = "".join(block.text for block in message.content if getattr(block, "type", "") == "text")
    return _parse_json(text)


def _load_fixture() -> dict[str, Any]:
    with CLAUDE_FIXTURE.open() as fh:
        return json.load(fh)


def _parse_json(text: str) -> dict[str, Any]:
    text = text.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.lower().startswith("json"):
            text = text[4:].strip()
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError(f"Claude response did not contain JSON: {text[:200]!r}")
    return json.loads(text[start : end + 1])


def _validate(payload: dict[str, Any]) -> dict[str, Any]:
    weights = payload.get("step1_weights", {})
    if set(weights.keys()) != set(WEIGHT_VARIABLES):
        missing = set(WEIGHT_VARIABLES) - set(weights.keys())
        extra = set(weights.keys()) - set(WEIGHT_VARIABLES)
        raise ValueError(f"weight variables mismatch — missing={missing} extra={extra}")
    total = sum(int(v) for v in weights.values())
    if total != 100:
        raise ValueError(f"weights must sum to 100, got {total}")

    pred = payload.get("step2_prediction", {})
    pa = float(pred.get("win_probability_a", 0))
    pb = float(pred.get("win_probability_b", 0))
    if not 0.99 <= pa + pb <= 1.01:
        raise ValueError(f"win probabilities must sum to 1.0, got {pa + pb:.3f}")
    return payload
