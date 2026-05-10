"""Prompt construction for the two-step Claude Opus prediction.

Step 1: dynamically allocate percentage weights to the 8 core variables.
Step 2: emit a structured JSON object with win probabilities and drivers.
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from ipl.db.models import Match, Team

WEIGHT_VARIABLES = [
    "venue_target_pressure",
    "key_matchup_index",
    "squad_rotation_delta",
    "impact_player_variance",
    "phase_execution_delta",
    "toss",
    "tournament_context",
    "schedule_fatigue",
]

SYSTEM_PROMPT = """You are an expert T20 cricket analyst specialised in IPL match
prediction. You reason in two distinct steps and your final output is a single
valid JSON object — nothing else.

Step 1 — Dynamic weight allocation.
Allocate integer percentage weights (summing to exactly 100) across these eight
variables, choosing values that reflect the specific pitch, weather and
tournament context of the match described:
  1. venue_target_pressure   — historical 1st-vs-2nd innings advantage at venue
  2. key_matchup_index       — leverage of best individual matchups
  3. squad_rotation_delta    — XI churn vs prior fixture
  4. impact_player_variance  — variance introduced by the Impact Player rule
  5. phase_execution_delta   — gap between teams in PP / middle / death execution
  6. toss                    — bat/field decision influence
  7. tournament_context      — playoff race, must-win, NRR pressure
  8. schedule_fatigue        — travel + days-rest delta

Step 2 — Final prediction.
Using those weights as your prior, compute win probabilities for the two teams
(values must sum to 1.0) and supply 3–5 short, concrete textual drivers.

Return JSON with this exact shape:

{
  "step1_weights": { "<variable>": <int>, ... 8 keys, sum to 100 },
  "step1_rationale": "<2–4 sentences>",
  "step2_prediction": {
    "team_a": "<name>",
    "team_b": "<name>",
    "win_probability_a": <float 0..1>,
    "win_probability_b": <float 0..1>,
    "primary_drivers": ["<driver1>", "<driver2>", ...],
    "confidence": "low" | "medium" | "high"
  }
}
"""


@dataclass
class PromptContext:
    live_match: dict[str, Any]
    weather: dict[str, Any]
    venue_history: dict[str, Any]
    recent_form: dict[str, list[dict[str, Any]]]


def build_prompt_context(
    live_match: dict[str, Any],
    weather: dict[str, Any],
    session: Session | None = None,
) -> PromptContext:
    """Compile the per-match context the prompt is rendered against."""
    venue_history = _venue_history(session, live_match.get("venue", {}).get("name"))
    teams = [t["name"] for t in live_match.get("teams", [])]
    recent = {name: _recent_matches(session, name, limit=5) for name in teams}
    return PromptContext(
        live_match=live_match,
        weather=weather,
        venue_history=venue_history,
        recent_form=recent,
    )


def _venue_history(session: Session | None, venue_name: str | None) -> dict[str, Any]:
    if session is None or not venue_name:
        return {"matches_in_db": 0, "first_innings_avg": None, "chase_win_pct": None}

    from ipl.db.models import Innings, Venue

    venue = session.execute(select(Venue).where(Venue.name == venue_name)).scalar_one_or_none()
    if not venue:
        return {"matches_in_db": 0, "first_innings_avg": None, "chase_win_pct": None}

    matches = session.execute(select(Match).where(Match.venue_id == venue.id)).scalars().all()
    if not matches:
        return {"matches_in_db": 0, "first_innings_avg": None, "chase_win_pct": None}

    first_innings_totals: list[int] = []
    chase_wins = 0
    decided = 0
    for m in matches:
        first_inn = session.execute(
            select(Innings).where(Innings.match_id == m.id, Innings.innings_number == 1)
        ).scalar_one_or_none()
        if first_inn:
            first_innings_totals.append(first_inn.runs)
        if m.winner_id and m.team1_id and m.team2_id:
            decided += 1
            second_inn = session.execute(
                select(Innings).where(Innings.match_id == m.id, Innings.innings_number == 2)
            ).scalar_one_or_none()
            if second_inn and second_inn.batting_team_id == m.winner_id:
                chase_wins += 1

    return {
        "matches_in_db": len(matches),
        "first_innings_avg": (
            round(sum(first_innings_totals) / len(first_innings_totals), 1)
            if first_innings_totals
            else None
        ),
        "chase_win_pct": round(100 * chase_wins / decided, 1) if decided else None,
    }


def _recent_matches(session: Session | None, team_name: str, limit: int) -> list[dict[str, Any]]:
    if session is None:
        return []
    team = session.execute(select(Team).where(Team.name == team_name)).scalar_one_or_none()
    if not team:
        return []
    rows = (
        session.execute(
            select(Match)
            .where((Match.team1_id == team.id) | (Match.team2_id == team.id))
            .order_by(Match.match_date.desc())
            .limit(limit)
        )
        .scalars()
        .all()
    )
    return [
        {
            "date": str(m.match_date) if m.match_date else None,
            "won": m.winner_id == team.id if m.winner_id else None,
            "margin": m.win_margin,
        }
        for m in rows
    ]


def render_prompt(ctx: PromptContext) -> str:
    """Format the user-turn payload sent to Claude."""
    teams = ctx.live_match.get("teams", [])
    team_a = teams[0]["name"] if teams else "Team A"
    team_b = teams[1]["name"] if len(teams) > 1 else "Team B"

    payload = {
        "match": {
            "label": ctx.live_match.get("match_label"),
            "team_a": team_a,
            "team_b": team_b,
            "venue": ctx.live_match.get("venue"),
            "context": ctx.live_match.get("context"),
            "toss": ctx.live_match.get("toss"),
        },
        "playing_xis": [
            {
                "team": t["name"],
                "playing_xi": t.get("playing_xi", []),
                "impact_options": t.get("impact_options", []),
                "recent_form": t.get("recent_form", []),
            }
            for t in teams
        ],
        "weather": ctx.weather,
        "venue_history": ctx.venue_history,
        "recent_match_form": ctx.recent_form,
    }
    return (
        "Predict the outcome of the following IPL match. Follow the two-step "
        "procedure exactly and return a single JSON object.\n\n"
        f"{json.dumps(payload, indent=2)}"
    )
