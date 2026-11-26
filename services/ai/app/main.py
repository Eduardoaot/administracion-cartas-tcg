"""Servicio de IA de Bóveda TCG.

Solo lo llama el backend (api) dentro de la red de Docker; no se publica al host.
En la Fase 0 únicamente expone /health. Segmentación, embeddings y pre-grado
llegan en fases posteriores.
"""

from typing import Annotated, Any

import httpx
from fastapi import Depends, FastAPI

from app.config import Settings, get_settings

app = FastAPI(title="Bóveda TCG - Servicio de IA", version="0.0.0", docs_url=None, redoc_url=None)


def resolve_device(requested: str) -> str:
    """Devuelve el dispositivo efectivo. En Fase 0 aún no se instala PyTorch,
    así que 'auto' y 'cuda' caen a 'cpu' si torch no está disponible."""
    if requested == "cpu":
        return "cpu"
    try:
        import torch  # type: ignore[import-not-found]
    except ImportError:
        return "cpu"
    if torch.cuda.is_available():
        return "cuda"
    return "cpu"


async def check_ollama(settings: Settings) -> dict[str, Any]:
    try:
        async with httpx.AsyncClient(timeout=settings.health_timeout_s) as client:
            res = await client.get(f"{settings.ollama_url}/api/tags")
            res.raise_for_status()
            installed = [m["name"] for m in res.json().get("models", [])]
    except (httpx.HTTPError, ValueError, KeyError) as exc:
        return {"ok": False, "error": str(exc) or exc.__class__.__name__}
    required = [settings.ollama_vision_model, settings.ollama_text_model]
    return {"ok": True, "missing": [m for m in required if m not in installed]}


@app.get("/health")
async def health(settings: Annotated[Settings, Depends(get_settings)]) -> dict[str, Any]:
    return {
        "status": "ok",
        "service": "ai",
        "device": {
            "requested": settings.ai_device,
            "effective": resolve_device(settings.ai_device),
        },
        "segmenter": settings.ai_segmenter,
        "ollama": await check_ollama(settings),
    }
