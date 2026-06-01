# Monorepo CI/CD Optimization

## Affected Project Detection
nx affected:libs --target=test detects projects changed since base branch. turborepo run test --filter=[main] uses Git-based filtering. Lerna changed detects changed packages since last tag. Use for: only build/test affected projects. Integration with GitHub Actions events (pull_request, push). Store baseline in commit hash for reproducibility.

## Distributed Task Execution
nx-cloud: distribute tasks across multiple agents. turbo-remote-cache: share cache across CI runners. Remote caching: skip tasks already executed by other runners. Parallel execution within project boundaries. Task orchestration: topological sort for build order.

## Caching Strategy
Local cache: .nx/cache or .turbo/cache for developer machines. Remote cache: S3, GCS, or nx cloud for CI. Cache hit: skip task entirely, use previous output. Cache invalidation: input files, environment variables, dependencies. Test caching: only re-run if test files or dependencies changed.

## CI Pipeline Structure
Lint all projects (parallel) → Build affected (parallel) → Test affected (parallel) → Build artifacts. Codeowners: team-level ownership per project path. Merge queue: batching + validation before merge. Pipeline concurrency: limit to available CI runners. Status check: minimum required CI jobs per project.

## Versioning and Publishing
Semantic versioning per package: independent or fixed. Changesets: automated changelog generation, version bumps. Release workflow: manual trigger with version selection. Canary releases: dev/nightly builds with hash version. Package registry: publish only changed packages.

## Docker Build Optimization
Multi-project Docker context: use .dockerignore per project. Reuse layer cache from remote registry. Build only changed services with affected detection. Tag strategy: commit SHA, branch, semantic version. Base image optimization: shared base layer across services.

## References
- monorepo-fundamentals.md -- Fundamentals
- monorepo-tools.md -- Tools Overview
- nx-guide.md -- Nx Guide
- turborepo-guide.md -- Turborepo Guide
- dependency-management.md -- Dependency Management
