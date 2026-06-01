# README Writer Advanced

## Overview
Advanced README writing covers component documentation systems, README generation from code, multi-language READMEs, SEO optimization, and maintaining documentation as code.

## Advanced Concepts

### Concept 1: Component-Level Documentation
Library/framework projects with many exports: storybook (React/Vue), docz (React), TypeDoc/API Extractor (TypeScript), rustdoc (Rust), DocFX (.NET). Auto-generate README examples from stories/doctests. Keep README as entry point, link to detailed docs per component.

### Concept 2: README Generation from Code
README.md generated from code comments + source analysis: typedoc-plugin-markdown for TypeScript, docco for JS, rustdoc for Rust. CI pipeline reads source → generates README → validates no manual edits. Badges auto-updated (version, CI status, coverage).

### Concept 3: Multi-Language READMEs
README localized for international audiences: README.zh-CN.md, README.ja.md, README.ko.md. Use language selector badge at the top. Maintain English as canonical. CI check: translation is not stale (compared to English README). Crowdin or similar for collaborative translation.

### Concept 4: README SEO
Search engine optimization: keyword-rich first paragraph (project name + what it does + key features), descriptive title (h1), schema.org SoftwareApplication structured data, code snippets in search results, and include relevant links. Primary search result is the GitHub/git hosting README.

### Concept 5: Docs-as-Code
README is code: versioned, reviewed (PRs), tested (CI runs examples), linted (markdownlint, spellcheck), and deployed (documentation site generation from README). Vale or write-good for style consistency. Keep README and code in sync (same repo, same branch).

## Advanced Techniques

### Auto-Generated README
```typescript
// This README is auto-generated. Do not edit manually.
// Source: typedoc-plugin-markdown + custom generator
// Run: npm run docs
```
```markdown
## API
<!-- API_DOCS:START -->
<!-- Auto-generated content here -->
<!-- API_DOCS:END -->
```

### Multi-Language README Badge
```markdown
[![en](https://img.shields.io/badge/lang-en-blue.svg)](README.md)
[![zh-cn](https://img.shields.io/badge/lang-zh--cn-red.svg)](README.zh-CN.md)
[![ja](https://img.shields.io/badge/lang-ja-green.svg)](README.ja.md)
```

## Anti-Patterns

- README diverged from code (no generation, stale examples)
- English-first but no translations for popular projects
- No SEO in README (project undiscoverable)
- README badges broken (dead links to CI, coverage)
- Component docs only in README (too long, no structure)
- Manual README edits that get overwritten by generator
- Translation CI not running (staleness not detected)
- README lint failing (broken links, bad formatting)
