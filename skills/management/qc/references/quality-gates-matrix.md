# Quality Gates per Language

## TypeScript / JavaScript
| Gate | Threshold | Tool | Config |
|------|-----------|------|--------|
| Coverage (overall) | >= 80% | Jest / Vitest | `coverageThreshold.global.branches: 80` |
| Coverage (new code) | >= 90% | SonarQube | New code coverage gate |
| Complexity | <= 10/function | ESLint | `complexity: ["error", 10]` |
| Lines/function | <= 50 | ESLint | `max-lines-per-function: ["warn", 50]` |
| Duplication | < 3% | SonarQube | Duplication gate |
| Lint errors | 0 | ESLint | All errors must be fixed |
| Dependency vulns | 0 critical | `npm audit` | `--audit-level=high` |

## Python
| Gate | Threshold | Tool | Config |
|------|-----------|------|--------|
| Coverage | >= 80% | pytest-cov | `--cov-fail-under=80` |
| Complexity | <= 10 | Ruff (C90) | `mccabe.max-complexity = 10` |
| Lines/function | <= 50 | Ruff | `pylint.max-args = 5` |
| Lint errors | 0 | Ruff | Select E, F, I, N, W |
| Type errors | 0 | mypy | `--strict` |
| Duplication | < 3% | SonarQube / pylint | `duplicate-code` |

## Go
| Gate | Threshold | Tool | Config |
|------|-----------|------|--------|
| Coverage | >= 80% | `go test -cover` | `-coverprofile` |
| Complexity | <= 10 | golangci-lint (cyclop) | `cyclop.max-complexity: 10` |
| Lint errors | 0 | golangci-lint | Enable errcheck, gosimple, govet |
| Duplication | < 3% | golangci-lint (dupl) | `dupl.threshold: 50` |
| Vulnerability | 0 | govulncheck | Run in CI |

## Rust
| Gate | Threshold | Tool |
|------|-----------|------|
| Coverage | >= 80% | cargo-tarpaulin |
| Lint errors | 0 | clippy |
| Unsafe code | 0 (preferred) | clippy (unsafe_allow) |
| Duplication | < 3% | cargo-insta / manual |
| Dependency vulns | 0 | cargo-audit |
| Complexity | <= 10 | clippy (cognitive_complexity) |
