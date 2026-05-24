# CircleCI Configuration Structure

## Overview

CircleCI uses `.circleci/config.yml` with YAML 2.1+ syntax. The configuration is structured around jobs (units of work), workflows (job orchestration), executors (runtime environments), and steps (commands).

## Core Structure

```yaml
version: 2.1

orbs:          # Reusable package configurations
commands:      # Reusable step sequences
executors:     # Reusable runtime environment definitions
jobs:          # Work units
workflows:     # Job orchestration
```

## Executors

Executors define the execution environment for jobs.

### Docker Executor
```yaml
executors:
  node-executor:
    docker:
      - image: cimg/node:20.12
      - image: postgis/postgis:16-3.4
        environment:
          POSTGRES_USER: test
          POSTGRES_DB: test
          POSTGRES_PASSWORD: test
    resource_class: medium
    working_directory: ~/project

jobs:
  test:
    executor: node-executor
    steps:
      - checkout
      - run: npm test
```

### Machine Executor
```yaml
executors:
  docker-builder:
    machine:
      image: ubuntu-2204:2024.01.1
    resource_class: medium

jobs:
  build-image:
    executor: docker-builder
    steps:
      - checkout
      - run: docker build -t app .
```

### macOS Executor
```yaml
executors:
  macos-executor:
    macos:
      xcode: 15.2
    resource_class: macos.m1.medium.gen1

jobs:
  build-ios:
    executor: macos-executor
    steps:
      - checkout
      - run: xcodebuild -project App.xcodeproj -scheme App build
```

### Windows Executor
```yaml
executors:
  windows-executor:
    machine:
      image: windows-server-2022-gui:2024-01-17
    shell: powershell.exe

jobs:
  build-dotnet:
    executor: windows-executor
    steps:
      - checkout
      - run: dotnet build
```

## Jobs

### Basic Job
```yaml
jobs:
  build:
    docker:
      - image: cimg/node:20.12
    steps:
      - checkout
      - restore_cache:
          key: v1-deps-{{ checksum "package-lock.json" }}
      - run: npm ci
      - save_cache:
          key: v1-deps-{{ checksum "package-lock.json" }}
          paths:
            - node_modules
      - run: npm run build
      - persist_to_workspace:
          root: .
          paths:
            - dist
            - node_modules
```

### Job with Parameters
```yaml
jobs:
  deploy:
    parameters:
      environment:
        type: enum
        enum: ["staging", "production"]
    docker:
      - image: cimg/python:3.12
    steps:
      - checkout
      - run: echo "Deploying to << parameters.environment >>"
      - run: deploy.sh << parameters.environment >>
```

## Steps

### Available Step Types
```yaml
steps:
  - checkout                        # Checkout source code
  - run:                            # Run a command
      name: Install dependencies
      command: npm ci
      working_directory: app/
      background: false
      no_output_timeout: 30m
      environment:
        NODE_ENV: production
  - setup_remote_docker:            # Remote Docker environment
      version: 20.10.14
      docker_layer_caching: true
  - persist_to_workspace:           # Share data between jobs
      root: .
      paths:
        - dist
  - attach_workspace:               # Attach workspace data
      at: .
  - restore_cache:                  # Restore cached data
      keys:
        - v1-deps-{{ checksum "package-lock.json" }}
        - v1-deps-
  - save_cache:                     # Save cache
      key: v1-deps-{{ checksum "package-lock.json" }}
      paths:
        - node_modules
  - store_artifacts:                # Store build artifacts
      path: test-results
      destination: test-output
  - store_test_results:             # Store test results for insights
      path: test-results
  - run_command:                    # Run a defined command
      command: hello-world
```

## Caching

### Dependency Caching
```yaml
jobs:
  install-deps:
    docker:
      - image: cimg/node:20.12
    steps:
      - checkout
      - restore_cache:
          name: Restore npm cache
          keys:
            - v2-npm-{{ checksum "package-lock.json" }}
            - v2-npm-
      - run: npm ci
      - save_cache:
          name: Save npm cache
          key: v2-npm-{{ checksum "package-lock.json" }}
          paths:
            - node_modules
            - ~/.npm
```

### Multiple Cache Keys
```yaml
restore_cache:
  name: Restore dependencies
  keys:
    # Exact lock file match
    - v1-deps-{{ checksum "package-lock.json" }}-{{ checksum "yarn.lock" }}
    # Only package-lock match
    - v1-deps-{{ checksum "package-lock.json" }}-
    # Any previous cache
    - v1-deps-
```

### Cache Best Practices
```yaml
restore_cache:
  name: Restore pip cache
  keys:
    - pip-v2-{{ .Branch }}-{{ checksum "requirements.txt" }}
    - pip-v2-{{ .Branch }}-
    - pip-v2-
save_cache:
  key: pip-v2-{{ .Branch }}-{{ checksum "requirements.txt" }}
  paths:
    - ~/.cache/pip

# Job-level caching for multiple directories
steps:
  - restore_cache:
      keys:
        - gem-cache-v2-{{ checksum "Gemfile.lock" }}
        - gem-cache-v2-
  - run: bundle install
  - save_cache:
      key: gem-cache-v2-{{ checksum "Gemfile.lock" }}
      paths:
        - vendor/bundle
```

## Workspaces

Workspaces pass data between jobs in the same workflow.

```yaml
# Job 1: Save workspace
jobs:
  build:
    steps:
      - run: npm run build
      - persist_to_workspace:
          root: .
          paths:
            - dist/
            - build-output/

# Job 2: Attach workspace (runs on potentially different runner)
jobs:
  deploy:
    steps:
      - attach_workspace:
          at: /tmp/workspace
      - run: ls /tmp/workspace/dist/
```

## Artifacts

```yaml
jobs:
  test:
    steps:
      - run: mkdir -p test-results && npm test -- --report-dir test-results
      - store_test_results:
          path: test-results
      - store_artifacts:
          path: test-results
          destination: test-reports
      - store_artifacts:
          path: coverage/
          destination: coverage-report
```

## Workflows

### Basic Workflow
```yaml
workflows:
  version: 2
  build-and-test:
    jobs:
      - build
      - test:
          requires:
            - build
      - lint:
          requires:
            - build
```

### Workflow with Filters
```yaml
workflows:
  deploy:
    jobs:
      - build:
          filters:
            branches:
              only: main
      - deploy-staging:
          requires:
            - build
          filters:
            branches:
              only: main
      - approve-prod:
          type: approval
          requires:
            - deploy-staging
          filters:
            branches:
              only: main
      - deploy-production:
          requires:
            - approve-prod
          filters:
            branches:
              only: main
```

### Fan-Out / Fan-In Workflow
```yaml
workflows:
  test-all:
    jobs:
      - build
      - test-unit:
          requires:
            - build
      - test-integration:
          requires:
            - build
      - test-e2e:
          requires:
            - build
      - deploy:
          requires:
            - test-unit
            - test-integration
            - test-e2e
```

### Scheduled Workflows
```yaml
workflows:
  nightly:
    triggers:
      - schedule:
          cron: "0 2 * * *"
          filters:
            branches:
              only:
                - main
    jobs:
      - full-test-suite
      - security-scan
```

## Commands

Reusable step sequences defined at the top level.

```yaml
commands:
  install-deps:
    parameters:
      cache-key:
        type: string
        default: deps-cache
    steps:
      - restore_cache:
          keys:
            - << parameters.cache-key >>-{{ checksum "package-lock.json" }}
            - << parameters.cache-key >>-
      - run: npm ci
      - save_cache:
          key: << parameters.cache-key >>-{{ checksum "package-lock.json" }}
          paths:
            - node_modules

jobs:
  build:
    steps:
      - checkout
      - install-deps:
          cache-key: node-deps
      - run: npm run build
```

## Best Practices

1. **Define executors** for reusable runtime environments across jobs.
2. **Use `persist_to_workspace`** for sharing build artifacts between jobs.
3. **Restore cache with fallback keys** — if exact match fails, use partial match.
4. **Pin Docker image tags** to specific versions (e.g., `cimg/node:20.12`).
5. **Use `resource_class`** matching job requirements (CPU/memory intensive vs. light).
6. **Set `no_output_timeout`** for long-running commands like test suites.
7. **Keep workflows shallow** — no more than 3-4 levels of job dependencies.
8. **Use `store_test_results`** for CircleCI Insights and test timing data.
9. **Separate build, test, and deploy** into distinct workflow jobs.
10. **Use `parameters` on jobs** to create reusable job templates.
