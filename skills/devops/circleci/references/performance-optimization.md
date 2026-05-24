# CircleCI Performance Optimization

## Overview

Optimizing CircleCI pipelines reduces feedback time and compute costs. Key strategies include parallelism, test splitting, resource class selection, Docker layer caching, and intelligent caching.

## Parallelism

Parallelism runs a job across multiple independent executors, each processing a portion of the work.

### Basic Parallelism
```yaml
jobs:
  test:
    parallelism: 4
    docker:
      - image: cimg/node:20.12
    steps:
      - checkout
      - run: npm ci
      - run: |
          # CircleCI splits work across parallel containers
          circleci tests glob "tests/**/*.test.js" | circleci tests split > /tmp/tests-to-run
          npm test -- $(cat /tmp/tests-to-run)
```

### Test File Splitting
```yaml
jobs:
  test:
    parallelism: 5
    steps:
      - run: |
          # Split by file name (default)
          circleci tests glob "spec/**/*_spec.rb" | circleci tests split > /tmp/tests

      - run: |
          # Split by timing data (most efficient)
          circleci tests glob "tests/**/*.test.js" | circleci tests split --split-by=timings > /tmp/tests

      - run: |
          # Split by name with weight
          circleci tests glob "tests/**/*.test.js" | circleci tests split --split-by=name --cache-prefix=my-tests > /tmp/tests

      - run: npm test -- $(cat /tmp/tests)
```

### Split by Timing Data
```yaml
jobs:
  test:
    parallelism: 10
    steps:
      - run: |
          npm test -- --reporter=junit --reporter-options=outputDir=test-results
      - store_test_results:
          path: test-results

# Next run: CircleCI uses stored timings for optimal split
# Results: ~equal duration across all parallel containers
```

### Custom Splitting Strategies
```yaml
jobs:
  test-by-size:
    parallelism: 4
    steps:
      - run: |
          # Split by file size
          circleci tests glob "tests/**/*.test.js" | xargs ls -la | awk '{print $NF, $5}' > /tmp/sizes
          circleci tests split --split-by=filesize /tmp/sizes > /tmp/tests

  test-by-classname:
    parallelism: 3
    steps:
      - run: |
          # Split Java/Maven tests by class
          circleci tests glob "src/test/**/*Test.java" | circleci tests split > /tmp/tests
          mvn test -pl $(cat /tmp/tests | tr '\n' ',')

  test-e2e:
    parallelism: 6
    steps:
      - run: |
          # Split Cypress E2E tests
          circleci tests glob "cypress/e2e/**/*.cy.js" | circleci tests split > /tmp/tests
          npx cypress run --spec $(cat /tmp/tests | tr '\n' ',')
```

## Resource Classes

CircleCI offers various resource classes with different CPU/memory configurations.

### Available Resource Classes
```yaml
# Linux resource classes
resource_class: small          # 1 vCPU, 2GB RAM
resource_class: medium         # 2 vCPU, 4GB RAM (default)
resource_class: medium+        # 3 vCPU, 6GB RAM
resource_class: large          # 4 vCPU, 8GB RAM
resource_class: xlarge         # 8 vCPU, 16GB RAM
resource_class: 2xlarge        # 16 vCPU, 32GB RAM
resource_class: 2xlarge+       # 20 vCPU, 40GB RAM

# ARM resource classes
resource_class: arm.medium     # 2 vCPU, 4GB RAM
resource_class: arm.large      # 4 vCPU, 8GB RAM
resource_class: arm.xlarge     # 8 vCPU, 16GB RAM
resource_class: arm.2xlarge    # 16 vCPU, 32GB RAM
```

### Right-Sizing Examples
```yaml
# Lightweight: linting
jobs:
  lint:
    resource_class: small
    steps:
      - checkout
      - run: npm run lint

# Standard: build + test
jobs:
  build:
    resource_class: medium
    steps:
      - checkout
      - run: npm ci && npm run build

# Heavy: parallel compilation, bundling
jobs:
  build-heavy:
    resource_class: large
    steps:
      - run: npm run build:production

# Memory-intensive: large test suites
jobs:
  test-large:
    resource_class: 2xlarge
    parallelism: 4
    steps:
      - run: npm test -- --max-old-space-size=8192
```

## Docker Layer Caching (DLC)

DLC caches Docker image layers between builds, dramatically speeding up Docker image builds.

### Enabling DLC
```yaml
jobs:
  build-image:
    machine:
      image: ubuntu-2204:2024.01.1
    resource_class: medium
    steps:
      - checkout
      - setup_remote_docker:
          version: 20.10.14
          docker_layer_caching: true   # Enable DLC
      - run: |
          docker build \
            --cache-from $DOCKER_LOGIN/$IMAGE_NAME:latest \
            -t $DOCKER_LOGIN/$IMAGE_NAME:$CIRCLE_SHA1 \
            -t $DOCKER_LOGIN/$IMAGE_NAME:latest \
            .
      - run: docker push $DOCKER_LOGIN/$IMAGE_NAME:$CIRCLE_SHA1
```

### DLC with Multi-Stage Builds
```dockerfile
# Dockerfile — optimized for layer caching
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM base AS builder
COPY . .
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
USER node
CMD ["node", "dist/index.js"]
```

### DLC with BuildKit
```yaml
jobs:
  buildkit:
    machine:
      image: ubuntu-2204:2024.01.1
    steps:
      - setup_remote_docker:
          docker_layer_caching: true
      - run: |
          export DOCKER_BUILDKIT=1
          docker build \
            --cache-from $IMAGE:cache \
            --build-arg BUILDKIT_INLINE_CACHE=1 \
            -t $IMAGE:$CIRCLE_SHA1 \
            -t $IMAGE:cache \
            .
```

## Intelligent Caching

### Fine-Grained Cache Keys
```yaml
jobs:
  deps:
    steps:
      - restore_cache:
          keys:
            # Prefer exact match
            - v6-deps-{{ .Branch }}-{{ checksum "package-lock.json" }}
            # Fallback to branch cache
            - v6-deps-{{ .Branch }}-
            # Fallback to main cache
            - v6-deps-main-
            # Global fallback
            - v6-deps-
      - run: npm ci
      - save_cache:
          key: v6-deps-{{ .Branch }}-{{ checksum "package-lock.json" }}
          paths:
            - node_modules
            - ~/.npm
            - ~/.cache
```

### Multiple Cache Layers
```yaml
jobs:
  build:
    steps:
      # Layer 1: Dependencies (slowest to rebuild)
      - restore_cache:
          keys:
            - npm-{{ checksum "package-lock.json" }}
      - run: npm ci
      - save_cache:
          key: npm-{{ checksum "package-lock.json" }}
          paths: [node_modules]

      # Layer 2: Build cache (faster)
      - restore_cache:
          keys:
            - webpack-{{ .Branch }}-{{ checksum "webpack.config.js" }}
      - run: npm run build
      - save_cache:
          key: webpack-{{ .Branch }}-{{ checksum "webpack.config.js" }}
          paths: [dist/.cache]

      # Layer 3: Binary/System cache
      - restore_cache:
          keys:
            - binaries-{{ .Branch }}
      - run: npm run package
      - save_cache:
          key: binaries-{{ .Branch }}
          paths: [bin/]
```

## Test Result Optimization

### JUnit Report Timing
```yaml
jobs:
  test:
    steps:
      - run: |
          # Generate JUnit XML with timing data
          npm test -- --reporter=junit --reporter-options=outputDir=reports/junit
      - store_test_results:
          path: reports/junit
      - store_artifacts:
          path: reports
```

### Timing-Based Splitting Configuration
```yaml
# .circleci/config.yml

# Enable test splitting by timings
version: 2.1

jobs:
  test:
    parallelism: 6
    steps:
      - run: |
          # Use CircleCI stored timings
          TEST_FILES=$(circleci tests glob "tests/**/*.test.ts" | circleci tests split --split-by=timings)
          npm test -- $TEST_FILES
```

## Monitoring Optimization

### Insights API
```yaml
# View performance data
# CircleCI web UI → Insights → Workflows

# Track metrics:
# - P95 build duration
# - Queue time
# - Credit usage per job
# - Test timing distribution
```

### Pipeline Performance Dashboard
```yaml
# CircleCI API for metrics
GET /api/v2/project/:slug/pipelines/:id
GET /api/v2/project/:slug/workflows/:id
GET /api/v2/insights/:slug/workflows
```

## Best Practices

1. **Start with `parallelism: 4`** and adjust based on test suite size and timing data.
2. **Use `--split-by=timings`** after a few runs to collect timing data.
3. **Right-size `resource_class`** — small jobs don't need large instances.
4. **Enable DLC** for projects building Docker images.
5. **Use multiple cache keys** with fallback strategy (exact → branch → main → global).
6. **Separate build cache from dependency cache** for granular invalidation.
7. **Monitor credit usage** and balance parallelism against cost.
8. **Use `store_test_results`** to build timing data for optimal splitting.
9. **Run linting on `small`** resource class to save credits.
10. **Avoid oversized parallelism** — diminishing returns past 10-15 containers.
