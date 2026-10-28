# Dependency Supply-Chain Security Guidelines

Third-party packages run with your application's privileges, and install scripts run with your developers' and CI's privileges. This reference covers defending against malicious packages, compromised maintainers, dependency confusion, typosquatting and tampered artefacts, plus provenance verification. Vulnerability scanning of known CVEs is covered in `vulnerability-scanning.md`.

## Threats

| Threat | Example pattern | Primary controls |
|--------|-----------------|------------------|
| Compromised maintainer account | Malicious patch release of a popular package | Release-age delay, lockfiles, provenance checks, install-script restrictions |
| Typosquatting | `reqeusts` instead of `requests` | Review new dependencies, allow-lists, registry proxy policies |
| Dependency confusion | Public package with the name of your internal package and a higher version | Scoped/namespaced internal packages, registry routing, proxy rules |
| Malicious install scripts | `postinstall` exfiltrating tokens | Disable/allow-list scripts, least-privilege CI tokens |
| Tampered artefact | Modified tarball on a mirror | Lockfile integrity hashes, signatures/provenance |
| Abandoned package taken over | Expired maintainer domain/email reused | Monitor maintainer changes, Scorecard, minimise deps |
| Compromised CI action | Mutable tag repointed | Pin actions by commit SHA |

## 1. Lockfiles and Integrity

- Lockfiles store integrity hashes (npm `integrity`, `uv.lock` hashes, `go.sum`, `Cargo.lock` checksums). Install in CI with frozen/locked modes so unexpected changes fail.
- Review lockfile diffs in PRs: new packages, changed `resolved` URLs (registry swap), removed integrity fields.
- Tools such as `lockfile-lint` check that npm/Yarn lockfiles only resolve from allowed hosts over HTTPS.

## 2. Install Scripts

- npm: `npm ci --ignore-scripts` where builds allow it; then explicitly run needed scripts.
- pnpm 10+: dependency lifecycle scripts are not run unless listed in `onlyBuiltDependencies` (or approved via `pnpm approve-builds`).
- Bun: only runs lifecycle scripts for packages in `trustedDependencies`.
- Python: prefer wheels; source distributions execute build backends on install.

## 3. Release-Age Delay

Adopting releases a few days after publication avoids many short-lived malicious versions, which are often detected and removed quickly.
- Renovate: `minimumReleaseAge: "3 days"`.
- Dependabot: `cooldown` settings.
- pnpm: `minimumReleaseAge` (minutes) in recent versions.
- Exclude security updates from the delay when the fix itself is urgent, and review those manually.

## 4. Dependency Confusion Defences

- Use scoped names for internal npm packages (`@acme/*`) and map the scope to the internal registry in `.npmrc`; reserve the scope on the public registry.
- Python: configure a single index (internal proxy) that resolves internal names first; avoid `--extra-index-url` with public PyPI, which merges candidates from both indexes. uv's default `index-strategy = "first-index"` mitigates this when indexes are ordered correctly.
- Maven/Gradle: restrict repositories per group (`exclusiveContent` / repository content filtering in Gradle).
- Go: `GOPRIVATE=github.com/acme/*` so private modules bypass the public proxy and checksum database.

## 5. Provenance and Signatures

| Ecosystem | Mechanism | Verify |
|-----------|-----------|--------|
| npm | Registry signatures and Sigstore-based provenance attestations (`npm publish --provenance`) | `npm audit signatures` |
| PyPI | Trusted Publishing (OIDC) and PEP 740 attestations | PyPI shows attestation; tooling support growing |
| Containers | Cosign signatures, SLSA provenance, SBOM attestations | `cosign verify --certificate-identity ... --certificate-oidc-issuer ...` |
| GitHub artefacts | Artifact attestations (`actions/attest-build-provenance`) | `gh attestation verify <file> --repo OWNER/REPO` |
| Go | Checksum database (`sum.golang.org`) | Automatic unless `GONOSUMDB`/`GOPRIVATE` |

Publish your own packages with provenance and trusted publishing (OIDC from CI) instead of long-lived registry tokens.

## 6. CI Hardening

- Pin third-party GitHub Actions to full commit SHAs with a version comment; let the update bot bump them.
- Default `permissions: contents: read` per workflow; grant write scopes per job only when needed.
- Do not expose secrets to workflows triggered by untrusted PRs (`pull_request_target` with checkout of PR code is dangerous).
- Run dependency installation in jobs that do not hold deployment credentials.
- Use OIDC federation to cloud providers instead of static keys.

## 7. Vetting New Dependencies

Before adding a package, check:
- Purpose cannot be met by the standard library or an existing dependency.
- Maintenance: recent releases, responsive issues, more than one maintainer.
- OpenSSF Scorecard (via deps.dev), known vulnerabilities (OSV).
- Install scripts, native binaries, network access at install time.
- License compatibility.
- Exact package name matches the intended project (typosquats).

Automate with `actions/dependency-review-action` (vulnerabilities, licenses, OpenSSF Scorecard display) and malicious-package feeds (OSV includes `MAL-` advisories from the OpenSSF malicious packages project).

## 8. Runtime Containment

- Least-privilege runtime: non-root containers, read-only root filesystem, minimal base images (distroless/Chainguard/Wolfi), egress restrictions.
- Secrets scoped per service; a compromised dependency in one service should not reach others' credentials.

## 9. Incident Response for a Compromised Package

1. Identify exposure: search lockfiles/SBOMs for the affected versions across repositories.
2. Block the versions at the registry proxy; pin to a known-good version.
3. Determine whether the malicious version was installed in CI or developer machines (install logs, cache contents).
4. Rotate credentials reachable from those environments (CI tokens, cloud keys, npm tokens).
5. Rebuild artefacts from clean caches; verify outputs.
6. Record the incident and add detection (e.g. alert on the package in future lockfiles).

## Checklist

- [ ] Frozen-lockfile installs; lockfile diffs reviewed
- [ ] Install scripts disabled or allow-listed
- [ ] Release-age delay for non-security updates
- [ ] Scoped/namespaced internal packages and correct registry routing
- [ ] `npm audit signatures` / cosign / attestation verification in CI where available
- [ ] Actions pinned by SHA; least-privilege workflow permissions
- [ ] Own packages published via trusted publishing with provenance
- [ ] Compromised-package runbook with credential rotation steps
