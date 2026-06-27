# Deployment Pipelines for Python

## Overview
Modern Python deployment relies on Docker, Kubernetes, robust package managers, and automated CI/CD.

## 1. Dependency Management (Poetry & uv)
Move away from `requirements.txt` to lockfiles for deterministic builds.
- **Poetry:** Standard for modern Python. Handles virtualenvs and deterministic locking (`poetry.lock`).
- **uv:** Ultra-fast, Rust-based package installer and resolver. Can drop-in replace `pip`.

## 2. Multi-Stage Docker Builds
Minimize image size and attack surface by separating build tools from runtime.

```dockerfile
# Stage 1: Builder
FROM python:3.12-slim as builder
WORKDIR /app
RUN pip install poetry
COPY pyproject.toml poetry.lock ./
RUN poetry export -f requirements.txt --output requirements.txt
RUN pip wheel --no-cache-dir --no-deps --wheel-dir /app/wheels -r requirements.txt

# Stage 2: Runtime
FROM python:3.12-slim
WORKDIR /app
COPY --from=builder /app/wheels /wheels
RUN pip install --no-cache /wheels/*
COPY . .
# Run as non-root user
RUN useradd -m appuser && chown -R appuser /app
USER appuser
CMD ["gunicorn", "main:app", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "-b", "0.0.0.0:8000"]
```

## 3. Kubernetes Deployment Patterns
Deploying Python backends involves Deployments, Services, and HPA (Horizontal Pod Autoscaler).
- Define CPU/Memory requests to allow Kubernetes to schedule effectively.
- Define memory limits tightly to trigger OOMKills early rather than degrading node performance.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: python-backend
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: api
        image: my-registry/my-api:v1.0.0
        resources:
          requests:
            cpu: "100m"
            memory: "256Mi"
          limits:
            cpu: "500m"
            memory: "512Mi"
```

## 4. CI/CD with GitHub Actions
Create immutable artifacts (Docker images) upon merge to `main`.

```yaml
name: CI/CD Pipeline
on: [push]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.12'
      - run: pip install poetry && poetry install
      - run: poetry run pytest
      
  build-and-push:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - run: docker build -t my-registry/api:${{ github.sha }} .
      - run: docker push my-registry/api:${{ github.sha }}
```
