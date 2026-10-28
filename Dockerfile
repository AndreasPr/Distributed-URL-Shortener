# Build stage
FROM python:3.11.14-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /build

# Install build dependencies
RUN apt-get update && apt-get upgrade -y && apt-get install -y --no-install-recommends \
	gcc \
	libc6-dev \
	libpq-dev \
	postgresql-client \
	&& rm -rf /var/lib/apt/lists/*

# Compile the PostgreSQL driver against patched system libpq; binary wheels
# bundle their own PCRE/OpenSSL libraries outside apt security updates.
# Runtime sources remain verified against the requirements hashes.
COPY requirements.txt ./
RUN python -m venv /opt/venv && /opt/venv/bin/pip install --no-cache-dir --no-binary=psycopg2-binary --require-hashes -r requirements.txt

# Runtime stage
FROM python:3.11.14-slim

ARG VERSION=unknown
ARG BUILD_DATE=unknown
ARG VCS_REF=unknown

LABEL org.opencontainers.image.title="URL Shortener"
LABEL org.opencontainers.image.description="Distributed URL shortening service with Kubernetes support"
LABEL org.opencontainers.image.version="${VERSION}"
LABEL org.opencontainers.image.created="${BUILD_DATE}"
LABEL org.opencontainers.image.revision="${VCS_REF}"

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV VERSION=${VERSION}

WORKDIR /app

# Install only runtime dependencies
RUN apt-get update && apt-get upgrade -y && apt-get install -y --no-install-recommends \
	postgresql-client \
	&& rm -rf /var/lib/apt/lists/*

# Copy Python dependencies from builder
COPY --from=builder /opt/venv /opt/venv

# Packaging tools are build-only; remove their bundled vulnerable libraries from
# both the base interpreter and application environment before shipping.
RUN /opt/venv/bin/python -m pip uninstall -y setuptools wheel pip \
    && /usr/local/bin/python -m pip uninstall -y setuptools wheel pip

# Allowlist runtime files: local worktrees and tooling must never enter the image.
COPY app ./app
COPY alembic ./alembic
COPY alembic.ini ./

# Use the isolated runtime environment for application commands
ENV PATH=/opt/venv/bin:$PATH
RUN groupadd --gid 10001 app && useradd --uid 10001 --gid app --no-create-home app
USER 10001:10001

# Liveness does not depend on Redis/Postgres availability.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/livez', timeout=3).close()"


EXPOSE 8000

# Standalone default: migrate before starting. Compose overrides this command
# and uses its dedicated migration service to serialize migrations.
CMD ["sh", "-c", "alembic upgrade head && exec uvicorn app.main:app --no-proxy-headers --host 0.0.0.0 --port 8000"]
