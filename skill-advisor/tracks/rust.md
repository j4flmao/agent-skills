# Rust Developer

**Who this is for:** You write services, tools, desktop apps or embedded code in Rust.

[← Advisor home](../README.md) · [Build a custom bundle](../custom-bundles.md) · [Recipes](../recipes.md)

## Security baseline (2 skills, installed with every level)

These skills make the agent apply this domain's security practices by default. They are included in every install command below; the repository-wide baseline is in [`.claude/rules/secure-by-default.md`](../../.claude/rules/secure-by-default.md).

| Skill | Path | What it covers |
|-------|------|----------------|
| [`security-sbom`](../../skills/security/sbom/SKILL.md) | `security/sbom` | Design an SBOM generation pipeline with format selection, vulnerability correlation, license compliance, and policy enforcement for software… |
| [`security-api-security`](../../skills/security/api-security/SKILL.md) | `security/api-security` | Design comprehensive API security controls covering OWASP API Top 10 threat modeling, authentication (JWT, OAuth2, API keys), rate limiting (token… |

## Level 1 — Essentials (3 skills)

Install these first. They cover the everyday work of this role and rarely conflict.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`lang-rust`](../../skills/languages/rust/SKILL.md) | `languages/rust` | Rust guarantees memory safety and freedom from data races in safe code through ownership and borrowing, with performance comparable to C/C++. |
| [`rust-architecture`](../../skills/backend/rust/architecture/SKILL.md) | `backend/rust/architecture` | Structure Rust backend applications with workspace layout, type-driven design, error handling architecture, async runtime patterns, and… |
| [`rust-patterns`](../../skills/backend/rust/patterns/SKILL.md) | `backend/rust/patterns` | Implement Rust-specific patterns — async/await with tokio, error handling with thiserror/anyhow, serde for JSON, ownership patterns, concurrency… |

## Level 2 — Professional (5 skills)

Add when the project grows: production concerns, scaling and team workflows.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`backend-api-design`](../../skills/backend/universal/api-design/SKILL.md) | `backend/universal/api-design` | Design consistent, production-grade REST or GraphQL APIs. |
| [`backend-concurrency-mechanics`](../../skills/backend/universal/concurrency/SKILL.md) | `backend/universal/concurrency` | Pick the right concurrency model for a workload and write shared-state code that is correct under the language's memory model. |
| [`backend-grpc-patterns`](../../skills/backend/universal/grpc-patterns/SKILL.md) | `backend/universal/grpc-patterns` | Design consistent, production-grade gRPC services. |
| [`desktop-tauri`](../../skills/desktop/tauri/SKILL.md) | `desktop/tauri` | Tauri builds desktop (Windows, macOS, Linux) and mobile (iOS, Android) apps from a web frontend rendered in the OS webview (WebView2, WKWebView,… |
| [`quality-property-based-testing`](../../skills/quality/property-based-testing/SKILL.md) | `quality/property-based-testing` | Use property-based testing to define invariants and properties, generate random inputs, shrink failing cases, and discover edge cases that… |

## Level 3 — Specialist (3 skills)

Add one at a time, only for the problem in front of you. These are deep and narrow.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`bare-metal-rust`](../../skills/embedded-systems/bare-metal-rust/SKILL.md) | `embedded-systems/bare-metal-rust` | Rust removes whole classes of firmware bugs (buffer overruns, use-after-free, data races between ISR and main) at compile time while compiling to… |
| [`ebpf-engineering`](../../skills/low-level/ebpf-engineering/SKILL.md) | `low-level/ebpf-engineering` | eBPF runs verified, sandboxed programs inside the Linux kernel at kernel events (function entry, tracepoints, packets, syscalls, LSM hooks)… |
| [`lock-free-ring-buffers`](../../skills/niche/hft/lock-free-ring-buffers/SKILL.md) | `niche/hft/lock-free-ring-buffers` | Explain lock-free inter-thread communication for low-jitter systems: ring-buffer (LMAX Disruptor) design, sequence/claim coordination, and… |

## Install

Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.

**Level 1 + security baseline (5 skills):**

```bash
npx skills add j4flmao/agent-skills --skill lang-rust --skill rust-architecture --skill rust-patterns --skill security-sbom --skill security-api-security
```

**Level 1 + 2 + security baseline (10 skills):**

```bash
npx skills add j4flmao/agent-skills --skill lang-rust --skill rust-architecture --skill rust-patterns --skill backend-api-design --skill backend-concurrency-mechanics --skill backend-grpc-patterns --skill desktop-tauri --skill quality-property-based-testing --skill security-sbom --skill security-api-security
```

Level 3: add single skills with `--skill <name>` when you need them.

## Ready-made bundles

Bundles are installed with the same command; each one's full command is on the [bundles page](../bundles.md).

| Bundle | Skills | Description |
|--------|--------|-------------|
| [`fullstack-rust-angular`](../bundles.md#fullstack-rust-angular) | 217 | Full stack: Rust backend + Angular frontend |
| [`systems-programming`](../bundles.md#systems-programming) | 17 | Systems programming: C/C++/Rust/assembly, compilers, kernels, eBPF, networking, lock-free and kernel-bypass |

## Combine with

- [Systems & Embedded Engineer](systems.md)
- [Backend Engineer](backend.md)

## Watch out

Pick the Level 3 skill that matches your target (embedded, eBPF, or low-latency) instead of installing all three.
