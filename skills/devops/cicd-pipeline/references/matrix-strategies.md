# Matrix Build Strategies

Matrix builds run parallel jobs across combinations of parameters (OS, language version, etc.) to validate cross-platform compatibility.

## GitHub Actions Matrix

### Basic Matrix

```yaml
jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        node: [18, 20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
      - run: npm ci
      - run: npm test
```

### Include / Exclude

```yaml
strategy:
  matrix:
    os: [ubuntu-latest, windows-latest]
    node: [18, 20, 22]
    include:
      - os: ubuntu-latest
        node: 22
        coverage: true  # extra dimension
    exclude:
      - os: windows-latest
        node: 18  # known incompatible
```

## Test Sharding

Split tests across parallel jobs to reduce overall time:

```yaml
jobs:
  test:
    strategy:
      matrix:
        shard: [1, 2, 3, 4]
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - name: Run tests
        run: npx jest --shard=${{ matrix.shard }}/4
```

### Playwright Sharding

```yaml
test:
  strategy:
    matrix:
      shardIndex: [1, 2, 3, 4]
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx playwright test --shard=${{ matrix.shardIndex }}/${{ strategy.job-total }}
```

### Vitest Workspaces

```yaml
- name: Run sharded tests
  run: npx vitest run --reporter=junit --outputFile=results-${{ matrix.shard }}.xml
  env:
    VITEST_SHARD: ${{ matrix.shard }}/4
```

## Cross-Version Testing

### Language Runtime Matrix

```yaml
strategy:
  matrix:
    python-version: ["3.10", "3.11", "3.12"]
    os: [ubuntu-latest, macos-latest]
    include:
      - python-version: "3.12"
        os: ubuntu-latest
        coverage: true

steps:
  - uses: actions/setup-python@v5
    with:
      python-version: ${{ matrix.python-version }}
  - run: pip install -e ".[dev]"
  - run: pytest
    if: ${{ !matrix.coverage }}
  - run: pytest --cov --cov-report=xml
    if: ${{ matrix.coverage }}
```

### Java Version Matrix

```yaml
strategy:
  matrix:
    java: [11, 17, 21]
    os: [ubuntu-latest]
steps:
  - uses: actions/setup-java@v4
    with:
      distribution: temurin
      java-version: ${{ matrix.java }}
  - run: mvn clean verify
```

## OS Matrix

```yaml
strategy:
  matrix:
    os:
      - ubuntu-latest
      - windows-latest
      - macos-latest-14  # Apple Silicon
    exclude:
      - os: macos-latest-14
        node: 18

# Use os-specific commands
steps:
  - name: Set line endings
    if: runner.os == 'Windows'
    run: git config --global core.autocrlf true
  - name: Run cross-platform tests
    run: npm test
```

## Parallel Job Execution

### Max Parallelism

```yaml
strategy:
  matrix:
    version: [1, 2, 3, 4, 5, 6, 7, 8]
  max-parallel: 4  # run 4 at a time
  fail-fast: false  # continue on failure
```

### Dependent Matrices

```yaml
build:
  runs-on: ubuntu-latest
  strategy:
    matrix:
      arch: [amd64, arm64]
  steps:
    - uses: actions/checkout@v4
    - run: docker buildx build --platform linux/${{ matrix.arch }} .

test:
  needs: build
  strategy:
    matrix:
      arch: [amd64, arm64]
  steps:
    - run: docker run --platform linux/${{ matrix.arch }} myapp:test
```

## GitLab CI Parallel

```yaml
test:
  parallel:
    matrix:
      - OS: [ubuntu, windows, macos]
        VERSION: [3.10, 3.11, 3.12]
  script:
    - pytest
```

## Jenkins Matrix

```groovy
pipeline {
    agent any
    stages {
        stage('Test') {
            matrix {
                axes {
                    axis {
                        name 'OS'
                        values 'linux', 'windows', 'macos'
                    }
                    axis {
                        name 'NODE_VERSION'
                        values '18', '20', '22'
                    }
                }
                stages {
                    stage('Run Tests') {
                        steps {
                            sh "npm test"
                        }
                    }
                }
            }
        }
    }
}
```

## Resource Optimization

```yaml
jobs:
  setup:
    runs-on: ubuntu-latest
    outputs:
      versions: ${{ steps.versions.outputs.versions }}
    steps:
      - id: versions
        run: |
          # Dynamically compute matrix
          echo 'versions=["18","20","22"]' >> $GITHUB_OUTPUT

  test:
    needs: setup
    strategy:
      matrix:
        version: ${{ fromJSON(needs.setup.outputs.versions) }}
    steps:
      - run: echo "Testing node ${{ matrix.version }}"
```

## Reporting and Artifacts

```yaml
- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: test-results-${{ matrix.os }}-${{ matrix.version }}
    path: test-results.xml

- name: Publish test report
  uses: dorny/test-reporter@v1
  if: always()
  with:
    name: Test Report (${{ matrix.os }})
    path: test-results-*.xml
    reporter: java-junit
```

Matrix strategies maximize test coverage across environments while minimizing wall-clock time through parallel execution.
