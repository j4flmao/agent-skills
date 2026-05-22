# Dev Container Setup Reference

## devcontainer.json Structure
```jsonc
{
  "name": "Project Name",
  "image": "mcr.microsoft.com/devcontainers/base:ubuntu-22.04",
  // OR build from Dockerfile:
  // "build": { "dockerfile": "Dockerfile" },
  "features": {
    "ghcr.io/devcontainers/features/node:1": { "version": "20" },
    "ghcr.io/devcontainers/features/docker-outside-of-docker:1": {}
  },
  "mounts": [
    "source=${env:HOME}${env:USERPROFILE}/.ssh,target=/home/vscode/.ssh,type=bind",
    "source=${env:HOME}${env:USERPROFILE}/.gitconfig,target=/home/vscode/.gitconfig,type=bind"
  ],
  "customizations": {
    "vscode": {
      "extensions": [
        "dbaeumer.vscode-eslint",
        "esbenp.prettier-vscode"
      ],
      "settings": {
        "editor.formatOnSave": true,
        "editor.defaultFormatter": "esbenp.prettier-vscode"
      }
    }
  },
  "postCreateCommand": "npm install",
  "postStartCommand": "npm run migrate",
  "forwardPorts": [3000, 5432, 6379],
  "remoteUser": "vscode"
}
```

## Dockerfile (Multi-Stage)
```dockerfile
FROM node:20-bookworm AS base
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl git zsh \
    && rm -rf /var/lib/apt/lists/*
RUN sh -c "$(curl -fsSL https://raw.github.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"

FROM base AS dev
WORKDIR /workspace
COPY package*.json ./
RUN npm ci
```

## docker-compose.yml
```yaml
services:
  app:
    build: .
    volumes:
      - .:/workspace:cached
    command: sleep infinity
    depends_on:
      - db
      - cache
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: app
      POSTGRES_PASSWORD: dev
  cache:
    image: redis:7-alpine
```

## VS Code Extensions (Common)
- `dbaeumer.vscode-eslint` — ESLint
- `esbenp.prettier-vscode` — Prettier
- `ms-vscode.vscode-typescript-next` — TypeScript
- `bradlc.vscode-tailwindcss` — Tailwind CSS
