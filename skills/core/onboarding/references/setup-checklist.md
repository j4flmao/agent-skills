# Setup Checklist

## Environment Prerequisites

### System Requirements
| Requirement | Minimum | Recommended |
|---|---|---|
| CPU | 4 cores | 8+ cores (Apple Silicon M-series or Intel i7+) |
| RAM | 16 GB | 32 GB |
| Disk space | 20 GB free | 50 GB+ (SSD/NVMe) |
| OS | Windows 10 22H2+, macOS 13+, Ubuntu 22.04+ | Latest stable |
| Docker | Docker Desktop 4.25+ / Rancher Desktop 1.15+ | Latest |
| Git | 2.40+ | Latest |

### Required Accounts
- [ ] GitHub or GitLab account with SSH keys configured
- [ ] Password manager access (1Password, Bitwarden, or LastPass)
- [ ] Cloud provider access (AWS IAM user / GCP service account / Azure AD)
- [ ] Project management tool access (Jira, Linear, or GitHub Projects)
- [ ] Communication tools (Slack, Discord, or Teams)
- [ ] CI/CD platform access (GitHub Actions, GitLab CI, or CircleCI)
- [ ] Package registry access (npm private registry, Docker registry, or Artifactory)

### Pre-Arrival Checklist
- [ ] Repository invitation sent and accepted
- [ ] IAM roles and permissions provisioned (read-only first, escalated as needed)
- [ ] CI/CD pipeline access granted
- [ ] Password manager shared vault created with service credentials
- [ ] Dev database credentials provisioned
- [ ] API keys for third-party services (in dev mode) provisioned
- [ ] Onboarding buddy confirmed and calendar blocked
- [ ] Welcome message sent with day 1 schedule

## Tool Installation

### Version Managers
Install exactly one version manager. The project's repository should indicate which one to use via a dotfile.

**asdf** (recommended for polyglot repositories)
```bash
git clone https://github.com/asdf-vm/asdf.git ~/.asdf
echo '. "$HOME/.asdf/asdf.sh"' >> ~/.bashrc
asdf plugin add nodejs && asdf plugin add python && asdf plugin add java
asdf install
```

**nvm** (Node.js only)
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install
```

**pyenv** (Python only)
```bash
curl https://pyenv.run | bash
pyenv install
```

### Runtime Installation
Once the version manager is installed, install the language runtime:
```bash
# Node.js
nvm install 20  # or version from .nvmrc

# Python
pyenv install 3.12  # or version from .python-version

# Go
go install golang.org/dl/go1.22.0@latest

# Java
sdk install java 21.0.2-open

# Rust
rustup install stable
```

### Package Managers
```bash
# Node.js — prefer pnpm for speed and disk efficiency
npm install -g pnpm
pnpm setup

# Python
pip install poetry
# or
pip install pip-tools

# Java
sdk install maven
# or
sdk install gradle
```

### Database Clients
```bash
# PostgreSQL
# macOS:
brew install libpq
# Linux:
sudo apt install postgresql-client
# Windows: download from https://www.postgresql.org/download/

# MySQL / MariaDB
# macOS:
brew install mysql-client
# Linux:
sudo apt install mysql-client
# Windows: download from https://dev.mysql.com/downloads/

# Redis
# macOS:
brew install redis
# Linux:
sudo apt install redis-tools
# Windows: use WSL or Docker

# MongoDB
# macOS:
brew install mongosh
# Linux:
sudo apt install mongosh
# Windows: download from https://www.mongodb.com/try/download/shell
```

### Infrastructure CLIs
```bash
# AWS CLI v2
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip && sudo ./aws/install

# gcloud CLI
# macOS:
brew install --cask google-cloud-sdk
# Linux:
curl https://sdk.cloud.google.com | bash

# Azure CLI
# macOS:
brew install azure-cli
# Linux:
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Kubernetes
# macOS:
brew install kubectl
# Linux:
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"

# Terraform
# macOS:
brew install terraform
# Linux:
sudo apt install terraform

# Docker CLI
# macOS: Docker Desktop includes CLI
# Linux:
sudo apt install docker-ce docker-ce-cli
```

### Linters and Formatters
```bash
# ESLint + Prettier (included in project devDependencies — install via pnpm)
pnpm install

# Python formatters
pip install ruff black isort mypy

# Go formatters (included with Go installation)
go install golang.org/x/tools/cmd/goimports@latest

# Rust formatters
rustup component add rustfmt clippy

# Shell script formatter
brew install shfmt
```

## Repository Setup

### Clone and Configure
```bash
# Clone the repository
git clone git@github.com:org/project.git
cd project

# Verify remote
git remote -v
# Should show: origin  git@github.com:org/project.git (fetch)
#              origin  git@github.com:org/project.git (push)

# Set up git hooks
# If using husky:
pnpm prepare
# If using lefthook:
lefthook install
```

### Environment Configuration
```bash
# Create .env from template
cp .env.example .env

# Fill in secrets from password manager vault
# Each variable in .env has a comment indicating where to find the value:
# DB_PASSWORD=           # Found in 1Password vault "Dev DB Credentials"
# API_KEY=               # Found in 1Password vault "Dev API Keys"

# Verify all required variables are set
bin/check-env
```

## Verification

### Health Check
```bash
# Start the dev server
pnpm dev
# or
make run
# or
docker compose up

# Verify health endpoint
curl http://localhost:3000/health
# Expected: {"status":"ok","version":"1.0.0","uptime":123}

# If health check fails:
# 1. Check if the port is correct (verify in .env)
# 2. Check if another process is using the port: lsof -i :3000
# 3. Check the dev server logs for errors
```

### Test Suite
```bash
# Run the full test suite
pnpm test
# or
make test

# Expected output:
# PASS  tests/auth.test.ts
# PASS  tests/users.test.ts
# PASS  tests/api.test.ts
# ...
# Tests: 142 passed, 142 total

# If tests fail:
# 1. Check if the test database is running and migrated
# 2. Run a single failing test: pnpm test -- --grep "test name"
# 3. Check for environment-specific test configuration
```

### Linting and Type Checking
```bash
# Run linter
pnpm lint
# Expected: 0 errors, 0 warnings

# Run type checker
pnpm typecheck
# Expected: 0 type errors

# Run all checks
pnpm check
# Runs lint + typecheck + test in sequence
```

## Final Verification Checklist

- [ ] Repository cloned and configured
- [ ] Runtime version installed and active (`node --version` matches `.nvmrc`)
- [ ] Dependencies installed (`pnpm ls` or `pip list`)
- [ ] .env file created with all variables set
- [ ] Dev server starts and responds on health endpoint
- [ ] Test suite passes (all tests green)
- [ ] Linter passes (0 errors, 0 warnings)
- [ ] Type checker passes (0 errors)
- [ ] Can create a feature branch from main
- [ ] Can push to remote
- [ ] Can open a pull request
- [ ] Build script completes successfully (`pnpm build`)
