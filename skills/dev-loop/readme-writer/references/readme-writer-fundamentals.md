# README Writer Fundamentals

## Overview
A README is the entry point for any project — it explains what the project does, how to use it, and how to contribute. It's often the first thing users and contributors see.

## Core Concepts

### Concept 1: README Structure (Top-Down)
Standard sections: Project Name + Badge row → One-liner description → Quick Start (install + minimal example) → Documentation links → Contributing → License. Badges show build status, coverage, license, and version at a glance.

### Concept 2: Audience Awareness
Primary readers: other developers who need to understand, install, use, or contribute. Developers scan before reading. Put key information first (installation, usage). Move advanced topics (API details, architecture) to docs/ or wiki.

### Concept 3: Minimal Viable Example
A runnable code example that works immediately: package manager install, minimal code snippet that does something useful, expected output. The example must be tested (CI runs it). No example = users abandon immediately.

### Concept 4: Visual Communication
Screenshots for UI projects, GIFs for animations/interactions, code blocks for API usage, diagrams for architecture, asciinema for CLI demos. Visuals communicate faster than text. Alt text for accessibility.

### Concept 5: Maintenance
README goes stale quickly. Dependencies (version numbers), installation steps (API changes), contribution process (CI changes). Keep version badges current. Update as part of release process. CI check for stale README examples.

## Best Practices

- One-liner in the first paragraph
- Badges row below title
- Quick Start with copy-paste install + example
- Keep it concise (readers scan)
- Screenshots/GIFs for visual projects
- Link to deeper docs (not everything in README)
- Table of Contents for long READMEs
- Spell check and code example validation
- Update README as part of release process
- Contribution guidelines (CONTRIBUTING.md or link)

## Anti-Patterns

- No README (project is unwelcoming)
- Only installation, no usage example
- Outdated setup steps (doesn't work anymore)
- README as design doc (too long, too much)
- No screenshots for UI projects
- Missing prerequisites (assumes knowledge)
- No contribution guide (unknown process)
- All-caps YELLING in badges
- Vanity badges with no value
