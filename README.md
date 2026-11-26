# Bóveda TCG

Convierte una foto de cartas físicas en una colección digital valuada y permite intercambiarlas con
verificación anti-fraude. Juegos soportados: **5-toubun no Hanayome Card Game** y **Pokémon TCG**.
Toda la IA corre localmente: ninguna foto ni mensaje sale de tu equipo.

> Estado actual: **Fase 0, base del proyecto.** Infraestructura, `/health` en api y ai, y una
> página inicial con el estado de los servicios.

## Estructura

```
apps/web/        React + Vite + TypeScript + Tailwind (interfaz, primero para celular)
apps/api/        Node 20 + Express + TypeScript (API REST; único cliente del servicio de IA)
services/ai/     Python 3.11 + FastAPI (segmentación, embeddings, pre-grado; fases 3+)
infra/minio/     Imagen de MinIO compilada desde el código (ver nota)
docker-compose.yml       Todo el entorno (modo CPU)
docker-compose.gpu.yml   Override para GPU NVIDIA
.env.example             Variables documentadas
```

| Servicio | URL en tu equipo                        | Notas                                      |
| -------- | --------------------------------------- | ------------------------------------------ |
| web      | http://localhost:8080                   | Página de estado                           |
| api      | http://localhost:4000/health            | También vía http://localhost:8080/api/health |
| ai       | _(no publicado)_                        | Solo accesible desde el api, por diseño    |
| MySQL 8  | `localhost:3307`                        | usuario `boveda` / `boveda`                |
| Redis    | `localhost:6379`                        |                                            |
| MinIO    | http://localhost:9001 (consola)         | `boveda` / `boveda-secret-123`             |
| Mailpit  | http://localhost:8025                   | Bandeja de correos de desarrollo           |
| Ollama   | http://localhost:11434                  | LLM local                                  |

Todos los puertos (salvo web) se publican solo en `127.0.0.1`.

## Requisitos

- Docker Desktop (Windows/macOS) o Docker Engine + Compose v2.
- **Memoria para Docker: 12 GB o más** si vas a usar `llama3.2-vision:11b` en CPU (ver abajo).
- Disco: unos 15 GB libres (imágenes más modelos de Ollama).
- Opcional: GPU NVIDIA con 8–12 GB de VRAM y [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html)
  (en Windows basta Docker Desktop con WSL2 y el driver NVIDIA actualizado).
- Para desarrollar fuera de Docker: Node.js 20.19+ y Python 3.11.

## Arranque rápido

```bash
cp .env.example .env          # opcional en Fase 0: todo tiene default
docker compose up --build     # la primera vez tarda varios minutos
```

Abre http://localhost:8080. **API** y **Servicio de IA** deben verse en verde, junto con MySQL,
Redis, MinIO y Ollama. Si faltan modelos de Ollama, la página muestra un aviso amarillo con el
comando para descargarlos.

Con GPU NVIDIA:

```bash
docker compose -f docker-compose.yml -f docker-compose.gpu.yml up --build
```

Para detener: `docker compose down`. Para borrar también los datos: `docker compose down -v`
(borra la base de datos y los modelos descargados).

## Modelos de Ollama

Los nombres se verificaron en https://ollama.com/library (noviembre de 2026):

| Uso                                           | Modelo (variable)                             | Tamaño | Capacidad |
| --------------------------------------------- | --------------------------------------------- | ------ | --------- |
| Leer nombre/número/idioma, pre-grado, pruebas | `llama3.2-vision:11b` (`OLLAMA_VISION_MODEL`) | 7.8 GB | vision    |
| Copiloto y vigilancia de chat                 | `llama3.2:3b` (`OLLAMA_TEXT_MODEL`)           | 2.0 GB | tools     |

Descárgalos con el entorno levantado (solo hace falta una vez; quedan en el volumen
`ollama-models`):

```bash
docker compose exec ollama ollama pull llama3.2-vision:11b
docker compose exec ollama ollama pull llama3.2:3b
docker compose exec ollama ollama list     # comprobar
```

Prueba rápida del modelo de texto:

```bash
docker compose exec ollama ollama run llama3.2:3b "Di hola en una palabra"
```

### Memoria y modo CPU

- `AI_DEVICE=cpu` (default) funciona en cualquier equipo. `cuda` requiere el override de GPU.
- En CPU, `llama3.2-vision:11b` necesita unos 8–10 GB de RAM libres **dentro de Docker** y tarda
  decenas de segundos por imagen. En Windows, Docker Desktop (WSL2) usa por defecto la mitad de
  la RAM del equipo. Para subirla, crea `%UserProfile%\.wslconfig`:

  ```ini
  [wsl2]
  memory=12GB
  swap=8GB
  ```

  y ejecuta `wsl --shutdown` antes de volver a abrir Docker Desktop.
- `OLLAMA_MAX_LOADED_MODELS=1` evita tener los dos modelos cargados a la vez.
- Para usar un modelo distinto, cambia `OLLAMA_VISION_MODEL` u `OLLAMA_TEXT_MODEL` en `.env`,
  descárgalo con `ollama pull` y reinicia: `docker compose up -d api ai`.

## Desarrollo local (sin reconstruir imágenes)

```bash
npm install                                  # instala web + api (npm workspaces)
docker compose up -d mysql redis minio mailpit ollama ai
```

Crea un `.env` en la raíz para el api local:

```bash
DATABASE_URL=mysql://boveda:boveda@localhost:3307/boveda
REDIS_URL=redis://localhost:6379
MINIO_ENDPOINT=http://localhost:9000
OLLAMA_URL=http://localhost:11434
AI_SERVICE_URL=http://localhost:8000
WEB_ORIGIN=http://localhost:5173
```

```bash
npm run dev:api        # http://localhost:4000 (recarga en caliente)
npm run dev:web        # http://localhost:5173 (proxy /api -> :4000)
```

El servicio `ai` no publica puertos. Para correrlo fuera de Docker:

```bash
cd services/ai
python -m venv .venv && . .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
OLLAMA_URL=http://localhost:11434 uvicorn app.main:app --reload --port 8000
```

## Pruebas, lint y formato

```bash
npm test                 # Vitest: api (health, CORS, cabeceras, config) + web (página de estado)
npm run typecheck
npm run lint             # ESLint (flat config + typescript-eslint)
npm run format:check     # Prettier

# Servicio de IA (dentro del contenedor, con Python 3.11):
docker compose exec ai python -m pytest -q
docker compose exec ai python -m ruff check .
```

## Variables de entorno

Todas están documentadas en [.env.example](.env.example). Las más importantes:

| Variable                                     | Default                      | Para qué                           |
| -------------------------------------------- | ---------------------------- | ---------------------------------- |
| `AI_DEVICE`                                  | `cpu`                        | `cpu`, `cuda` o `auto`             |
| `AI_SEGMENTER`                               | `opencv`                     | `opencv` (línea base) o `sam3` (Fase 3) |
| `OLLAMA_VISION_MODEL`                        | `llama3.2-vision:11b`        | Modelo multimodal                  |
| `OLLAMA_TEXT_MODEL`                          | `llama3.2:3b`                | Modelo de texto con herramientas   |
| `WEB_ORIGIN`                                 | `http://localhost:8080`      | Único origen permitido por CORS    |
| `MINIO_VERSION`                              | `latest`                     | Versión de MinIO a compilar (ver nota) |

### Nota sobre MinIO

El repositorio comunitario de MinIO se archivó en abril de 2026 y ya no hay imágenes oficiales
(`minio/minio` no existe en Docker Hub y `quay.io/minio/minio` exige credenciales). Por eso
[infra/minio/Dockerfile](infra/minio/Dockerfile) lo compila desde el código fuente con Go. La
primera compilación tarda unos minutos. Como la app usa la API S3 estándar, MinIO se puede
cambiar después por otro servidor compatible con S3 sin tocar el código.

## Solución de problemas

- **"ai" en rojo en la página:** `docker compose logs ai`. El api lo consulta en `http://ai:8000/health`.
- **Ollama en rojo o tarda en salir verde:** la primera vez descarga la imagen; revisa con
  `docker compose logs ollama`.
- **Puerto ocupado:** cambia el `*_HOST_PORT` correspondiente en `.env`.
- **El modelo de visión se cierra solo o falla al cargar:** falta memoria. Sube la memoria de
  WSL2 (ver arriba) o usa un modelo más pequeño.

## Hoja de ruta

0. Base del proyecto ← _actual_
1. Login avanzado (correo, 2FA, Google, sesiones, roles)
2. Catálogo
3. Escaneo e identificación (OpenCV/SAM 3, DINOv2 + FAISS, Llama 3.2 Vision)
4. Colección y valor
5. Pre-grado y alerta de falsificación
6. Copiloto de colección
7. Intercambios verificados
8. Pulido, pruebas y demo
