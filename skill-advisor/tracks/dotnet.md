# .NET Developer

**Who this is for:** You build services or apps with C# and .NET.

[← Advisor home](../README.md) · [Build a custom bundle](../custom-bundles.md) · [Recipes](../recipes.md)

## Security baseline (2 skills, installed with every level)

These skills make the agent apply this domain's security practices by default. They are included in every install command below; the repository-wide baseline is in [`.claude/rules/secure-by-default.md`](../../.claude/rules/secure-by-default.md).

| Skill | Path | What it covers |
|-------|------|----------------|
| [`security-api-security`](../../skills/security/api-security/SKILL.md) | `security/api-security` | Design comprehensive API security controls covering OWASP API Top 10 threat modeling, authentication (JWT, OAuth2, API keys), rate limiting (token… |
| [`security-secrets-management`](../../skills/security/secrets-management/SKILL.md) | `security/secrets-management` | Design a secrets management strategy covering detection (GitLeaks, truffleHog, ggshield), centralized storage (Vault, AWS Secrets Manager, GCP… |

## Level 1 — Essentials (4 skills)

Install these first. They cover the everyday work of this role and rarely conflict.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`lang-csharp`](../../skills/languages/csharp/SKILL.md) | `languages/csharp` | C# combines a managed runtime with value types, spans and a mature async model. |
| [`dotnet-architecture`](../../skills/backend/dotnet/architecture/SKILL.md) | `backend/dotnet/architecture` | Structure .NET applications with clean architecture, vertical slices, or CQRS — dependency inversion, MediatR pipelines, DI registration, and… |
| [`dotnet-patterns`](../../skills/backend/dotnet/patterns/SKILL.md) | `backend/dotnet/patterns` | Implement production-grade .NET patterns — MediatR pipeline behaviors, CQRS with separate models, Result pattern for explicit error handling, EF… |
| [`backend-api-design`](../../skills/backend/universal/api-design/SKILL.md) | `backend/universal/api-design` | Design consistent, production-grade REST or GraphQL APIs. |

## Level 2 — Professional (5 skills)

Add when the project grows: production concerns, scaling and team workflows.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`backend-database-patterns`](../../skills/backend/universal/database-patterns/SKILL.md) | `backend/universal/database-patterns` | Design efficient, maintainable database schemas and queries. |
| [`backend-auth-patterns`](../../skills/backend/universal/auth-patterns/SKILL.md) | `backend/universal/auth-patterns` | Implement authentication and authorization that is secure by default. |
| [`backend-background-jobs`](../../skills/backend/universal/background-jobs/SKILL.md) | `backend/universal/background-jobs` | Design reliable background job processing with queue topology, retry, concurrency, and monitoring. |
| [`quality-unit-testing`](../../skills/quality/unit-testing/SKILL.md) | `quality/unit-testing` | Write effective unit tests using FIRST principles, AAA pattern, test doubles, and TDD. |
| [`quality-integration-testing`](../../skills/quality/integration-testing/SKILL.md) | `quality/integration-testing` | Design and implement integration tests that verify components work together: API integration, database integration, external service mocking, and… |

## Level 3 — Specialist (3 skills)

Add one at a time, only for the problem in front of you. These are deep and narrow.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`desktop-wpf`](../../skills/desktop/wpf/SKILL.md) | `desktop/wpf` | Build Windows desktop applications using Windows Presentation Foundation (WPF) — .NET's XAML-based UI framework with powerful data binding,… |
| [`desktop-winforms`](../../skills/desktop/winforms/SKILL.md) | `desktop/winforms` | Build and maintain Windows desktop applications using Windows Forms — .NET's mature, rapid-application-development UI framework with… |
| [`mobile-dotnet-maui`](../../skills/mobile/dotnet-maui/SKILL.md) | `mobile/dotnet-maui` | Guide for building cross-platform mobile apps with .NET MAUI using MVVM, Shell navigation, and platform-specific customization. |

## Install

Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.

**Level 1 + security baseline (6 skills):**

```bash
npx skills add j4flmao/agent-skills --skill lang-csharp --skill dotnet-architecture --skill dotnet-patterns --skill backend-api-design --skill security-api-security --skill security-secrets-management
```

**Level 1 + 2 + security baseline (11 skills):**

```bash
npx skills add j4flmao/agent-skills --skill lang-csharp --skill dotnet-architecture --skill dotnet-patterns --skill backend-api-design --skill backend-database-patterns --skill backend-auth-patterns --skill backend-background-jobs --skill quality-unit-testing --skill quality-integration-testing --skill security-api-security --skill security-secrets-management
```

Level 3: add single skills with `--skill <name>` when you need them.

## Ready-made bundles

Bundles are installed with the same command; each one's full command is on the [bundles page](../bundles.md).

| Bundle | Skills | Description |
|--------|--------|-------------|
| [`fullstack-dotnet-react`](../bundles.md#fullstack-dotnet-react) | 218 | Full stack: C# .NET backend + React frontend |
| [`backend-stacks`](../bundles.md#backend-stacks) | 83 | Backend frameworks and runtimes: Node (Express/Fastify/Hono/Nest), Bun, Deno, Go, Rust, Python, Java/Kotlin, .NET, PHP, Ruby, Elixir, Swift, Scala |

## Combine with

- [Backend Engineer](backend.md)
- [Angular Developer](angular.md)
- [Desktop App Engineer](desktop.md)

## Watch out

MediatR and AutoMapper changed to commercial licenses in 2025; the dotnet skills note alternatives.
