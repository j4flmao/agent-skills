# Dev Environment Automation

## Infrastructure as Code for Dev Environments

Automating development environment setup eliminates the #1 cause of onboarding friction: environment inconsistencies.

### Docker Compose Development Stack

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: devdb
      POSTGRES_USER: devuser
      POSTGRES_PASSWORD: devpass
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-db:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U devuser -d devdb"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  localstack:
    image: localstack/localstack:latest
    ports:
      - "4566:4566"
    environment:
      SERVICES: s3,sqs,sns,lambda
      AWS_DEFAULT_REGION: us-east-1
    volumes:
      - localstack_data:/var/lib/localstack

  mailpit:
    image: axllent/mailpit:latest
    ports:
      - "1025:1025"
      - "8025:8025"

volumes:
  postgres_data:
  localstack_data:
```

### Makefile for Common Tasks

```makefile
.PHONY: setup test lint migrate seed clean

setup: ## Full environment setup
	@echo "Setting up development environment..."
	@command -v node >/dev/null 2>&1 || { echo "Node.js required"; exit 1; }
	@command -v docker >/dev/null 2>&1 || { echo "Docker required"; exit 1; }
	cp .env.example .env
	docker compose up -d
	npm install
	$(MAKE) migrate
	$(MAKE) seed
	@echo "Setup complete! Run 'make dev' to start."

dev: ## Start development server
	docker compose up -d
	npm run dev

test: ## Run all tests with coverage
	npm run test:ci

lint: ## Lint and format check
	npm run lint
	npm run format:check

migrate: ## Run database migrations
	npm run db:migrate

seed: ## Seed development database
	npm run db:seed

clean: ## Reset environment
	docker compose down -v
	rm -rf node_modules
	rm -rf .next
	rm -rf coverage
```

## Environment Detection and Configuration

### Platform-Agnostic Setup Script

```powershell
# setup.ps1 — Windows dev environment setup
param(
    [string]$ProjectRoot = ".",
    [switch]$Force
)

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host "==> $Message" -ForegroundColor Green
}

function Test-Command {
    param([string]$Command)
    return Get-Command $Command -ErrorAction SilentlyContinue
}

Write-Step "Checking prerequisites..."

# Check Node.js
if (-not (Test-Command "node")) {
    Write-Host "Installing Node.js via fnm..."
    if (-not (Test-Command "fnm")) {
        winget install Schniz.fnm
    }
    fnm install 20
    fnm use 20
}

# Check Docker
if (-not (Test-Command "docker")) {
    Write-Host "ERROR: Docker Desktop is required. Install from https://docker.com" -ForegroundColor Red
    exit 1
}

# Check GitHub CLI
if (-not (Test-Command "gh")) {
    Write-Host "Installing GitHub CLI..."
    winget install GitHub.cli
}

Write-Step "Setting up project..."
Set-Location $ProjectRoot

if (-not (Test-Path ".env") -or $Force) {
    Copy-Item ".env.example" ".env"
    Write-Step "Created .env from .env.example"
}

Write-Step "Starting Docker services..."
docker compose up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Docker failed to start" -ForegroundColor Red
    exit 1
}

Write-Step "Installing dependencies..."
npm install

Write-Step "Running database migrations..."
npm run db:migrate

Write-Step "Seeding database..."
npm run db:seed

Write-Step "Setup complete! Run 'npm run dev' to start."
```

## Version Management

### Tool Version File

```yaml
# .tool-versions — asdf version management
nodejs 20.11.0
pnpm 8.15.4
python 3.12.1
golang 1.22.0
terraform 1.7.0
kubectl 1.29.0
helm 3.14.0
```

### Runtime Version Check Script

```bash
#!/bin/bash
# verify-versions.sh — Ensures tool versions match project requirements

declare -A REQUIREMENTS
REQUIREMENTS=(
  ["node"]=">=20.0.0"
  ["pnpm"]=">=8.0.0"
  ["docker"]=">=24.0.0"
  ["docker-compose"]=">=2.0.0"
)

check_version() {
  local tool=$1
  local requirement=$2
  local installed

  case $tool in
    node) installed=$(node --version | sed 's/v//') ;;
    pnpm) installed=$(pnpm --version) ;;
    docker) installed=$(docker --version | grep -oP '\d+\.\d+\.\d+' | head -1) ;;
    docker-compose) installed=$(docker compose version | grep -oP '\d+\.\d+\.\d+' | head -1) ;;
  esac

  if [ -z "$installed" ]; then
    echo "ERROR: $tool not found"
    return 1
  fi

  local min_version=$(echo "$requirement" | sed 's/>=//')
  if [ "$(printf '%s\n' "$min_version" "$installed" | sort -V | head -1)" = "$min_version" ]; then
    echo "✓ $tool $installed (satisfies $requirement)"
    return 0
  else
    echo "✗ $tool $installed (requires $requirement)"
    return 1
  fi
}

echo "=== Version Verification ==="
FAILED=0
for tool in "${!REQUIREMENTS[@]}"; do
  check_version "$tool" "${REQUIREMENTS[$tool]}" || FAILED=$((FAILED + 1))
done

if [ $FAILED -gt 0 ]; then
  echo "ERROR: $FAILED tool(s) failed version check"
  exit 1
fi

echo "All tool versions satisfy requirements."
```

## Containerized Development

### Dev Container Configuration

```json
{
  "name": "Project Dev Container",
  "image": "mcr.microsoft.com/devcontainers/typescript-node:1-20-bookworm",
  "features": {
    "ghcr.io/devcontainers/features/docker-in-docker:2": {},
    "ghcr.io/devcontainers/features/github-cli:1": {},
    "ghcr.io/devcontainers/features/aws-cli:1": {}
  },
  "forwardPorts": [3000, 5432, 6379],
  "postCreateCommand": "npm install",
  "customizations": {
    "vscode": {
      "extensions": [
        "dbaeumer.vscode-eslint",
        "esbenp.prettier-vscode",
        "bradlc.vscode-tailwindcss",
        "ms-azuretools.vscode-docker"
      ],
      "settings": {
        "editor.formatOnSave": true,
        "editor.defaultFormatter": "esbenp.prettier-vscode"
      }
    }
  }
}
```

## Key Points

- Docker Compose provides reproducible local dependencies
- Makefile (or taskfile) standardizes common development commands
- Platform-agnostic scripts detect OS and adapt accordingly
- .tool-versions or similar enforces consistent toolchain versions
- Dev containers provide zero-setup environments for new team members
- Automated health checks validate services before the developer starts
- Version verification scripts catch mismatches early
- All automation scripts should be idempotent
- .env.example with placeholder values prevents secrets leakage
- Clean/reset targets allow fresh starts without manual cleanup
