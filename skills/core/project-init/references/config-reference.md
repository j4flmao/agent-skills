# Config File Reference

## AGENTS.md

```markdown
# Project Rules

Stack: nodejs (Express + TypeScript)
Test: `pnpm test`
Lint: `pnpm lint`
Typecheck: `pnpm typecheck`
Build: `pnpm build`
Deploy: `pnpm deploy`

## Conventions
- Commits: conventional commits (`feat:`, `fix:`, `chore:`, `docs:`)
- Branch naming: `{type}/{description}` (e.g. `feat/user-auth`)
- Run `pnpm test` before every commit
- PRs require 1 approval
- Merge strategy: squash
```

## .gitignore

```gitignore
# Dependencies
node_modules/
.pnp
.pnp.js

# Build
dist/
build/
target/
.next/
out/

# Environment
.env
.env.local
.env.*.local

# Logs
*.log
npm-debug.log*

# IDE
.idea/
*.iml
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Coverage
coverage/
lcov-report/

# Docker
docker-compose.override.yml

# Misc
.cache/
tmp/
*.tsbuildinfo
```

## .editorconfig

```ini
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

[*.md]
trim_trailing_whitespace = false
```

## .pre-commit-config.yaml

```yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.6.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-added-large-files
        args: ["--maxkb=500"]

  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.18.2
    hooks:
      - id: gitleaks
```

## .github/settings.yml

```yaml
repository:
  name: project-name
  description: "Short project description"
  private: false
  has_issues: true
  has_projects: false
  has_wiki: false
  default_branch: main
  allow_squash_merge: true
  allow_merge_commit: false
  allow_rebase_merge: false
  delete_branch_on_merge: true

branches:
  - name: main
    protection:
      required_status_checks:
        strict: true
        contexts:
          - "lint"
          - "typecheck"
          - "test"
      required_pull_request_reviews:
        required_approving_review_count: 1
      enforce_admins: true
```

## .github/dependabot.yml

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
    labels:
      - "dependencies"
    groups:
      dev-deps:
        patterns:
          - "eslint*"
          - "jest*"
          - "@types/*"

  - package-ecosystem: "docker"
    directory: "/"
    schedule:
      interval: "monthly"
```

## renovate.json

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": ["config:recommended"],
  "labels": ["dependencies"],
  "packageRules": [
    {
      "matchUpdateTypes": ["minor", "patch"],
      "groupName": "all non-major dependencies",
      "groupSlug": "all-minor-patch"
    },
    {
      "matchDepTypes": ["devDependencies"],
      "automerge": true
    }
  ],
  "schedule": ["before 9am on Monday"]
}
```

## Dockerfile (Node.js)

```dockerfile
FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

FROM base AS build
COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN pnpm build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY package.json ./
EXPOSE 3000
CMD ["node", "dist/main"]
```

## docker-compose.yml

```yaml
services:
  app:
    build: .
    ports: ["3000:3000"]
    environment:
      - NODE_ENV=development
    volumes:
      - .:/app
      - /app/node_modules
    depends_on:
      db:
        condition: service_healthy
    env_file: .env

  db:
    image: postgres:16-alpine
    ports: ["5432:5432"]
    environment:
      POSTGRES_DB: app
      POSTGRES_PASSWORD: localdev
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

## Makefile

```makefile
.PHONY: setup dev test lint build clean

setup:
	cp -n .env.example .env || true
	pnpm install

dev:
	pnpm dev

test:
	pnpm test

lint:
	pnpm lint

typecheck:
	pnpm typecheck

build:
	pnpm build

clean:
	rm -rf dist coverage node_modules
```
