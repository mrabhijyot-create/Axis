"""Bulk-load Cricsheet ball-by-ball JSON files into the local SQLite warehouse.

Cricsheet schema (abridged):
    {
      "info": {
        "teams": ["...", "..."],
        "venue": "...",
        "city": "...",
        "dates": ["YYYY-MM-DD"],
        "season": "2024",
        "toss":   {"winner": "...", "decision": "bat" | "field"},
        "outcome":{"winner": "...", "by": {"runs": N} | {"wickets": N}},
        "players":{"<team>": ["p1", "p2", ...]}
      },
      "innings": [
        {"team": "...",
         "overs": [
           {"over": 0,
            "deliveries": [
              {"batter": "...", "bowler": "...", "non_striker": "...",
               "runs": {"batter": 1, "extras": 0, "total": 1},
               "extras": {"wides": 1}?,
               "wickets": [{"player_out": "...", "kind": "..."}]?}, ...]
           }, ...
         ]
        }
      ]
    }
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any, Iterable

from sqlalchemy import select
from sqlalchemy.orm import Session

from ipl.db.models import Delivery, Innings, Match, Player, PlayerMatchStat, Team, Venue
from ipl.db.session import get_session, init_db


def _get_or_create(session: Session, model, defaults: dict | None = None, **kwargs):
    instance = session.execute(select(model).filter_by(**kwargs)).scalar_one_or_none()
    if instance is not None:
        return instance
    instance = model(**kwargs, **(defaults or {}))
    session.add(instance)
    session.flush()
    return instance


def load_match(session: Session, payload: dict[str, Any], cricsheet_id: str | None = None) -> Match:
    info = payload.get("info", {})
    teams = info.get("teams", [])
    if len(teams) != 2:
        raise ValueError(f"Expected 2 teams, got {teams!r}")

    team1 = _get_or_create(session, Team, name=teams[0])
    team2 = _get_or_create(session, Team, name=teams[1])
    venue = _get_or_create(
        session,
        Venue,
        name=info.get("venue", "Unknown"),
        defaults={"city": info.get("city")},
    )

    match_date = None
    if dates := info.get("dates"):
        from datetime import date as _date

        try:
            match_date = _date.fromisoformat(dates[0])
        except (TypeError, ValueError):
            match_date = None

    toss = info.get("toss", {})
    toss_winner = (
        _get_or_create(session, Team, name=toss["winner"]) if toss.get("winner") else None
    )
    outcome = info.get("outcome", {})
    winner = (
        _get_or_create(session, Team, name=outcome["winner"]) if outcome.get("winner") else None
    )
    win_margin = None
    if "by" in outcome:
        by = outcome["by"]
        if "runs" in by:
            win_margin = f"{by['runs']} runs"
        elif "wickets" in by:
            win_margin = f"{by['wickets']} wickets"

    match = Match(
        cricsheet_id=cricsheet_id,
        season=str(info.get("season", "")) or None,
        match_date=match_date,
        venue_id=venue.id,
        team1_id=team1.id,
        team2_id=team2.id,
        toss_winner_id=toss_winner.id if toss_winner else None,
        toss_decision=toss.get("decision"),
        winner_id=winner.id if winner else None,
        win_margin=win_margin,
    )
    session.add(match)
    session.flush()

    for team_name, player_names in (info.get("players") or {}).items():
        for pname in player_names:
            _get_or_create(session, Player, name=pname)

    team_lookup = {teams[0]: team1, teams[1]: team2}
    for idx, inn in enumerate(payload.get("innings", []), start=1):
        _ingest_innings(session, match, inn, idx, team_lookup)

    _materialise_player_stats(session, match)
    return match


def _ingest_innings(
    session: Session,
    match: Match,
    innings_payload: dict[str, Any],
    innings_number: int,
    team_lookup: dict[str, Team],
) -> None:
    batting_team = team_lookup.get(innings_payload.get("team", ""))
    bowling_team = next((t for n, t in team_lookup.items() if t is not batting_team), None)

    inn = Innings(
        match_id=match.id,
        innings_number=innings_number,
        batting_team_id=batting_team.id if batting_team else None,
        bowling_team_id=bowling_team.id if bowling_team else None,
    )
    session.add(inn)
    session.flush()

    total_runs = 0
    wickets = 0
    legal_balls = 0

    for over_payload in innings_payload.get("overs", []):
        over_num = over_payload.get("over", 0)
        for ball_idx, delivery in enumerate(over_payload.get("deliveries", []), start=1):
            batter = _get_or_create(session, Player, name=delivery["batter"])
            non_striker = _get_or_create(session, Player, name=delivery["non_striker"])
            bowler = _get_or_create(session, Player, name=delivery["bowler"])

            runs = delivery.get("runs", {})
            runs_batter = int(runs.get("batter", 0))
            runs_extras = int(runs.get("extras", 0))
            extras_dict = delivery.get("extras", {}) or {}
            extras_type = next(iter(extras_dict.keys()), None)

            wicket_type = None
            player_out = None
            wickets_payload = delivery.get("wickets")
            if wickets_payload:
                w0 = wickets_payload[0]
                wicket_type = w0.get("kind")
                if w0.get("player_out"):
                    player_out = _get_or_create(session, Player, name=w0["player_out"])
                wickets += 1

            session.add(
                Delivery(
                    innings_id=inn.id,
                    over=over_num,
                    ball=ball_idx,
                    batter_id=batter.id,
                    non_striker_id=non_striker.id,
                    bowler_id=bowler.id,
                    runs_batter=runs_batter,
                    runs_extras=runs_extras,
                    extras_type=extras_type,
                    wicket_type=wicket_type,
                    player_out_id=player_out.id if player_out else None,
                )
            )

            total_runs += runs_batter + runs_extras
            if extras_type not in {"wides", "noballs"}:
                legal_balls += 1

    inn.runs = total_runs
    inn.wickets = wickets
    inn.overs = legal_balls // 6 + (legal_balls % 6) / 10


def _materialise_player_stats(session: Session, match: Match) -> None:
    """Aggregate each player's runs, balls, wickets etc for one match."""
    inning_ids = [i.id for i in match.innings]
    if not inning_ids:
        return

    deliveries = session.execute(
        select(Delivery).where(Delivery.innings_id.in_(inning_ids))
    ).scalars().all()

    stats: dict[int, dict] = {}

    def _row(player_id: int, team_id: int | None) -> dict:
        return stats.setdefault(
            player_id,
            {
                "team_id": team_id,
                "runs": 0,
                "balls_faced": 0,
                "fours": 0,
                "sixes": 0,
                "balls_bowled": 0,
                "runs_conceded": 0,
                "wickets": 0,
            },
        )

    innings_by_id = {i.id: i for i in match.innings}
    for d in deliveries:
        inn = innings_by_id[d.innings_id]
        bat_team = inn.batting_team_id
        bowl_team = inn.bowling_team_id

        if d.batter_id is not None:
            bat = _row(d.batter_id, bat_team)
            bat["runs"] += d.runs_batter
            if d.extras_type not in {"wides", "noballs"}:
                bat["balls_faced"] += 1
            if d.runs_batter == 4:
                bat["fours"] += 1
            elif d.runs_batter == 6:
                bat["sixes"] += 1

        if d.bowler_id is not None:
            bowl = _row(d.bowler_id, bowl_team)
            bowl["runs_conceded"] += d.runs_batter + d.runs_extras
            if d.extras_type not in {"wides", "noballs"}:
                bowl["balls_bowled"] += 1
            if d.wicket_type and d.wicket_type not in {"run out", "retired hurt", "obstructing the field"}:
                bowl["wickets"] += 1

    for player_id, agg in stats.items():
        balls = agg.pop("balls_bowled")
        overs = balls // 6 + (balls % 6) / 10
        session.add(
            PlayerMatchStat(
                match_id=match.id,
                player_id=player_id,
                team_id=agg["team_id"],
                runs=agg["runs"],
                balls_faced=agg["balls_faced"],
                fours=agg["fours"],
                sixes=agg["sixes"],
                overs_bowled=overs,
                runs_conceded=agg["runs_conceded"],
                wickets=agg["wickets"],
            )
        )


def load_directory(directory: str | Path) -> int:
    """Bulk-load every *.json file under `directory`. Returns count loaded."""
    init_db()
    directory = Path(directory)
    files = sorted(directory.glob("*.json"))
    loaded = 0
    with get_session() as session:
        for f in files:
            with f.open() as fh:
                payload = json.load(fh)
            try:
                load_match(session, payload, cricsheet_id=f.stem)
                loaded += 1
            except Exception as exc:
                print(f"skip {f.name}: {exc}")
    return loaded


def cli_load(argv: Iterable[str] | None = None) -> None:
    args = list(argv if argv is not None else sys.argv[1:])
    if not args:
        print("usage: ipl-load-cricsheet <directory>")
        raise SystemExit(2)
    n = load_directory(args[0])
    print(f"loaded {n} matches from {args[0]}")


if __name__ == "__main__":
    cli_load()
