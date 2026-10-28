# Rolling Out Dependency Upgrades Safely

Dependency upgrades are deployments: a new library version changes runtime behaviour as much as a code change. This reference covers how to ship upgrades (especially framework majors, runtime versions and transitive security fixes) with controlled risk: staging, canaries, feature flags around new behaviour, verification signals and rollback.

## Risk Classification

| Upgrade | Typical risk | Strategy |
|---------|--------------|----------|
| Patch/minor of dev tooling | Low | Auto-merge after CI |
| Patch/minor of runtime library | Low to medium | Auto-merge with good test coverage; normal deploy |
| Security fix in transitive dependency | Medium (forced timing) | Expedited PR, canary, fast rollback path |
| Major of a core framework (React, Spring Boot, Django) | High | Dedicated branch/PR series, staged rollout |
| Language runtime (Node, Python, JDK) | High | Parallel build, canary by instance pool |
| Base container image | Medium | Rebuild, scan, canary |
| Database driver / ORM | High | Shadow traffic or canary with query monitoring |

## Pre-Merge Verification

1. Read release notes and migration guides; note removed APIs and changed defaults.
2. Run the full suite including integration, contract and end-to-end tests.
3. Compare artefacts: bundle size, container image size, startup time.
4. For services, run a performance smoke test (latency, memory) against the previous version.
5. For libraries you publish, run downstream consumers' tests (or at least type checks) against the new version.

## Staged Rollout

```
merge -> deploy to dev -> staging (soak N hours with synthetic traffic)
      -> canary (1-5% of production traffic or one instance pool)
      -> compare canary vs baseline metrics
      -> progressive increase (25%, 50%, 100%)
```

- Progressive delivery tools (Argo Rollouts, Flagger, cloud-native deployment slots) can automate analysis: compare error rate, latency percentiles, saturation and business KPIs between canary and stable.
- Keep the canary window long enough to cover traffic patterns that matter (batch jobs, peak hours).

## Runtime and Framework Majors

- **Dual build**: build and test with both old and new versions in CI (matrix) before switching production.
- **Incremental adoption**: many frameworks allow gradual migration (React 19 codemods, Spring Boot properties migrator `spring-boot-properties-migrator`, Django deprecation warnings as errors in tests: `python -W error::DeprecationWarning`).
- **Instance-pool canary**: run part of the fleet on the new runtime (e.g. Node 24 vs 22) and compare.

## Feature Flags Around Behaviour Changes

When an upgrade changes behaviour you can toggle (new serializer, new HTTP client, changed default), put the new path behind a flag:

```ts
const client = flags.isEnabled('http-client-undici-v7', ctx)
  ? createUndiciClient()
  : createLegacyClient();
```

Roll out the flag per tenant or percentage, then remove the old path and flag after full rollout.

## Rollback

| Change type | Rollback |
|-------------|----------|
| Library bump in application | Redeploy previous artefact (fastest); revert the PR (lockfile included) |
| Container base image | Redeploy previous image digest |
| Runtime version | Previous image / instance pool |
| Database driver with schema impact | Only if no irreversible migration ran; plan migrations to be backward compatible |
| Published library | Publish a new patch reverting the change; never unpublish |

Rules:
- Keep previous artefacts (images by digest) available for quick redeploy.
- Revert the **lockfile** together with the manifest; reverting only `package.json` leaves the new version resolved.
- After rollback, pin or ignore the version in the update bot with a note so it is not re-proposed immediately.

## Emergency Security Upgrades

1. Identify affected services from the SBOM inventory (see `api_reference.md` for GitHub/OSV queries).
2. If the vulnerable package is transitive, apply an override/constraint (`overrides`, `resolutions`, uv `constraint-dependencies`, Gradle constraints) to force a fixed version.
3. Fast-track CI; deploy with canary but shortened windows.
4. Where an upgrade is not yet possible, apply compensating controls (WAF rule, disable the feature, network restriction) and record the exception with an expiry.
5. Remove overrides once direct dependencies release fixed versions.

## Observability Signals During Rollout

- Error rate and exception types (new exception classes are a strong signal).
- Latency p50/p95/p99, CPU, memory, GC pauses, connection pool metrics.
- Deprecation warnings in logs.
- Business metrics: checkout conversion, job success rate.
- Client-side: JS error rate, Core Web Vitals (INP, LCP, CLS) for frontend dependency changes.

## Coordinating Across Many Services

- Upgrade order: shared libraries first, then services; publish internal library versions compatible with both old and new framework when possible.
- Track the campaign (dashboard of services by version) and set deadlines tied to end-of-life dates.
- Renovate `dependencyDashboard` and org-level reports show progress.

## Checklist

- [ ] Upgrade risk classified; high-risk upgrades get canary and dedicated review
- [ ] Release notes reviewed; deprecations fixed before major bumps
- [ ] Canary compares metrics against baseline before full rollout
- [ ] Rollback = redeploy previous artefact; lockfile reverted with manifest
- [ ] Emergency path with overrides and compensating controls documented
- [ ] Overrides and pins removed after upstream fixes
