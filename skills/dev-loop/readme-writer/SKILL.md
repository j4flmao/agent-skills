---
name: dev-loop-readme-writer
description: >
  Use when the user asks about writing README files, project documentation, README structure, README best practices, or documentation for open source projects. Do NOT use for: changelogs (dev-loop-changelog-generator), or API documentation.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [dev-loop, readme, documentation]
---

# README Writer

## Purpose
Write clear, structured, and effective README files that help users and contributors understand, install, use, and contribute to a project. A great README is the single most important documentation page for any project.

## Agent Protocol

### Trigger
Exact user phrases: "write README", "create README", "README file", "README.md", "project documentation", "project README", "README template", "improve README".

### Input Context
- Project name and description
- Project type (CLI tool, library, web app, API server, desktop app, game)
- Language and framework (Node.js, Python, Rust, Go, .NET, etc.)
- Target audience (end users, developers, both)
- Installation method (npm, pip, cargo, Docker, Homebrew, manual)
- Build and test commands
- Configuration options and environment variables
- Contributing guidelines (if available)
- License type
- Badges (CI status, coverage, version, license)

### Output Artifact
README.md file following the project's conventions and audience needs.

### Completion Criteria
- [ ] Project name and one-line description at top
- [ ] Badges (CI status, version, license, coverage)
- [ ] Table of Contents (if README is long)
- [ ] Installation instructions (platform-specific if needed)
- [ ] Quick start / usage example
- [ ] API or command reference (or link to detailed docs)
- [ ] Configuration guide
- [ ] Development setup (how to build and test)
- [ ] Contributing guidelines (or link to CONTRIBUTING.md)
- [ ] License information
- [ ] Links to related resources (docs site, issue tracker, changelog)
- [ ] Screenshots or GIFs (if applicable)

### Max Response Length
150 lines.

## Framework/Methodology

### README Type Decision Tree
```
Who is the primary audience?
├── End users (library, CLI tool, app)
│   → Focus on: install → quickstart → usage → API/config
│   → Minimal build instructions, no internal architecture
├── Developers (framework, platform, SDK)
│   → Focus on: install → API reference → examples → integration
│   → Architecture overview, extensibility
├── Contributors (open source, internal tool)
│   → Focus on: setup → build → test → PR process → code style
│   → Architecture, design decisions, code of conduct
└── Both (most projects)
    → Split into: User documentation (top) + Contributor docs (bottom)
    → Clear section headers to jump between
```

### README Sections (Standard Order)
```
1. Project Name + Description (one-liner)
2. Badges
3. Table of Contents (if 2+ scrolls)
4. Features
5. Installation
6. Quick Start / Usage
7. Configuration
8. API Reference (or link to docs)
9. Architecture (optional, contrib-focused)
10. Development Setup
11. Testing
12. Contributing
13. License
14. Acknowledgments
```

## Workflow

### Step 1: Write the Header

```markdown
# Project Name

<!-- One-liner description -->
A lightweight, type-safe HTTP client for building API integrations
with automatic retry and timeout handling.

<!-- Badges -->
[![npm version](https://img.shields.io/npm/v/@myorg/api-client.svg)](https://www.npmjs.com/package/@myorg/api-client)
[![build](https://github.com/myorg/api-client/actions/workflows/ci.yml/badge.svg)](https://github.com/myorg/api-client/actions)
[![coverage](https://codecov.io/gh/myorg/api-client/branch/main/graph/badge.svg)](https://codecov.io/gh/myorg/api-client)
[![license](https://img.shields.io/github/license/myorg/api-client.svg)](https://github.com/myorg/api-client/blob/main/LICENSE)
[![npm downloads](https://img.shields.io/npm/dm/@myorg/api-client.svg)](https://www.npmjs.com/package/@myorg/api-client)
```

### Step 2: Features Section

```markdown
## Features

- 🚀 **Typed requests and responses** — Full TypeScript generics for end-to-end type safety
- 🔁 **Automatic retry** — Configurable retry policy with exponential backoff
- ⏱ **Timeout handling** — Per-request and global timeouts with cancellation
- 🔒 **Auth integration** — Bearer token, API key, OAuth2, and custom auth providers
- 📦 **Tiny bundle** — Tree-shakeable, ~3KB gzipped
- 🌐 **Isomorphic** — Works in Node.js, browsers, and React Native

## Screenshots

> ![Demo](https://raw.githubusercontent.com/myorg/api-client/main/docs/demo.gif)
> *API client in action with automatic retry and error handling*
```

### Step 3: Installation and Quick Start

```markdown
## Installation

```bash
# npm
npm install @myorg/api-client

# yarn
yarn add @myorg/api-client

# pnpm
pnpm add @myorg/api-client
```

## Quick Start

```typescript
import { createClient } from '@myorg/api-client';

const api = createClient({
  baseUrl: 'https://api.example.com',
  auth: {
    type: 'bearer',
    token: () => getAuthToken(),  // Dynamic token provider
  },
  retry: {
    maxRetries: 3,
    backoff: 'exponential',
  },
});

// Type-safe requests
const user = await api.get<User>('/users/42');
console.log(user.name); // Fully typed

const newUser = await api.post<User>('/users', {
  name: 'Alice',
  email: 'alice@example.com',
});
```
```

### Step 4: Configuration

```markdown
## Configuration

### Client Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `baseUrl` | `string` | (required) | Base URL for all requests |
| `auth` | `AuthConfig` | `null` | Authentication configuration |
| `timeout` | `number` | `30000` | Global timeout in milliseconds |
| `retry` | `RetryConfig` | `{ maxRetries: 3 }` | Retry policy |
| `headers` | `Record<string, string>` | `{}` | Default headers |

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `API_BASE_URL` | Yes | API server base URL |
| `API_TOKEN` | Yes | Authentication token |
| `API_TIMEOUT` | No | Request timeout (default: 30000) |
```

### Step 5: API Reference (Concise)

```markdown
## API Reference

### `createClient(options): ApiClient`

Creates a new API client instance.

### `client.get<T>(path, options?): Promise<T>`

Send a GET request.

- `path` — URL path (appended to baseUrl)
- `options.params` — Query parameters
- `options.headers` — Additional headers
- `options.timeout` — Per-request timeout (overrides global)
- `options.signal` — AbortSignal for cancellation

### `client.post<T>(path, body?, options?): Promise<T>`

Send a POST request. Same options as `get()`.

### `client.use(plugin: Plugin): void`

Register a middleware plugin.

See [full API documentation](https://docs.example.com/api-client) for details.
```

### Step 6: Development Setup

```markdown
## Development

### Prerequisites

- Node.js >= 18
- pnpm >= 8

### Setup

```bash
git clone https://github.com/myorg/api-client.git
cd api-client
pnpm install
pnpm build
```

### Scripts

| Command | Description |
|---------|-------------|
| `pnpm build` | Build the project |
| `pnpm test` | Run tests |
| `pnpm lint` | Lint source code |
| `pnpm typecheck` | Run TypeScript checks |
| `pnpm format` | Format code with Prettier |

### Project Structure

```
src/
  client.ts       # Main client implementation
  auth/           # Authentication providers
  retry/          # Retry policy implementations
  plugins/        # Middleware system
  types.ts        # TypeScript types
test/
  unit/           # Unit tests
  integration/    # Integration tests
docs/             # Documentation site content
```

### Publishing

```bash
# Create a new version (automates version bump + changelog + tag)
pnpm run release

# Or manually
pnpm version patch  # or minor/major
pnpm build
pnpm publish
git push --follow-tags
```
```

### Step 7: Contributing and License

```markdown
## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for:

- Code of conduct
- Development workflow
- Pull request process
- Coding standards

## License

[MIT](LICENSE) © 2026 My Organization
```

## Common Pitfalls

| Pitfall | Description | Prevention |
|---------|-------------|------------|
| No installation instructions | User can't figure out how to install | Always include explicit install commands |
| Outdated screenshots | UI changed but README didn't | CI check: README screenshots age check |
| Missing table of contents | Long README without navigation | Add TOC for READMEs longer than 2 scrolls |
| Too much internal detail | User doesn't care about architecture | Keep user content at top, dev content at bottom |
| No quick start | User must read full README to try | CLI example or code snippet as first code block |
| Assuming context | "Simply run the script" — which script? | Always show complete commands |
| No issue/PR links | User can't report bugs or contribute | Badge links to issues, contribute link |
| No license | Users can't tell if they can use it | SPDX identifier or link to LICENSE file |
| Broken badges | Dead links in header | Test badges periodically, use shields.io |
| No code examples | Text-heavy without concrete usage | Show 3-5 line code example in quick start |

## Best Practices

| Practice | Rationale |
|----------|-----------|
| Start with a one-liner description | User immediately knows what the project does |
| Use badges for at-a-glance status | CI, version, license, coverage in one row |
| Show a working example first | User can evaluate in 30 seconds |
| Keep it concise | Shorter READMEs are more likely to be read |
| Split user/contributor content | Users leave after install/usage; contributors read on |
| Use screenshots/GIF for visual projects | A picture is worth 1000 words of description |
| Keep code blocks tested | CI should verify code examples work |
| Use real examples | Don't use foo/bar, use realistic values |
| Link to detailed docs | README is the front door, not the whole house |
| Include platform-specific notes | Not everyone uses macOS or Linux |
| Pin Node.js/Python/etc. versions | Users need to know what's compatible |

## Templates & Tools

### Minimal README (CLI Tool)
```markdown
# mycli

A CLI tool for automating X.

## Install
```bash
npm install -g mycli
```

## Usage
```bash
mycli init --project my-app
mycli build --output ./dist
mycli deploy --env production
```

## License
MIT
```

### Library README Template
```markdown
# @myorg/libname

[Badges]

Type-safe library for doing Y.

## Install
`npm install @myorg/libname`

## Usage
```typescript
```

## API
<!-- Generated from TypeScript types -->

## License
MIT
```

## References
  - references/readme-writer-advanced.md — README Writer Advanced Topics
  - references/readme-writer-fundamentals.md — README Writer Fundamentals
  - references/readme-writer-templates.md — README Templates Reference
  - references/readme-writer-style-guide.md — README Style Guide Reference
## Handoff
Hand off to `dev-loop-changelog-generator` for changelog content. Hand off to `dev-loop-pr-writer` for PR descriptions.
