"""Streamlit dashboard. Runs against the FastAPI server, falls back to direct DB."""
from __future__ import annotations

import os

import httpx
import pandas as pd
import plotly.express as px
import streamlit as st

API_BASE = os.environ.get("IPL_API_BASE", "http://localhost:8000")

st.set_page_config(page_title="Axis · IPL Prediction", layout="wide")


def _api_get(path: str, **params) -> dict | list | None:
    try:
        resp = httpx.get(f"{API_BASE}{path}", params=params, timeout=5.0)
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        return resp.json()
    except httpx.HTTPError:
        return None


def _api_post(path: str) -> dict | list | None:
    try:
        resp = httpx.post(f"{API_BASE}{path}", timeout=30.0)
        resp.raise_for_status()
        return resp.json()
    except httpx.HTTPError as exc:
        st.error(f"API error: {exc}")
        return None


def render_prediction_tab() -> None:
    st.subheader("Live Match Prediction")

    cols = st.columns([1, 1, 2])
    with cols[0]:
        if st.button("Run prediction now", type="primary"):
            with st.spinner("Calling Claude Opus..."):
                _api_post("/predict")

    pred = _api_get("/predictions/latest")
    if not pred:
        st.info("No predictions yet. Click **Run prediction now** to generate one.")
        return

    st.caption(f"Generated at {pred['created_at']} · venue: {pred.get('venue') or 'n/a'}")

    prob_cols = st.columns(2)
    prob_cols[0].metric(pred["team_a"], f"{pred['win_probability_a'] * 100:.1f}%")
    prob_cols[1].metric(pred["team_b"], f"{pred['win_probability_b'] * 100:.1f}%")

    pie_col, drivers_col = st.columns([1, 1])

    with pie_col:
        st.markdown("**Dynamic weight allocation**")
        weights = pred["weights"]
        wdf = pd.DataFrame(
            {"variable": list(weights.keys()), "weight": list(weights.values())}
        ).sort_values("weight", ascending=False)
        fig = px.pie(wdf, names="variable", values="weight", hole=0.45)
        fig.update_traces(textposition="inside", textinfo="percent+label")
        fig.update_layout(showlegend=False, margin=dict(t=20, b=20, l=20, r=20))
        st.plotly_chart(fig, use_container_width=True)

    with drivers_col:
        st.markdown("**Primary drivers**")
        for d in pred.get("drivers", []) or []:
            st.markdown(f"- {d}")


def render_standings_tab() -> None:
    st.subheader("Points Table")
    rows = _api_get("/standings") or []
    if not rows:
        st.info("No matches loaded yet. Run `python scripts/load_cricsheet.py data/raw`.")
        return
    df = pd.DataFrame(rows)
    st.dataframe(df, use_container_width=True, hide_index=True)


def render_history_tab() -> None:
    st.subheader("Prediction History")
    rows = _api_get("/predictions", limit=50) or []
    if not rows:
        st.info("No predictions stored yet.")
        return
    df = pd.DataFrame(rows)[
        ["created_at", "match_label", "team_a", "win_probability_a", "team_b", "win_probability_b"]
    ]
    df["win_probability_a"] = (df["win_probability_a"] * 100).round(1)
    df["win_probability_b"] = (df["win_probability_b"] * 100).round(1)
    st.dataframe(df, use_container_width=True, hide_index=True)


def render_player_tab() -> None:
    st.subheader("Player Stats")
    pid = st.number_input("Player ID", min_value=1, step=1, value=1)
    if st.button("Lookup"):
        data = _api_get(f"/players/{int(pid)}/stats")
        if not data:
            st.warning("Player not found.")
        else:
            st.json(data)


def main() -> None:
    st.title("Axis · IPL Prediction Dashboard")
    st.caption(f"API: {API_BASE}")

    tabs = st.tabs(["Prediction", "Standings", "History", "Players"])
    with tabs[0]:
        render_prediction_tab()
    with tabs[1]:
        render_standings_tab()
    with tabs[2]:
        render_history_tab()
    with tabs[3]:
        render_player_tab()


main()
