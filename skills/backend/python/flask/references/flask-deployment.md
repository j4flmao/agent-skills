# Flask Deployment

## WSGI Servers

```bash
# Gunicorn (recommended for Linux)
pip install gunicorn
gunicorn wsgi:app -w 4 -b 0.0.0.0:8000
gunicorn wsgi:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000

# uWSGI
pip install uwsgi
uwsgi --http 0.0.0.0:8000 --wsgi-file wsgi.py --callable app --processes 4

# Waitress (for Windows)
pip install waitress
waitress-serve --port=8000 wsgi:app
```

```python
# wsgi.py
from app import create_app
app = create_app()
```

## Docker Deployment

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
ENV FLASK_ENV=production
EXPOSE 8000
CMD ["gunicorn", "wsgi:app", "-w", "4", "-b", "0.0.0.0:8000", "--access-logfile", "-"]
```

```yaml
# docker-compose.yml
services:
  web:
    build: .
    ports:
      - "8000:8000"
    environment:
      - FLASK_ENV=production
      - DATABASE_URL=postgresql://user:pass@db:5432/app
      - SECRET_KEY=${SECRET_KEY}
    depends_on:
      db:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 5s

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: app
      POSTGRES_PASSWORD: ${DB_PASS}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready"]
      interval: 5s
```

## Environment Configuration

```python
# app/config.py
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret")
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "sqlite:///app.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    CACHE_TYPE = os.getenv("CACHE_TYPE", "RedisCache")
    CACHE_REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

class ProductionConfig(Config):
    DEBUG = False
    TESTING = False
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True

class DevelopmentConfig(Config):
    DEBUG = True
    SQLALCHEMY_ECHO = True
```

## Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name api.example.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /static {
        alias /app/static;
        expires 30d;
    }

    location /health {
        access_log off;
        return 200;
    }
}
```

## CI/CD Pipeline

```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: test
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - run: pip install -r requirements.txt
      - run: pytest
      - run: docker build -t app .
      - run: docker push registry.example.com/app:latest
```

## Platform Deployments

| Platform | Method | Notes |
|----------|--------|-------|
| **Heroku** | Git deploy | Procfile: web: gunicorn wsgi:app |
| **Railway** | GitHub deploy | Auto-detect Python |
| **Render** | Docker/Git | Web service with gunicorn |
| **AWS ECS** | Docker | Fargate with RDS |
| **Google Cloud Run** | Docker | Serverless containers |
| **DigitalOcean App** | Docker | App Platform |
| **PythonAnywhere** | Git/SFTP | WSGI config via web tab |
| **VPS** | Gunicorn + Nginx | Traditional stack |

## Production Config

```python
# app/config.py
class ProductionConfig(Config):
    SECRET_KEY = os.getenv("SECRET_KEY")  # required
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL")  # required
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_HTTPONLY = True
    REMEMBER_COOKIE_SECURE = True
    REMEMBER_COOKIE_HTTPONLY = True
```

## Health Checks

```python
# app/blueprints/health/routes.py
from flask import Blueprint, jsonify
from app.extensions import db

health_bp = Blueprint("health", __name__)

@health_bp.route("/health")
def health():
    try:
        db.session.execute(db.text("SELECT 1"))
        return jsonify(status="healthy", database="connected")
    except Exception:
        return jsonify(status="unhealthy", database="disconnected"), 503
```
