"""FastAPI bridge between SQLite, the inference engine, and the Streamlit UI."""
from __future__ import annotations

from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException
from sqlalchemy import desc, select

from ipl.api.scheduler import PredictionScheduler
from ipl.db import (
    Match,
    Player,
    PlayerMatchStat,
    Prediction,
    SessionLocal,
    Team,
    init_db,
)
from ipl.etl.live import fetch_live_match, fetch_weather
from ipl.inference import build_prompt_context, predict


_scheduler: PredictionScheduler | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _scheduler
    init_db()
    _scheduler = PredictionScheduler(on_predict=run_prediction)
    _scheduler.start()
    try:
        yield
    finally:
        _scheduler.shutdown()


app = FastAPI(title="IPL Axis API", version="0.1.0", lifespan=lifespan)


@app.get("/health")
def health() -> dict[str, Any]:
    return {"status": "ok", "scheduler_phase": _scheduler.phase if _scheduler else "not-started"}


@app.get("/predictions/latest")
def latest_prediction() -> dict[str, Any]:
    with SessionLocal() as session:
        row = session.execute(
            select(Prediction).order_by(desc(Prediction.created_at)).limit(1)
        ).scalar_one_or_none()
        if not row:
            raise HTTPException(status_code=404, detail="no predictions yet")
        return _serialise_prediction(row)


@app.get("/predictions")
def list_predictions(limit: int = 25) -> list[dict[str, Any]]:
    with SessionLocal() as session:
        rows = (
            session.execute(
                select(Prediction).order_by(desc(Prediction.created_at)).limit(limit)
            )
            .scalars()
            .all()
        )
        return [_serialise_prediction(r) for r in rows]


@app.post("/predict")
def manual_predict() -> dict[str, Any]:
    """Force-run a prediction now (bypass the scheduler)."""
    return run_prediction()


@app.get("/standings")
def standings() -> list[dict[str, Any]]:
    """Compute a points-table view from the matches stored in the DB."""
    with SessionLocal() as session:
        teams = session.execute(select(Team)).scalars().all()
        out: list[dict[str, Any]] = []
        for t in teams:
            played = session.execute(
                select(Match).where((Match.team1_id == t.id) | (Match.team2_id == t.id))
            ).scalars().all()
            wins = sum(1 for m in played if m.winner_id == t.id)
            losses = sum(1 for m in played if m.winner_id and m.winner_id != t.id)
            no_result = sum(1 for m in played if m.winner_id is None)
            out.append(
                {
                    "team": t.name,
                    "short_name": t.short_name,
                    "played": len(played),
                    "won": wins,
                    "lost": losses,
                    "no_result": no_result,
                    "points": wins * 2 + no_result,
                }
            )
        out.sort(key=lambda r: (-r["points"], -r["won"], r["team"]))
        return out


@app.get("/players/{player_id}/stats")
def player_stats(player_id: int) -> dict[str, Any]:
    with SessionLocal() as session:
        player = session.get(Player, player_id)
        if not player:
            raise HTTPException(status_code=404, detail="player not found")
        rows = (
            session.execute(select(PlayerMatchStat).where(PlayerMatchStat.player_id == player_id))
            .scalars()
            .all()
        )
        if not rows:
            return {"player": player.name, "matches": 0}
        runs = sum(r.runs for r in rows)
        balls = sum(r.balls_faced for r in rows)
        wickets = sum(r.wickets for r in rows)
        overs = sum(r.overs_bowled for r in rows)
        return {
            "player": player.name,
            "matches": len(rows),
            "runs": runs,
            "balls_faced": balls,
            "strike_rate": round(100 * runs / balls, 2) if balls else None,
            "fours": sum(r.fours for r in rows),
            "sixes": sum(r.sixes for r in rows),
            "wickets": wickets,
            "overs_bowled": round(overs, 1),
            "economy": round(sum(r.runs_conceded for r in rows) / overs, 2) if overs else None,
        }


def run_prediction() -> dict[str, Any]:
    """Trigger one full inference cycle and persist the result."""
    live = fetch_live_match()
    city = (live.get("venue") or {}).get("city") or ""
    weather = fetch_weather(city)

    with SessionLocal() as session:
        ctx = build_prompt_context(live, weather, session=session)
        result = predict(ctx)

        teams = live.get("teams", [])
        team_a = teams[0]["name"] if teams else "A"
        team_b = teams[1]["name"] if len(teams) > 1 else "B"
        pred_row = Prediction(
            match_label=live.get("match_label", f"{team_a} vs {team_b}"),
            team_a=team_a,
            team_b=team_b,
            venue=(live.get("venue") or {}).get("name"),
            win_probability_a=float(result["step2_prediction"]["win_probability_a"]),
            win_probability_b=float(result["step2_prediction"]["win_probability_b"]),
            weights=result["step1_weights"],
            drivers=result["step2_prediction"].get("primary_drivers", []),
            raw_response=result,
        )
        session.add(pred_row)
        session.commit()
        return _serialise_prediction(pred_row)


def _serialise_prediction(row: Prediction) -> dict[str, Any]:
    return {
        "id": row.id,
        "created_at": row.created_at.isoformat(),
        "match_label": row.match_label,
        "team_a": row.team_a,
        "team_b": row.team_b,
        "venue": row.venue,
        "win_probability_a": row.win_probability_a,
        "win_probability_b": row.win_probability_b,
        "weights": row.weights,
        "drivers": row.drivers,
    }
