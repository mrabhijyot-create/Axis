"""POST /predict must not be callable by other machines without a token."""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from ipl.api import main


@pytest.fixture(autouse=True)
def _stub_prediction(monkeypatch):
    monkeypatch.setattr(main, "run_prediction", lambda: {"id": 1, "stub": True})


def _client(host: str) -> TestClient:
    # No `with` block: the lifespan (DB init + scheduler) must not start here.
    return TestClient(main.app, client=(host, 50000))


def test_remote_caller_refused_without_token(monkeypatch):
    monkeypatch.setattr(main.settings, "ipl_api_token", None)
    resp = _client("203.0.113.9").post("/predict")
    assert resp.status_code == 403


def test_loopback_caller_allowed_without_token(monkeypatch):
    monkeypatch.setattr(main.settings, "ipl_api_token", None)
    for host in ("127.0.0.1", "::1"):
        resp = _client(host).post("/predict")
        assert resp.status_code == 200
        assert resp.json() == {"id": 1, "stub": True}


def test_token_required_when_configured(monkeypatch):
    monkeypatch.setattr(main.settings, "ipl_api_token", "s3cret-token")
    # Even a local caller needs the token once one is configured.
    assert _client("127.0.0.1").post("/predict").status_code == 401
    assert _client("127.0.0.1").post("/predict", headers={"X-API-Token": "wrong"}).status_code == 401
    ok = _client("203.0.113.9").post("/predict", headers={"X-API-Token": "s3cret-token"})
    assert ok.status_code == 200


def test_predictions_limit_is_bounded():
    client = _client("127.0.0.1")
    assert client.get("/predictions", params={"limit": 100000}).status_code == 422
    assert client.get("/predictions", params={"limit": 0}).status_code == 422
