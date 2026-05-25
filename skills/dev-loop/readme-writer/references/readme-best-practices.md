# README Best Practices

## Structure

### Essential Sections
```
1. Project Name + Badges
2. Description (what, why, who)
3. Quick Start (prerequisites, install, run)
4. Usage (basic examples, CLI, API)
5. Configuration (environment variables, options)
6. Architecture (high-level diagram, tech stack)
7. API Reference (endpoints, schemas)
8. Contributing (setup, guidelines, code of conduct)
9. Testing (how to run tests, coverage)
10. Deployment (build, CI/CD, environments)
11. License
```

### Badge Placement
```
[![CI](https://github.com/user/repo/workflows/CI/badge.svg)]
[![npm](https://img.shields.io/npm/v/package.svg)]
[![Coverage](https://codecov.io/gh/user/repo/badge.svg)]
[![License](https://img.shields.io/badge/license-MIT-blue.svg)]
```

## Writing Style

### Tone
- Professional but approachable
- Use active voice ("Run this command" not "This command should be run")
- Be concise — remove filler words
- Use consistent terminology

### Formatting
- Code blocks with language tags
- Tables for structured data
- Lists for steps and options
- Collapsible sections for optional detail
- Emoji sparingly, only for section headers

## README Types

| Type | Length | Audience |
|------|--------|----------|
| Minimal | 50-100 lines | Internal tools, experimental |
| Standard | 100-300 lines | Open source libraries |
| Comprehensive | 300-500 lines | Platforms, frameworks |
| Monorepo | Per-package + root | Multi-package repos |

## Maintenance

### Checklist
- [ ] Installation instructions verified on clean system
- [ ] Code examples tested and working
- [ ] Links checked for 404 errors
- [ ] Configuration options documented
- [ ] Troubleshooting section for common issues
- [ ] Contributing guide up to date
- [ ] Changelog/version history maintained

### Automation
- README generated from template on release
- Badges auto-update from CI
- API reference generated from OpenAPI spec
- Contributing guide linked to CONTRIBUTING.md
- License file separate from README

## Common Mistakes

- Outdated installation instructions
- Missing prerequisites
- No quick start section
- Unclear contribution process
- No link to full documentation
- Missing environment setup steps
- Assuming reader expertise level
