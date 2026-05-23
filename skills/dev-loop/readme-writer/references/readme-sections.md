# README Sections Guide

## Required Sections

Every README should include these sections in order:

```
1. Title + Badges
2. Overview / Description
3. Features
4. Tech Stack
5. Prerequisites
6. Getting Started (Installation, Development)
7. Configuration (Environment Variables)
8. Testing
9. Deployment
10. License
```

## Optional Sections (include as needed)

```
11. Architecture
12. API Documentation
13. Project Structure
14. Contributing
15. Troubleshooting
16. FAQ
17. Changelog (link)
18. Screenshots / Demo
19. Roadmap
20. Acknowledgments
```

## Section Templates

### Title + Badges

```markdown
# Project Name

[![CI](https://img.shields.io/github/actions/workflow/status/org/project/ci.yml?branch=main)](https://github.com/org/project/actions)
[![npm](https://img.shields.io/npm/v/project-name)](https://www.npmjs.com/package/project-name)
[![License](https://img.shields.io/github/license/org/project)](LICENSE)
[![Coverage](https://img.shields.io/codecov/c/github/org/project)](https://codecov.io/gh/org/project)
```

### Overview

```markdown
> **Project Name** is a {type of project} that solves {problem} for {target audience}.

{2-3 paragraphs describing the project, its purpose, and what makes it unique.
Explain the problem it solves and who should use it.}
```

### Features

```markdown
## Features

- **Feature 1**: Brief description of what it does and why it matters
- **Feature 2**: Brief description with key capability highlight
- **Feature 3**: Brief description mentioning performance/scale benefits

### Coming Soon

- Planned feature 1
- Planned feature 2
```

### Tech Stack

```markdown
## Tech Stack

| Category | Technology |
|----------|------------|
| **Runtime** | Node.js 22 |
| **Framework** | NestJS 11 |
| **Database** | PostgreSQL 16 |
| **Cache** | Redis 7.2 |
| **Queue** | BullMQ |
| **Infra** | Docker, Kubernetes |
| **CI/CD** | GitHub Actions |
```

### Prerequisites

```markdown
## Prerequisites

- **Node.js** >= 20.0.0 (recommended: 22.x)
- **npm** >= 10.0.0 or **pnpm** >= 9.0.0
- **Docker** and **Docker Compose** (for local services)
- **PostgreSQL** 16 (if running without Docker)
- **Redis** 7.2 (if running without Docker)
```

### Getting Started

```markdown
## Getting Started

### Installation

```bash
# Clone the repository
git clone https://github.com/org/project-name.git
cd project-name

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start development services
docker compose up -d postgres redis

# Run database migrations
npm run db:migrate

# Seed development data
npm run db:seed

# Start development server
npm run dev
```

Your server will be running at http://localhost:3000.

> **First time?** See the [Quickstart Guide](docs/quickstart.md) for a step-by-step walkthrough.
```

### Configuration

```markdown
## Configuration

All configuration is through environment variables. Copy `.env.example` to `.env` and fill in the values.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | development | Runtime environment |
| `PORT` | No | 3000 | HTTP server port |
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `REDIS_URL` | Yes | — | Redis connection string |
| `JWT_SECRET` | Yes | — | JWT signing key (min 32 chars) |
| `JWT_EXPIRES_IN` | No | 15m | Access token expiry |
| `CORS_ORIGIN` | No | http://localhost:5173 | Allowed CORS origin |
| `LOG_LEVEL` | No | debug | Logging level |
```

### Testing

```markdown
## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode (development)
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npx jest src/services/__tests__/user.test.ts

# Run integration tests (requires Docker services)
npm run test:integration

# Run e2e tests
npm run test:e2e
```

### Test Structure

| Type | Location | Description |
|------|----------|-------------|
| Unit | `src/**/__tests__/` | Isolated function/class tests |
| Integration | `test/integration/` | Service-level tests with DB |
| E2E | `test/e2e/` | Full flow from API to database |
```

### Deployment

```markdown
## Deployment

### Docker

```bash
# Build production image
docker build -t project-name:latest .

# Run with production config
docker run -p 3000:3000 --env-file .env.production project-name:latest
```

### Docker Compose

```bash
docker compose -f docker-compose.prod.yml up -d
```

### Kubernetes

See [deployment/k8s/README.md](deployment/k8s/README.md) for Kubernetes manifests and instructions.

### CI/CD

Deployments are automated through GitHub Actions:

| Environment | Branch | Trigger |
|-------------|--------|---------|
| Staging | `main` | Push |
| Production | `release/*` | PR merged |
```

### Architecture

```markdown
## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌────────────┐
│  Client     │────▶│  API Gateway │────▶│  Services  │
└─────────────┘     └──────────────┘     └──────┬─────┘
                                                │
                     ┌──────────────────────────┼──────────┐
                     │                          │          │
              ┌──────▼──────┐          ┌───────▼───────┐   │
              │ PostgreSQL  │          │    Redis      │   │
              └─────────────┘          └───────────────┘   │
                     │                          │          │
              ┌──────▼──────┐                              │
              │   S3/MinIO  │                              │
              └─────────────┘                              │
```

The application follows a modular monolith architecture with the following layers:
- **API Gateway**: Request routing, auth, rate limiting
- **Services**: Business logic, organized by domain
- **Data**: PostgreSQL (primary), Redis (cache/queue), S3 (storage)

See [docs/architecture.md](docs/architecture.md) for detailed decision records.
```

### Project Structure

```markdown
## Project Structure

```
src/
├── modules/
│   ├── auth/          # Authentication & authorization
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.module.ts
│   │   └── __tests__/
│   ├── users/         # User management
│   └── orders/        # Order processing
├── common/
│   ├── middleware/    # Express middleware
│   ├── guards/        # Auth guards
│   ├── pipes/         # Validation pipes
│   └── decorators/    # Custom decorators
├── config/
│   └── database.ts    # Database configuration
├── main.ts            # Application entry point
└── app.module.ts      # Root module
```

## README Writing Rules

| Rule | Rationale |
|------|-----------|
| One README per project | Single source of truth |
| Write for newcomers | Assume zero context |
| Include exact commands | Copy-paste ready |
| Link to `docs/` for details | Keep README concise |
| < 200 lines for most projects | Scannable |
| Badges at the top | Quick status at a glance |
| Screenshots for UI projects | Visual context |
| Use tables for structured data | Easy scanning |
| Version pinning in examples | Avoids confusion with breaking changes |
| Active voice, imperative mood | Direct and actionable |
