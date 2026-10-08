# syntax=docker/dockerfile:1
# Image du pipeline de données (CdC technique § 5.2).
# Images de base figées par empreinte : à mettre à jour volontairement (CdC technique § 5.5).
FROM ghcr.io/astral-sh/uv:0.8@sha256:1d31be550ff927957472b2a491dc3de1ea9b5c2d319a9cea5b6a48021e2990a6 AS uv

FROM python:3.12-slim@sha256:05cda9777409a9c3ffddd94a4c476b79f0769a0b4857f0c7ed9226b6800b0d6f

COPY --from=uv /uv /uvx /usr/local/bin/

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never \
    UV_PROJECT_ENVIRONMENT=/opt/venv \
    PATH="/opt/venv/bin:$PATH" \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Dépendances d'abord, pour profiter du cache des couches.
COPY pyproject.toml uv.lock README.md ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-install-project

# Code du projet.
COPY pipeline ./pipeline
COPY tests ./tests
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen

# Utilisateur sans privilèges ; les dossiers montés en volume lui appartiennent.
RUN useradd --create-home --uid 1000 app \
    && mkdir -p /app/data /app/site/public \
    && chown -R app:app /app
USER app

CMD ["python", "-m", "pipeline", "run"]
