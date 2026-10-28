# Dependency Management APIs: GitHub Dependency Graph, Dependabot, OSV and deps.dev

APIs used to automate dependency inventory, vulnerability triage and reporting across many repositories. Covers GitHub REST endpoints (dependency graph SBOM export, dependency submission, Dependabot alerts and secrets), the OSV vulnerability API, and Google's deps.dev API. Configuration files for Dependabot/Renovate are in `dependabot-setup.md` and `renovate-config.md`.

## Authentication

| API | Auth |
|-----|------|
| GitHub REST | Fine-grained PAT or GitHub App installation token; `Authorization: Bearer <token>`, header `X-GitHub-Api-Version: 2022-11-28` |
| OSV (`api.osv.dev`) | None |
| deps.dev (`api.deps.dev`) | None |

Use a GitHub App for org-wide automation: higher rate limits, scoped permissions, no personal account dependency.

## GitHub: Export SBOM (Dependency Graph)

```bash
gh api -H "Accept: application/vnd.github+json" \
  /repos/OWNER/REPO/dependency-graph/sbom > sbom.json      # SPDX 2.3 JSON
```

Permission: repository "Contents: read". The dependency graph must be enabled (default for public repos).

## GitHub: Dependency Submission API

Submit dependencies resolved at build time (e.g. Gradle, Maven, Bazel) that static manifest parsing misses, so they receive Dependabot alerts.

```bash
gh api -X POST /repos/OWNER/REPO/dependency-graph/snapshots --input snapshot.json
```

```json
{
  "version": 0,
  "sha": "<commit sha>",
  "ref": "refs/heads/main",
  "job": { "correlator": "build-gradle", "id": "run-1234" },
  "detector": { "name": "custom-detector", "version": "1.0.0", "url": "https://example.com" },
  "scanned": "2026-10-27T10:00:00Z",
  "manifests": {
    "build.gradle": {
      "name": "build.gradle",
      "file": { "source_location": "build.gradle" },
      "resolved": {
        "com.fasterxml.jackson.core:jackson-databind": {
          "package_url": "pkg:maven/com.fasterxml.jackson.core/jackson-databind@2.17.2",
          "relationship": "direct",
          "scope": "runtime"
        }
      }
    }
  }
}
```

Prebuilt actions exist (e.g. `gradle/actions/dependency-submission`, `advanced-security/maven-dependency-submission-action`). Dependencies use Package URLs (purl).

## GitHub: Dependabot Alerts

| Endpoint | Purpose |
|----------|---------|
| `GET /repos/{owner}/{repo}/dependabot/alerts` | List repo alerts |
| `GET /orgs/{org}/dependabot/alerts` | Org-wide alerts |
| `GET /enterprises/{enterprise}/dependabot/alerts` | Enterprise-wide |
| `PATCH /repos/{owner}/{repo}/dependabot/alerts/{alert_number}` | Dismiss / reopen |

Useful query parameters: `state=open|dismissed|fixed|auto_dismissed`, `severity=critical,high`, `ecosystem=npm`, `scope=runtime|development`, `per_page=100` with cursor pagination (`after`).

```bash
gh api --paginate "/orgs/ACME/dependabot/alerts?state=open&severity=critical,high&per_page=100" \
  --jq '.[] | [.repository.full_name, .dependency.package.name, .security_advisory.ghsa_id, .security_vulnerability.first_patched_version.identifier] | @tsv'
```

Dismiss with a reason (`fix_started`, `inaccurate`, `no_bandwidth`, `not_used`, `tolerable_risk`) and a comment:

```bash
gh api -X PATCH /repos/ACME/api/dependabot/alerts/42 \
  -f state=dismissed -f dismissed_reason=not_used \
  -f dismissed_comment="Package only used in a dev script; not shipped"
```

Prefer Dependabot **auto-triage rules** (repository/org settings) for policy-based dismissal over scripted dismissals.

## GitHub: Dependabot Secrets and Security Settings

- `PUT /repos/{owner}/{repo}/dependabot/secrets/{secret_name}`: Dependabot runs cannot read Actions secrets; private registry tokens must be Dependabot secrets (value encrypted with the repo public key from `GET .../dependabot/secrets/public-key`).
- `PUT /repos/{owner}/{repo}/vulnerability-alerts` enables alerts; `PUT /repos/{owner}/{repo}/automated-security-fixes` enables security update PRs.

## GitHub: Dependency Review API

```bash
gh api /repos/OWNER/REPO/dependency-graph/compare/main...feature-branch
```

Returns added/removed dependencies with vulnerabilities and licenses between two refs; this powers `actions/dependency-review-action`.

## OSV API

Open-source vulnerability database aggregating GitHub Advisories, PyPA, RustSec, Go, OSS-Fuzz and others.

```bash
# query one package version
curl -s -X POST https://api.osv.dev/v1/query \
  -d '{"package": {"purl": "pkg:npm/lodash@4.17.20"}}'

# batch query (returns IDs only; fetch details per ID)
curl -s -X POST https://api.osv.dev/v1/querybatch \
  -d '{"queries": [{"package": {"purl": "pkg:pypi/jinja2@2.11.2"}}, {"commit": "<git sha>"}]}'

curl -s https://api.osv.dev/v1/vulns/GHSA-xxxx-xxxx-xxxx
```

CLI wrapper: `osv-scanner scan source -r .` (lockfile-aware, supports many ecosystems; guided remediation for npm and Maven).

## deps.dev API (v3)

Package metadata, dependency graphs, licenses, OpenSSF Scorecard data and advisories.

```bash
curl -s https://api.deps.dev/v3/systems/npm/packages/express
curl -s https://api.deps.dev/v3/systems/npm/packages/express/versions/4.21.2
curl -s https://api.deps.dev/v3/systems/npm/packages/express/versions/4.21.2:dependencies
curl -s https://api.deps.dev/v3/projects/github.com%2Fexpressjs%2Fexpress     # includes Scorecard
```

Path components (package names with `/` or `@`) must be URL-encoded.

## Rate Limits and Robustness

| API | Limit guidance |
|-----|----------------|
| GitHub REST | 5,000 requests/hour for users; GitHub Apps scale with installation size; watch `x-ratelimit-remaining`, honour `retry-after` on secondary limits |
| OSV / deps.dev | Public; use batch endpoints and cache results |

Clients should use timeouts, bounded retries with backoff on 429/5xx, and cursor pagination.

## Checklist

- [ ] GitHub App with least-privilege permissions for org automation
- [ ] Build-time resolved dependencies submitted via the submission API
- [ ] Alert queries paginated and filtered by severity/scope
- [ ] Dismissals carry reason and comment; auto-triage rules preferred
- [ ] OSV/deps.dev used for cross-ecosystem enrichment with caching
