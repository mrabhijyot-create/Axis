"""Verify prompt construction and response validation."""
from __future__ import annotations

import json

import pytest

from ipl.inference.engine import _parse_json, _validate, predict
from ipl.inference.prompt import (
    PromptContext,
    WEIGHT_VARIABLES,
    build_prompt_context,
    render_prompt,
)


def _live_payload() -> dict:
    return {
        "match_label": "Test Match",
        "venue": {"name": "Wankhede Stadium", "city": "Mumbai"},
        "teams": [
            {"name": "Mumbai Indians", "playing_xi": ["A", "B"], "impact_options": ["X"]},
            {"name": "Chennai Super Kings", "playing_xi": ["C", "D"], "impact_options": ["Y"]},
        ],
        "toss": {"winner": "Mumbai Indians", "decision": "bat"},
        "context": {"tournament_phase": "league_mid"},
    }


def test_render_prompt_includes_both_teams_and_toss():
    ctx = build_prompt_context(_live_payload(), {"temperature_c": 30}, session=None)
    rendered = render_prompt(ctx)
    assert "Mumbai Indians" in rendered
    assert "Chennai Super Kings" in rendered
    assert "Wankhede" in rendered
    assert "toss" in rendered.lower()


def test_predict_returns_validated_fixture(monkeypatch):
    monkeypatch.setattr("ipl.inference.engine.settings.anthropic_api_key", None)
    ctx = PromptContext(
        live_match=_live_payload(),
        weather={"temperature_c": 30},
        venue_history={},
        recent_form={},
    )
    result = predict(ctx)
    assert set(result["step1_weights"].keys()) == set(WEIGHT_VARIABLES)
    assert sum(result["step1_weights"].values()) == 100
    pa = result["step2_prediction"]["win_probability_a"]
    pb = result["step2_prediction"]["win_probability_b"]
    assert abs(pa + pb - 1.0) < 1e-6


def test_validate_rejects_bad_weights():
    bad = {
        "step1_weights": {k: 10 for k in WEIGHT_VARIABLES},
        "step2_prediction": {"win_probability_a": 0.5, "win_probability_b": 0.5},
    }
    bad["step1_weights"]["toss"] = 50  # 7 * 10 + 50 = 120
    with pytest.raises(ValueError, match="100"):
        _validate(bad)


def test_validate_rejects_bad_probabilities():
    weights = {k: 100 // len(WEIGHT_VARIABLES) for k in WEIGHT_VARIABLES}
    # Force the sum to exactly 100.
    delta = 100 - sum(weights.values())
    weights[WEIGHT_VARIABLES[0]] += delta
    bad = {
        "step1_weights": weights,
        "step2_prediction": {"win_probability_a": 0.7, "win_probability_b": 0.7},
    }
    with pytest.raises(ValueError, match="probabilities"):
        _validate(bad)


def test_parse_json_strips_code_fences():
    text = "```json\n" + json.dumps({"foo": 1}) + "\n```"
    assert _parse_json(text) == {"foo": 1}
