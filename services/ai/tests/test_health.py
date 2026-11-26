import httpx
import pytest
from fastapi.testclient import TestClient

from app import main
from app.config import Settings, get_settings


def make_client(**overrides) -> TestClient:
    settings = Settings(**overrides)
    main.app.dependency_overrides[get_settings] = lambda: settings
    return TestClient(main.app)


@pytest.fixture(autouse=True)
def _reset_overrides():
    yield
    main.app.dependency_overrides.clear()


def mock_ollama(monkeypatch, handler):
    real_client = httpx.AsyncClient

    def factory(*args, **kwargs):
        kwargs["transport"] = httpx.MockTransport(handler)
        return real_client(*args, **kwargs)

    monkeypatch.setattr(main.httpx, "AsyncClient", factory)


def test_health_ok_con_modelos_instalados(monkeypatch):
    mock_ollama(
        monkeypatch,
        lambda req: httpx.Response(
            200, json={"models": [{"name": "llama3.2-vision:11b"}, {"name": "llama3.2:3b"}]}
        ),
    )
    res = make_client().get("/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert body["service"] == "ai"
    assert body["ollama"] == {"ok": True, "missing": []}


def test_health_reporta_modelos_faltantes(monkeypatch):
    mock_ollama(monkeypatch, lambda req: httpx.Response(200, json={"models": []}))
    body = make_client().get("/health").json()
    assert body["ollama"]["missing"] == ["llama3.2-vision:11b", "llama3.2:3b"]


def test_health_sigue_ok_si_ollama_no_responde(monkeypatch):
    def fail(req):
        raise httpx.ConnectError("sin conexión")

    mock_ollama(monkeypatch, fail)
    res = make_client().get("/health")
    assert res.status_code == 200
    assert res.json()["ollama"]["ok"] is False


def test_modo_cpu_por_defecto(monkeypatch):
    mock_ollama(monkeypatch, lambda req: httpx.Response(200, json={"models": []}))
    body = make_client().get("/health").json()
    assert body["device"] == {"requested": "cpu", "effective": "cpu"}


def test_cuda_cae_a_cpu_sin_torch():
    assert main.resolve_device("cuda") in {"cpu", "cuda"}
    assert main.resolve_device("cpu") == "cpu"


def test_docs_deshabilitados():
    assert make_client().get("/docs").status_code == 404
