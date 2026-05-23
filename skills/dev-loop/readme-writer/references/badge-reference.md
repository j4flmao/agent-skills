# Badge Reference

## Badge Format

All badges use the Shields.io service:

```markdown
![Label](https://img.shields.io/badge/Label-Message-Color.svg?style=flat-square)
```

Parameters:
- `Label` — Left text (URL encoded)
- `Message` — Right text (URL encoded)
- `Color` — Hex color or named color (`brightgreen`, `green`, `yellow`, `orange`, `red`, `blue`, `lightgrey`)
- `?style=` — `flat`, `flat-square`, `plastic`, `for-the-badge`, `social`

## CI/CD Badges

### GitHub Actions

```markdown
![CI](https://img.shields.io/github/actions/workflow/status/org/project/ci.yml?branch=main&style=flat-square)
![Test](https://img.shields.io/github/actions/workflow/status/org/project/test.yml?branch=main&label=tests&style=flat-square)
![Lint](https://img.shields.io/github/actions/workflow/status/org/project/lint.yml?branch=main&label=lint&style=flat-square)
```

### CircleCI

```markdown
![CircleCI](https://img.shields.io/circleci/build/gh/org/project/main?style=flat-square)
```

### GitLab CI

```markdown
![GitLab CI](https://img.shields.io/gitlab/pipeline-status/org/project?style=flat-square)
```

## Coverage Badges

### Codecov

```markdown
![Coverage](https://img.shields.io/codecov/c/github/org/project?style=flat-square)
```

### Coveralls

```markdown
![Coverage](https://img.shields.io/coveralls/github/org/project?style=flat-square)
```

### SonarQube

```markdown
![Coverage](https://img.shields.io/sonar/coverage/org_project?server=https%3A%2F%2Fsonarcloud.io&style=flat-square)
![Quality Gate](https://img.shields.io/sonar/quality_gate/org_project?server=https%3A%2F%2Fsonarcloud.io&style=flat-square)
```

## Version Badges

### Package Version

```markdown
![npm](https://img.shields.io/npm/v/package-name?style=flat-square)
![npm (tag)](https://img.shields.io/npm/v/package-name/latest?style=flat-square)
![crates.io](https://img.shields.io/crates/v/crate-name?style=flat-square)
![PyPI](https://img.shields.io/pypi/v/package-name?style=flat-square)
![Go Version](https://img.shields.io/github/v/tag/org/project?style=flat-square)
![Maven Central](https://img.shields.io/maven-central/v/org.example/artifact?style=flat-square)
![NuGet](https://img.shields.io/nuget/v/package?style=flat-square)
```

### Dependencies

```markdown
![Dependencies](https://img.shields.io/librariesio/github/org/project?style=flat-square)
![npm dependencies](https://img.shields.io/librariesio/release/npm/package-name?style=flat-square)
```

## Language & Runtime

```markdown
![Node](https://img.shields.io/badge/Node.js-22.x-339933?style=flat-square&logo=node.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript)
![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=flat-square&logo=python)
![Go](https://img.shields.io/badge/Go-1.22-00ADD8?style=flat-square&logo=go)
![Rust](https://img.shields.io/badge/Rust-1.78-000000?style=flat-square&logo=rust)
![Java](https://img.shields.io/badge/Java-21-007396?style=flat-square&logo=java)
![.NET](https://img.shields.io/badge/.NET-9.0-512BD4?style=flat-square&logo=dotnet)
```

## Framework Badges

```markdown
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)
![Next.js](https://img.shields.io/badge/Next.js-15-000000?style=flat-square&logo=next.js)
![Vue.js](https://img.shields.io/badge/Vue.js-3-4FC08D?style=flat-square&logo=vue.js)
![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?style=flat-square&logo=nestjs)
![Express](https://img.shields.io/badge/Express-4-000000?style=flat-square&logo=express)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-3-6DB33F?style=flat-square&logo=spring)
![Django](https://img.shields.io/badge/Django-5-092E20?style=flat-square&logo=django)
![Rails](https://img.shields.io/badge/Rails-8-CC0000?style=flat-square&logo=rubyonrails)
![ASP.NET](https://img.shields.io/badge/ASP.NET_Core-9-512BD4?style=flat-square&logo=dotnet)
![Svelte](https://img.shields.io/badge/Svelte-5-FF3E00?style=flat-square&logo=svelte)
```

## Database Badges

```markdown
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql)
![MySQL](https://img.shields.io/badge/MySQL-8-4479A1?style=flat-square&logo=mysql)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=flat-square&logo=redis)
![MongoDB](https://img.shields.io/badge/MongoDB-7-47A248?style=flat-square&logo=mongodb)
![SQLite](https://img.shields.io/badge/SQLite-3-003B57?style=flat-square&logo=sqlite)
![Elasticsearch](https://img.shields.io/badge/Elasticsearch-8-005571?style=flat-square&logo=elasticsearch)
```

## Infrastructure Badges

```markdown
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker)
![Kubernetes](https://img.shields.io/badge/Kubernetes-326CE5?style=flat-square&logo=kubernetes)
![AWS](https://img.shields.io/badge/AWS-FF9900?style=flat-square&logo=amazonaws)
![GCP](https://img.shields.io/badge/GCP-4285F4?style=flat-square&logo=googlecloud)
![Azure](https://img.shields.io/badge/Azure-0078D4?style=flat-square&logo=microsoftazure)
![Terraform](https://img.shields.io/badge/Terraform-7B42BC?style=flat-square&logo=terraform)
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=flat-square&logo=githubactions)
```

## Quality Badges

```markdown
![Code Style](https://img.shields.io/badge/code_style-Prettier-FF69B4?style=flat-square)
![Linting](https://img.shields.io/badge/linting-ESLint-4B32C3?style=flat-square)
![Commit Style](https://img.shields.io/badge/commits-Conventional-FE5196?style=flat-square)
![Semantic Release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079?style=flat-square)
![Renovate](https://img.shields.io/badge/Renovate-enabled-1A1F6C?style=flat-square&logo=renovate)
![Dependabot](https://img.shields.io/badge/Dependabot-enabled-025E8C?style=flat-square&logo=dependabot)
```

## Community & Social

```markdown
![GitHub stars](https://img.shields.io/github/stars/org/project?style=flat-square)
![GitHub forks](https://img.shields.io/github/forks/org/project?style=flat-square)
![GitHub contributors](https://img.shields.io/github/contributors/org/project?style=flat-square)
![GitHub last commit](https://img.shields.io/github/last-commit/org/project?style=flat-square)
![GitHub issues](https://img.shields.io/github/issues/org/project?style=flat-square)
![GitHub PRs](https://img.shields.io/github/issues-pr/org/project?style=flat-square)
![Twitter](https://img.shields.io/twitter/follow/org?style=flat-square)
![Discord](https://img.shields.io/discord/server-id?style=flat-square)
```

## License Badges

```markdown
![MIT](https://img.shields.io/badge/license-MIT-green?style=flat-square)
![Apache 2.0](https://img.shields.io/badge/license-Apache_2.0-blue?style=flat-square)
![GPL v3](https://img.shields.io/badge/license-GPL_v3-red?style=flat-square)
![BSD 3-Clause](https://img.shields.io/badge/license-BSD_3--Clause-orange?style=flat-square)
```

## Custom Badges

```markdown
<!-- Status badges -->
![Status](https://img.shields.io/badge/status-active-success?style=flat-square)
![Status](https://img.shields.io/badge/status-deprecated-red?style=flat-square)
![Status](https://img.shields.io/badge/status-archived-lightgrey?style=flat-square)

<!-- Feature badges -->
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square)
![Documentation](https://img.shields.io/badge/docs-passing-success?style=flat-square)
![Made with Love](https://img.shields.io/badge/made_with-❤️-red?style=flat-square)
```

## Dynamic Badges

### Live Metrics (shields.io endpoints)

```markdown
![Website](https://img.shields.io/website?url=https%3A%2F%2Fexample.com&style=flat-square)
![Uptime](https://img.shields.io/uptimerobot/ratio/m123456?style=flat-square)
![GitHub download count](https://img.shields.io/github/downloads/org/project/total?style=flat-square)
```

## Badge Organization Best Practices

### Simple Header

```markdown
# Project Name
[![CI](https://img.shields.io/github/actions/workflow/status/org/project/ci.yml)]()
[![npm](https://img.shields.io/npm/v/package-name)]()
[![License](https://img.shields.io/github/license/org/project)]()
```

### Grouped by Purpose

```markdown
<p align="center">
  <!-- CI -->
  <img src="https://img.shields.io/github/actions/workflow/status/org/project/ci.yml?label=CI&style=flat-square">
  <img src="https://img.shields.io/codecov/c/github/org/project?style=flat-square">
  <br>
  <!-- Package -->
  <img src="https://img.shields.io/npm/v/package-name?style=flat-square">
  <img src="https://img.shields.io/npm/dm/package-name?style=flat-square">
  <img src="https://img.shields.io/npm/l/package-name?style=flat-square">
</p>
```

## Badge Tips

- **Use `style=flat-square`** for modern, compact badges
- **Group related badges** on the same line
- **Limit to 5-8 badges** at the top — too many is noisy
- **Use dynamic badges** sparingly — they add load time
- **Replace with service logo-colored badges** for cleaner look
- **Document badge meaning** if non-standard badges are used
- **Keep URLs HTTPS** — shields.io redirects HTTP anyway
- **Consider dark mode** — some badges look poor on dark backgrounds
