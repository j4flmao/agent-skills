# Workflow Basics

## Syntax Reference

```yaml
name: CI
run-name: "CI ${{ github.sha }}"
on:
  push:
    branches: [main]
    paths-ignore: ["docs/**", "*.md"]
  pull_request:
    branches: [main]
    types: [opened, synchronize, reopened]
  schedule:
    - cron: "0 6 * * 1"  # Every Monday 6AM UTC

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

defaults:
  run:
    shell: bash
    working-directory: ./app

env:
  NODE_ENV: test

jobs:
  build:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm test
```

## Trigger Events

| Event | Use case |
|-------|----------|
| `push` | CI on branch commits |
| `pull_request` | PR validation |
| `workflow_dispatch` | Manual trigger |
| `workflow_call` | Reusable workflow |
| `schedule` | Periodic runs (cron) |
| `release` | Tag/publish events |
| `registry_package` | Package published |

## Job Dependencies

```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    steps: [run: npm run lint]

  test:
    needs: [lint]
    runs-on: ubuntu-latest
    steps: [run: npm test]

  deploy:
    needs: [test]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps: [run: npm run deploy]
```

## Contexts and Expressions

```yaml
# github context — event payload, repo info
${{ github.repository }}
${{ github.ref }}
${{ github.sha }}
${{ github.event_name }}
${{ github.actor }}
${{ github.run_id }}

# env context — environment variables
${{ env.NODE_ENV }}

# job context — job status
${{ job.status }}
${{ job.container }}

# steps context — step outputs
${{ steps.build.outputs.version }}

# runner context — runner info
${{ runner.os }}
${{ runner.arch }}

# secrets context — encrypted secrets
${{ secrets.DOCKER_PASSWORD }}

# strategy context — matrix values
${{ matrix.node-version }}
${{ matrix.os }}
```

## Functions

```yaml
# String functions
contains('hello world', 'hello')  # true
startsWith('refs/heads/main', 'refs/heads/')  # true
endsWith('file-v1.2.3.tar.gz', '.tar.gz')  # true
format('version {0}', '1.2.3')  # "version 1.2.3"
join(['a', 'b', 'c'], ', ')  # "a, b, c"

# Object functions
toJSON(github)
fromJSON(inputs.matrix)
hashFiles('**/package-lock.json')

# Status check functions
success()
failure()
always()
cancelled()
```

## Matrix Strategy

```yaml
strategy:
  matrix:
    os: [ubuntu-latest, windows-latest, macos-latest]
    node: [18, 20, 22]
    exclude:
      - os: windows-latest
        node: 18
    include:
      - os: ubuntu-latest
        node: 22
        experimental: true
  fail-fast: false
  max-parallel: 4
```
