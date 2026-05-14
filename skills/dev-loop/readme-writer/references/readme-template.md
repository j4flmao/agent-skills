# README Template

```markdown
# Project Name

> One-line tagline explaining what problem this solves.

## Overview

2-3 paragraphs. What is this project? Who is it for? What makes it different from alternatives?

## Features

- **Feature 1**: Brief one-line description
- **Feature 2**: Brief one-line description
- **Feature 3**: Brief one-line description

## Tech Stack

| Category | Technology |
|----------|------------|
| Runtime | Node.js 22, TypeScript 5.x |
| Framework | NestJS 11 |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Message Broker | BullMQ / RabbitMQ |
| Infrastructure | Docker, Kubernetes, GitHub Actions |

## Prerequisites

- Node.js >= 22
- pnpm >= 9
- Docker Desktop
- PostgreSQL 16 (or Docker)

## Getting Started

### Installation

```bash
git clone https://github.com/org/project.git
cd project
cp .env.example .env
pnpm install
```

### Database Setup

```bash
pnpm db:migrate
pnpm db:seed
```

### Development

```bash
pnpm dev
```

Server starts at http://localhost:3000

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `JWT_SECRET` | Yes | — | JWT signing secret (min 32 chars) |
| `REDIS_URL` | No | `redis://localhost:6379` | Redis connection string |
| `PORT` | No | `3000` | HTTP server port |

## API Documentation

API docs available at `/api/docs` (Swagger) when running in development mode.

## Testing

```bash
# Unit tests
pnpm test

# Integration tests
pnpm test:integration

# E2E tests
pnpm test:e2e

# Test coverage
pnpm test:coverage
```

## Deployment

See [deployment guide](docs/deployment.md).

## Architecture

See [architecture documentation](docs/architecture.md) and [ADRs](docs/decisions/).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT © Author
```
