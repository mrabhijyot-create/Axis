"""Verify a minimal Cricsheet-style payload is parsed and aggregated correctly."""
from __future__ import annotations

from ipl.db.models import Delivery, Innings, Match, PlayerMatchStat, Team
from ipl.etl.cricsheet import load_match


def _sample_payload() -> dict:
    return {
        "info": {
            "teams": ["Mumbai Indians", "Chennai Super Kings"],
            "venue": "Wankhede Stadium",
            "city": "Mumbai",
            "dates": ["2024-04-14"],
            "season": "2024",
            "toss": {"winner": "Mumbai Indians", "decision": "bat"},
            "outcome": {"winner": "Chennai Super Kings", "by": {"wickets": 6}},
            "players": {
                "Mumbai Indians": ["Rohit Sharma", "Ishan Kishan", "Jasprit Bumrah"],
                "Chennai Super Kings": ["Ruturaj Gaikwad", "Devon Conway", "Mustafizur Rahman"],
            },
        },
        "innings": [
            {
                "team": "Mumbai Indians",
                "overs": [
                    {
                        "over": 0,
                        "deliveries": [
                            {
                                "batter": "Rohit Sharma",
                                "non_striker": "Ishan Kishan",
                                "bowler": "Mustafizur Rahman",
                                "runs": {"batter": 4, "extras": 0, "total": 4},
                            },
                            {
                                "batter": "Rohit Sharma",
                                "non_striker": "Ishan Kishan",
                                "bowler": "Mustafizur Rahman",
                                "runs": {"batter": 0, "extras": 1, "total": 1},
                                "extras": {"wides": 1},
                            },
                            {
                                "batter": "Rohit Sharma",
                                "non_striker": "Ishan Kishan",
                                "bowler": "Mustafizur Rahman",
                                "runs": {"batter": 0, "extras": 0, "total": 0},
                                "wickets": [{"player_out": "Rohit Sharma", "kind": "bowled"}],
                            },
                        ],
                    }
                ],
            },
            {
                "team": "Chennai Super Kings",
                "overs": [
                    {
                        "over": 0,
                        "deliveries": [
                            {
                                "batter": "Ruturaj Gaikwad",
                                "non_striker": "Devon Conway",
                                "bowler": "Jasprit Bumrah",
                                "runs": {"batter": 6, "extras": 0, "total": 6},
                            }
                        ],
                    }
                ],
            },
        ],
    }


def test_load_match_persists_match_and_innings(session):
    match = load_match(session, _sample_payload(), cricsheet_id="t1")
    session.commit()

    assert match.id is not None
    assert session.query(Match).count() == 1
    assert session.query(Innings).count() == 2
    assert session.query(Delivery).count() == 4
    assert session.query(Team).count() == 2

    inn1 = session.query(Innings).filter_by(innings_number=1).one()
    assert inn1.runs == 4 + 1 + 0
    assert inn1.wickets == 1


def test_player_match_stat_aggregates(session):
    load_match(session, _sample_payload(), cricsheet_id="t2")
    session.commit()

    from ipl.db.models import Player

    rohit = session.query(Player).filter_by(name="Rohit Sharma").one()
    rohit_stat = session.query(PlayerMatchStat).filter_by(player_id=rohit.id).one()
    assert rohit_stat.runs == 4
    assert rohit_stat.fours == 1
    assert rohit_stat.balls_faced == 2  # the wide didn't count

    musta = session.query(Player).filter_by(name="Mustafizur Rahman").one()
    musta_stat = session.query(PlayerMatchStat).filter_by(player_id=musta.id).one()
    assert musta_stat.wickets == 1
    assert musta_stat.runs_conceded == 4 + 1 + 0
