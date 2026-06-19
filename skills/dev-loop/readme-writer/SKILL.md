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

## Implementation Patterns

### README Generator

```python
from typing import Dict, List, Optional
import json
import subprocess
import re

class READMEGenerator:
    def __init__(self, project_path: str = "."):
        self.project_path = project_path
        self.package_info = self._detect_package()

    def _detect_package(self) -> Dict:
        info = {
            "name": "my-project",
            "version": "0.1.0",
            "description": "",
            "language": "unknown",
            "has_cli": False,
            "has_api": False,
            "has_web": False,
        }
        try:
            with open(f"{self.project_path}/package.json") as f:
                pkg = json.load(f)
                info["name"] = pkg.get("name", info["name"])
                info["version"] = pkg.get("version", info["version"])
                info["description"] = pkg.get("description", "TypeScript/JavaScript project")
                info["language"] = "JavaScript/TypeScript"
                if pkg.get("bin"):
                    info["has_cli"] = True
        except (FileNotFoundError, json.JSONDecodeError):
            pass
        try:
            with open(f"{self.project_path}/Cargo.toml") as f:
                content = f.read()
                name_match = re.search(r'name\s*=\s*"(.+)"', content)
                desc_match = re.search(r'description\s*=\s*"(.+)"', content)
                ver_match = re.search(r'version\s*=\s*"(.+)"', content)
                info["name"] = name_match.group(1) if name_match else info["name"]
                info["version"] = ver_match.group(1) if ver_match else info["version"]
                info["description"] = desc_match.group(1) if desc_match else "Rust project"
                info["language"] = "Rust"
        except FileNotFoundError:
            pass
        return info

    def detect_features(self) -> Dict[str, bool]:
        features = {
            "has_tests": self._file_exists("tests/") or self._file_exists("__tests__/"),
            "has_docs": self._file_exists("docs/"),
            "has_ci": self._file_exists(".github/workflows/"),
            "has_docker": self._file_exists("Dockerfile"),
            "has_cli": self.package_info["has_cli"],
            "has_api": self._file_exists("api/") or self._file_exists("routes/"),
            "has_frontend": self._file_exists("src/App") or self._file_exists("pages/"),
        }
        return features

    def _file_exists(self, path: str) -> bool:
        import os
        return os.path.exists(f"{self.project_path}/{path}")

    def generate_badges(self) -> str:
        name = self.package_info["name"]
        badges = [
            f"[![npm version](https://img.shields.io/npm/v/{name})](https://www.npmjs.com/package/{name})",
            f"[![CI](https://img.shields.io/github/actions/workflow/status/org/{name}/ci.yml)](https://github.com/org/{name}/actions)",
            f"[![License](https://img.shields.io/github/license/org/{name})](https://github.com/org/{name}/blob/main/LICENSE)",
        ]
        return " ".join(badges)

    def generate_full_readme(self, features: Dict) -> str:
        lines = [
            f"# {self.package_info['name'].replace('@', '').replace('/', '-')}",
            "",
            self.generate_badges(),
            "",
            self.package_info["description"] or f"A {self.package_info['language']} project.",
            "",
            "## Quick Start",
            "",
            "```bash",
        ]
        lang = self.package_info["language"]
        if lang == "JavaScript/TypeScript":
            lines.append("npm install")
            lines.append("npm run dev")
        elif lang == "Rust":
            lines.append("cargo build --release")
            lines.append("cargo run")
        else:
            lines.append("# install instructions")
        lines.extend([
            "```",
            "",
        ])
        if features["has_api"]:
            lines.extend([
                "## API",
                "",
                "### Endpoints",
                "",
                "| Method | Path | Description |",
                "|--------|------|-------------|",
                "| GET | /api/health | Health check |",
                "| GET | /api/v1/items | List items |",
                "| POST | /api/v1/items | Create item |",
                "",
            ])
        if features["has_cli"]:
            lines.extend([
                "## CLI Usage",
                "",
                "```bash",
                f"{self.package_info['name']} --help",
                f"{self.package_info['name']} init --project my-app",
                "```",
                "",
            ])
        lines.extend([
            "## Development",
            "",
            "```bash",
            "git clone https://github.com/org/" + self.package_info['name'] + ".git",
            "cd " + self.package_info['name'],
        ])
        if lang == "JavaScript/TypeScript":
            lines.append("npm install")
            lines.append("npm test")
        elif lang == "Rust":
            lines.append("cargo test")
        lines.extend([
            "```",
            "",
            "## Contributing",
            "",
            "Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.",
            "",
            "## License",
            "",
            "MIT © 2026",
            "",
        ])
        return "\n".join(lines)
```

### README Quality Checker

```python
import re
from typing import List, Dict

class READMEQualityChecker:
    def __init__(self):
        self.checks = []

    def check_readme(self, content: str, filepath: str = "README.md") -> List[Dict]:
        self.checks = []
        self._check_required_sections(content)
        self._check_badges(content)
        self._check_code_examples(content)
        self._check_installation(content)
        self._check_license(content)
        return self.checks

    def _add_issue(self, severity: str, message: str, category: str):
        self.checks.append({
            "severity": severity,
            "message": message,
            "category": category,
        })

    def _check_required_sections(self, content: str):
        required = {
            "Description": r"^#\s+",
            "Installation": r"(?i)##?\s*(install|setup|getting started)",
            "Usage": r"(?i)##?\s*(usage|example|quick start)",
            "License": r"(?i)##?\s*(license|licence)",
        }
        for section, pattern in required.items():
            if not re.search(pattern, content, re.MULTILINE):
                self._add_issue("error", f"Missing required section: {section}", "structure")

    def _check_badges(self, content: str):
        if not re.search(r"https://img\.shields\.io", content, re.IGNORECASE):
            self._add_issue("warning", "No badges found (CI, version, license)", "presentation")

    def _check_code_examples(self, content: str):
        code_blocks = re.findall(r"```", content)
        if len(code_blocks) < 2:
            self._add_issue("warning", "No code examples found in README", "usability")
        elif len(code_blocks) < 6:
            self._add_issue("info", "Consider adding more code examples", "usability")

    def _check_installation(self, content: str):
        if not re.search(r"(?i)(npm install|pip install|cargo install|go get|gem install)", content):
            self._add_issue("error", "No explicit install command found", "usability")

    def _check_license(self, content: str):
        if not re.search(r"(?i)(MIT|Apache|BSD|GPL|LICENSE)", content):
            self._add_issue("warning", "No license information found", "legal")
```

## Architecture Decision Trees

### README Structure by Audience

```
Who is the primary audience?
├── End users (library, CLI tool, app)
│   ├── One-liner description
│   ├── Quick start with real example
│   ├── Installation instructions
│   ├── Usage guide (with code examples)
│   ├── API reference or CLI flags
│   ├── FAQ / Troubleshooting
│   ├── Contributing (lower priority)
│   └── License
│
├── Developers (internal tool, platform)
│   ├── What it does (one paragraph)
│   ├── Architecture overview
│   ├── Setup for local development
│   ├── Configuration reference
│   ├── Running tests
│   ├── Deployment guide
│   ├── API documentation
│   └── Monitoring / observability
│
└── Both (open source project)
    ├── Top: User-focused content (install, quick start)
    ├── Middle: Feature documentation
    ├── Bottom: Developer-focused (contributing, testing)
    └── TOC for navigation
```

### Format Selection

```
What format fits the content?
├── Minimal (single section)
│   └── Tiny utility, single-purpose CLI
│
├── Standard (sections with TOC)
│   └── Most projects — library, tool, app
│
├── Detailed (with subsections)
│   └── Large project, monorepo, framework
│
└── Multi-file docs
    └── Very large project — separate docs/ directory
```

## Production Considerations

- **README freshness check in CI**: Add a CI check that warns if README hasn't been updated in N commits. Automatically flag when API endpoints change but README doesn't.
- **Embedded documentation testing**: Use tools like `doctest` or `mdx` to verify code examples in README are correct. Prevents stale or broken example code.
- **README template per project type**: Maintain standardized README templates for CLI tools, libraries, web apps, and internal services. Reduces decision fatigue and ensures consistency.
- **Multi-language README**: For projects used by international teams, maintain `README.zh-CN.md`, `README.ja.md` etc. Cross-reference at the top of the default README. Use automated translation with human review.

## Anti-Patterns

| Anti-Pattern | Why It Fails | Correct Approach |
|---|---|---|
| No quick start | User must read whole README to try | Code example as first code block |
| Too much internal detail | User-facing info is buried | User content top, dev content bottom |
| Outdated screenshots | UI changes, README stale | CI badge for screenshot freshness |
| No license | Nobody knows if they can use it | SPDX header + LICENSE file |
| No installation instructions | User can't figure out how to start | Explicit install command |
| Broken links | Frustrating user experience | Check links in CI |
| No contributing guide | No one knows how to contribute | CONTRIBUTING.md + PR template |
| README is the only docs | Too long, hard to navigate | README = front page, docs/ for details |
| Code examples not tested | Examples don't work | Test examples as part of CI |
| Assuming reader context | "Simply run it" — confusing | Complete commands, explicit paths |

## Performance Optimization

- **README generation from package metadata**: Use package.json, Cargo.toml etc. to auto-generate badges, install commands, and version info. Reduces manual maintenance.
- **Badge caching with shields.io**: Use shields.io's cache to serve badges. Static badges (license, version) rarely change. Dynamic badges (CI status, coverage) use short cache.
- **README link checking**: Use `awesome_bot` or `markdown-link-check` for automated link validation. Run weekly, not on every commit, to avoid CI time waste.
- **Render preview in PR**: Use tools like `grip` or `remark` to render README preview in CI PR comments. Catches formatting issues before merge.
