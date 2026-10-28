# GitHub Actions Workflow Optimization

Making GitHub Actions workflows faster, cheaper, and more reliable: triggering only when needed, caching correctly, parallelizing with matrices and dynamic fan-out, cancelling redundant runs, and sizing runners. Reusable workflows and composite actions are covered in `reusable-workflows.md` and `composite-actions.md`.

## Measure First

- Use the workflow run summary and job timing to find the slowest jobs and steps.
- Check billable minutes in organization billing/usage reports; macOS and Windows minutes cost more than Linux, and larger runners are billed at higher per-minute rates.
- Track queue time separately from run time; long queues point to runner capacity or concurrency limits, not slow steps.

## Trigger Only When Needed

```yaml
on:
  push:
    branches: [main]
    paths-ignore: ['**.md', 'docs/**']
  pull_request:
    branches: [main]
    paths-ignore: ['**.md', 'docs/**']
  workflow_dispatch:
```

- `paths` / `paths-ignore` filter whole workflows. For per-job filtering in monorepos, compute changed paths in a first job (e.g. `dorny/paths-filter`) and gate jobs on its outputs.
- Note: a workflow skipped by path filters reports no status; if it provides a required check, branch protection waits forever. Use job-level filtering with an always-running "gate" job for required checks.

```yaml
jobs:
  changes:
    runs-on: ubuntu-latest
    permissions: { contents: read, pull-requests: read }
    outputs:
      api: ${{ steps.filter.outputs.api }}
      web: ${{ steps.filter.outputs.web }}
    steps:
      - uses: actions/checkout@v4
      - id: filter
        uses: dorny/paths-filter@v3
        with:
          filters: |
            api: ['services/api/**']
            web: ['apps/web/**']

  api-test:
    needs: changes
    if: needs.changes.outputs.api == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: make -C services/api test
```

## Cancel Redundant Runs

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}
```

Cancel superseded PR runs, but do not cancel in-progress deployments on `main`; for deployments use a separate concurrency group per environment without cancellation.

## Dependency Caching

Prefer the built-in caching of setup actions; it keys on lockfiles automatically:

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: 22
    cache: npm            # or pnpm / yarn (install pnpm first with pnpm/action-setup)
- run: npm ci
```

Equivalent options: `actions/setup-python` (`cache: pip|poetry|pipenv`), `actions/setup-java` (`cache: gradle|maven`), `actions/setup-go` (Go module and build cache on by default), `astral-sh/setup-uv` (`enable-cache: true`).

Manual cache when needed:

```yaml
- uses: actions/cache@v4
  with:
    path: ~/.cache/turbo
    key: turbo-${{ runner.os }}-${{ github.sha }}
    restore-keys: turbo-${{ runner.os }}-
```

Rules:
- Cache package manager stores (`~/.npm`, pnpm store), not `node_modules` with `npm ci` (which deletes `node_modules` anyway).
- Keys must change when inputs change (lockfile hash); `restore-keys` provide partial hits.
- Caches are scoped by branch: PRs can read caches from the base branch, not from other PRs. Warm caches on `main`.
- Repository cache storage is limited (10 GB by default, with least-recently-used eviction); avoid caching large, rarely reused data.

## Docker Build Caching

Use the GitHub Actions cache backend for BuildKit instead of copying local cache directories:

```yaml
- uses: docker/setup-buildx-action@v3
- uses: docker/login-action@v3
  with:
    registry: ghcr.io
    username: ${{ github.actor }}
    password: ${{ secrets.GITHUB_TOKEN }}
- uses: docker/build-push-action@v6
  with:
    context: .
    push: ${{ github.ref == 'refs/heads/main' }}
    tags: ghcr.io/${{ github.repository }}:${{ github.sha }}
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

Alternatively `type=registry,ref=ghcr.io/org/app:buildcache` shares cache across repositories and runners. Order Dockerfile instructions so dependency installation layers come before copying source code.

## Parallelism

### Independent jobs run in parallel by default

Only add `needs:` where there is a real dependency. A `lint → test → build` chain triples wall-clock time when the jobs are independent.

### Matrix builds

```yaml
test:
  runs-on: ${{ matrix.os }}
  strategy:
    fail-fast: false
    max-parallel: 6
    matrix:
      os: [ubuntu-latest]
      node: [20, 22, 24]
      include:
        - os: windows-latest
          node: 22
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with: { node-version: '${{ matrix.node }}', cache: npm }
    - run: npm ci
    - run: npm test
```

Test only supported runtime versions (drop end-of-life versions such as Node 16 and 18). Use `include` for a few extra combinations instead of a full OS × version cross product.

### Dynamic fan-out

```yaml
jobs:
  plan:
    runs-on: ubuntu-latest
    outputs:
      packages: ${{ steps.list.outputs.packages }}
    steps:
      - uses: actions/checkout@v4
      - id: list
        run: echo "packages=$(ls packages | jq -R -s -c 'split("\n")[:-1]')" >> "$GITHUB_OUTPUT"

  test:
    needs: plan
    if: needs.plan.outputs.packages != '[]'
    runs-on: ubuntu-latest
    strategy:
      matrix:
        package: ${{ fromJSON(needs.plan.outputs.packages) }}
    steps:
      - uses: actions/checkout@v4
      - run: npm test --workspace packages/${{ matrix.package }}

  report:
    needs: test
    if: always()
    runs-on: ubuntu-latest
    steps:
      - run: echo "test result: ${{ needs.test.result }}"
```

A matrix is limited to 256 jobs per workflow run. Write outputs with `$GITHUB_OUTPUT`; the legacy workflow command for setting outputs has been removed from supported runners.

### Test sharding

Split slow suites across matrix jobs with the test runner's shard support (`playwright test --shard=${{ matrix.shard }}/4`, `jest --shard`, `pytest-split`), then merge reports in a final job.

## Avoid Redundant Work

- Build once, test the artifact: upload build outputs with `actions/upload-artifact@v4` and download them in later jobs instead of rebuilding.
- Shallow checkout is the default (`fetch-depth: 1`); only fetch full history when tools need it (versioning, changelogs).
- Skip expensive jobs for draft PRs: `if: github.event.pull_request.draft == false`.
- Use `timeout-minutes` on jobs (default is 360) so hung jobs do not burn minutes.

## Runner Sizing and Types

| Option | When |
|--------|------|
| Standard GitHub-hosted runners | Default for most jobs |
| Larger runners (more vCPU/RAM, GPU, static IPs) | CPU-bound builds/tests where more cores cut wall-clock time; configured as named runner groups/labels in the organization |
| arm64 runners | Native ARM builds, often cheaper per minute |
| Self-hosted runners (Actions Runner Controller on Kubernetes) | Special hardware, private network access, high volume |

Self-hosted runners: use ephemeral runners (one job per runner) for isolation, never attach them to public repositories, and keep runner software updated.

## Reliability Optimizations

- Pin third-party actions to a full commit SHA (with a version comment) and update via Dependabot.
- Set minimal `permissions:` at workflow level (`contents: read`) and elevate per job.
- Retry only known-flaky network operations; fix flaky tests instead of blanket retries.
- Cache invalidation issues: include tool versions in cache keys.

## Checklist

- [ ] Path filters with a required-check strategy that cannot deadlock
- [ ] Concurrency cancels superseded PR runs, not deployments
- [ ] Setup-action caching or correct manual cache keys; no `node_modules` caching with `npm ci`
- [ ] BuildKit cache via `type=gha` or registry
- [ ] Only true dependencies in `needs`; matrices for supported versions only
- [ ] Build once, reuse artifacts; job timeouts set
- [ ] Runner type matched to workload; self-hosted runners ephemeral
- [ ] Actions pinned by SHA; minimal permissions
