"""SQLAlchemy models for ball-by-ball IPL storage and prediction history."""
from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class Team(Base):
    __tablename__ = "team"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    short_name: Mapped[str | None] = mapped_column(String)


class Venue(Base):
    __tablename__ = "venue"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    city: Mapped[str | None] = mapped_column(String)
    country: Mapped[str | None] = mapped_column(String)


class Player(Base):
    __tablename__ = "player"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    role: Mapped[str | None] = mapped_column(String)
    batting_hand: Mapped[str | None] = mapped_column(String)
    bowling_style: Mapped[str | None] = mapped_column(String)


class Match(Base):
    __tablename__ = "match"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    cricsheet_id: Mapped[str | None] = mapped_column(String, unique=True, index=True)
    season: Mapped[str | None] = mapped_column(String, index=True)
    match_date: Mapped[date | None] = mapped_column(Date, index=True)
    venue_id: Mapped[int | None] = mapped_column(ForeignKey("venue.id"))
    team1_id: Mapped[int | None] = mapped_column(ForeignKey("team.id"))
    team2_id: Mapped[int | None] = mapped_column(ForeignKey("team.id"))
    toss_winner_id: Mapped[int | None] = mapped_column(ForeignKey("team.id"))
    toss_decision: Mapped[str | None] = mapped_column(String)
    winner_id: Mapped[int | None] = mapped_column(ForeignKey("team.id"))
    win_margin: Mapped[str | None] = mapped_column(String)

    venue: Mapped[Venue | None] = relationship(foreign_keys=[venue_id])
    team1: Mapped[Team | None] = relationship(foreign_keys=[team1_id])
    team2: Mapped[Team | None] = relationship(foreign_keys=[team2_id])
    innings: Mapped[list["Innings"]] = relationship(back_populates="match", cascade="all, delete-orphan")


class Innings(Base):
    __tablename__ = "innings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    match_id: Mapped[int] = mapped_column(ForeignKey("match.id"), index=True)
    innings_number: Mapped[int] = mapped_column(Integer)
    batting_team_id: Mapped[int | None] = mapped_column(ForeignKey("team.id"))
    bowling_team_id: Mapped[int | None] = mapped_column(ForeignKey("team.id"))
    runs: Mapped[int] = mapped_column(Integer, default=0)
    wickets: Mapped[int] = mapped_column(Integer, default=0)
    overs: Mapped[float] = mapped_column(Float, default=0.0)

    match: Mapped[Match] = relationship(back_populates="innings")
    deliveries: Mapped[list["Delivery"]] = relationship(
        back_populates="innings_obj", cascade="all, delete-orphan"
    )

    __table_args__ = (UniqueConstraint("match_id", "innings_number", name="uq_innings_match_num"),)


class Delivery(Base):
    __tablename__ = "delivery"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    innings_id: Mapped[int] = mapped_column(ForeignKey("innings.id"), index=True)
    over: Mapped[int] = mapped_column(Integer)
    ball: Mapped[int] = mapped_column(Integer)
    batter_id: Mapped[int | None] = mapped_column(ForeignKey("player.id"))
    non_striker_id: Mapped[int | None] = mapped_column(ForeignKey("player.id"))
    bowler_id: Mapped[int | None] = mapped_column(ForeignKey("player.id"))
    runs_batter: Mapped[int] = mapped_column(Integer, default=0)
    runs_extras: Mapped[int] = mapped_column(Integer, default=0)
    extras_type: Mapped[str | None] = mapped_column(String)
    wicket_type: Mapped[str | None] = mapped_column(String)
    player_out_id: Mapped[int | None] = mapped_column(ForeignKey("player.id"))

    innings_obj: Mapped[Innings] = relationship(back_populates="deliveries")


class PlayerMatchStat(Base):
    __tablename__ = "player_match_stat"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    match_id: Mapped[int] = mapped_column(ForeignKey("match.id"), index=True)
    player_id: Mapped[int] = mapped_column(ForeignKey("player.id"), index=True)
    team_id: Mapped[int | None] = mapped_column(ForeignKey("team.id"))
    runs: Mapped[int] = mapped_column(Integer, default=0)
    balls_faced: Mapped[int] = mapped_column(Integer, default=0)
    fours: Mapped[int] = mapped_column(Integer, default=0)
    sixes: Mapped[int] = mapped_column(Integer, default=0)
    overs_bowled: Mapped[float] = mapped_column(Float, default=0.0)
    runs_conceded: Mapped[int] = mapped_column(Integer, default=0)
    wickets: Mapped[int] = mapped_column(Integer, default=0)
    is_impact_sub: Mapped[bool] = mapped_column(Boolean, default=False)

    __table_args__ = (UniqueConstraint("match_id", "player_id", name="uq_pms_match_player"),)


class Prediction(Base):
    """Persisted Claude Opus prediction so the dashboard can show history."""

    __tablename__ = "prediction"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    match_label: Mapped[str] = mapped_column(String)
    team_a: Mapped[str] = mapped_column(String)
    team_b: Mapped[str] = mapped_column(String)
    venue: Mapped[str | None] = mapped_column(String)
    win_probability_a: Mapped[float] = mapped_column(Float)
    win_probability_b: Mapped[float] = mapped_column(Float)
    weights: Mapped[dict] = mapped_column(JSON)
    drivers: Mapped[list] = mapped_column(JSON)
    raw_response: Mapped[dict | None] = mapped_column(JSON)
