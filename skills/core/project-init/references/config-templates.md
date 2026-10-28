# Config Templates Reference

Starter configuration files that `project-init` drops into a new repository. Each template is minimal and current; extend per project rather than copying large presets.

## TypeScript / Node

### tsconfig.json (library or service, bundler-resolved)
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

For code run directly by Node without a bundler, use `"module": "NodeNext"` and `"moduleResolution": "NodeNext"` instead, and write relative imports with `.js` extensions.

### eslint.config.js (ESLint 9 flat config)
ESLint 9 uses flat config by default; `.eslintrc.*` is the legacy format and is not read unless `ESLINT_USE_FLAT_CONFIG=false`.

```js
// eslint.config.js
import js from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist/', 'coverage/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': 'warn',
    },
  },
)
```

Install: `npm i -D eslint @eslint/js typescript-eslint`.

### .editorconfig
```ini
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true

[*.{go,Makefile}]
indent_style = tab
```

## Go

### .golangci.yml (golangci-lint v2)
golangci-lint v2 requires a `version` key and moved formatters into their own section.

```yaml
version: "2"
linters:
  enable:
    - errcheck
    - govet
    - staticcheck
    - ineffassign
    - unused
  exclusions:
    rules:
      - path: _test\.go
        linters: [errcheck]
formatters:
  enable:
    - gofmt
    - goimports
```

On golangci-lint v1 the file has no `version` key, formatters are listed under `linters.enable`, and exclusions live under `issues.exclude-rules`. Run `golangci-lint migrate` to convert.

## Python (uv)

### pyproject.toml
```toml
[project]
name = "app"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = []

[dependency-groups]
dev = ["ruff", "mypy", "pytest"]

[tool.ruff]
line-length = 100
target-version = "py312"

[tool.ruff.lint]
select = ["E", "F", "I", "N", "W", "UP", "B"]

[tool.mypy]
strict = true
python_version = "3.12"

[tool.pytest.ini_options]
testpaths = ["tests"]
```

Create the environment with `uv sync`; add packages with `uv add <pkg>` / `uv add --dev <pkg>`.

## Rust

### rustfmt.toml
```toml
max_width = 100
tab_spaces = 4
edition = "2021"
```

### Lints in Cargo.toml
```toml
[lints.rust]
unsafe_code = "forbid"

[lints.clippy]
pedantic = { level = "warn", priority = -1 }
unwrap_used = "warn"
```

`priority = -1` lets individual lints override the `pedantic` group.

## Docker

### .dockerignore
```
node_modules
.git
.env
.env.*
dist
coverage
*.log
```

Do not ignore `README.md` or other files the build copies; keep the list to artifacts and secrets.

### compose.yaml
The top-level `version:` key is obsolete in the Compose Specification and Compose v2 ignores it with a warning; omit it. `compose.yaml` is the preferred file name (`docker-compose.yml` still works).

```yaml
services:
  app:
    build: .
    ports: ["3000:3000"]
    environment:
      NODE_ENV: development
      DATABASE_URL: postgres://postgres:localdev@db:5432/app
    volumes:
      - .:/app
      - /app/node_modules
    depends_on:
      db:
        condition: service_healthy
  db:
    image: postgres:17-alpine
    environment:
      POSTGRES_DB: app
      POSTGRES_PASSWORD: localdev   # local development only
    ports: ["5432:5432"]
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 3s
      retries: 10

volumes:
  pgdata:
```

`condition: service_healthy` waits for the healthcheck instead of only container start. The anonymous `/app/node_modules` volume stops the bind mount from hiding dependencies installed in the image.

## Kubernetes

### kubeconfig context
Contexts reference a cluster and a user; a context without `user` cannot authenticate.

```yaml
apiVersion: v1
kind: Config
clusters:
  - name: production
    cluster:
      server: https://cluster.example.com
      certificate-authority: /path/to/ca.crt
users:
  - name: deployer
    user:
      exec:
        apiVersion: client.authentication.k8s.io/v1
        command: kubelogin
        args: ["get-token"]
contexts:
  - name: production
    context:
      cluster: production
      user: deployer
      namespace: production
current-context: production
```

Prefer exec-based credential plugins (cloud CLI or OIDC) over static tokens in the file.

## Checklist

- [ ] No secrets committed; local-only passwords marked as such
- [ ] ESLint flat config, not `.eslintrc`
- [ ] Compose file without `version:`; healthchecks for dependencies
- [ ] Linter config matches the installed linter major version
- [ ] Python tooling driven by `uv`
