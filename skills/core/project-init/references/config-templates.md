# Config Templates Reference

## TypeScript / Node

### tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

### .eslintrc.json
```json
{
  "extends": ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  "parser": "@typescript-eslint/parser",
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "no-console": "warn"
  }
}
```

## Golang

### golangci-lint config
```yaml
linters:
  enable:
    - gofmt
    - govet
    - errcheck
    - staticcheck
issues:
  exclude-rules:
    - path: _test\.go
      linters: [errcheck]
```

## Python

### pyproject.toml
```toml
[tool.ruff]
line-length = 100
target-version = "py312"

[tool.ruff.lint]
select = ["E", "F", "I", "N", "W"]

[tool.mypy]
strict = true
python_version = "3.12"
```

## Rust

### rustfmt.toml
```toml
max_width = 100
tab_spaces = 4
edition = "2021"
```

### clippy config in Cargo.toml
```toml
[lints.clippy]
enum_clike_unportable_variant = "deny"
pedantic = "warn"
```

## Docker

### .dockerignore
```
node_modules
.git
*.md
.env
dist
coverage
```

### docker-compose.yml
```yaml
version: "3.9"
services:
  app:
    build: .
    ports: ["3000:3000"]
    environment:
      - NODE_ENV=development
    volumes:
      - .:/app
    depends_on:
      - db
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: app
      POSTGRES_PASSWORD: localdev
    ports: ["5432:5432"]
```

## Kubernetes

### kubeconfig context
```yaml
apiVersion: v1
kind: Config
clusters:
  - cluster:
      server: https://cluster.example.com
    name: production
contexts:
  - context:
      cluster: production
      namespace: production
    name: production
```
