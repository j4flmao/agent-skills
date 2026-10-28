# Orchestrator Data Schemas

Schemas for the data the orchestrator reads and produces: skill frontmatter, routing-table rows, detected project state, the routing decision, and the handoff context. Use them to lint skills, build routing evals, and keep host configs consistent.

## 1. SKILL.md Frontmatter

```yaml
---
name: master-orchestrator            # kebab-case, unique within its category
description: >                       # when to use AND when not to use
  Use this skill when ...
  Do NOT use for: ...
version: "1.0.0"                     # semver string
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [orchestration, phase-0, entry-point]
---
```

JSON Schema used for linting:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "SkillFrontmatter",
  "type": "object",
  "required": ["name", "description"],
  "properties": {
    "name": { "type": "string", "pattern": "^[a-z0-9]+(-[a-z0-9]+)*$" },
    "description": { "type": "string", "minLength": 40 },
    "version": { "type": "string", "pattern": "^\\d+\\.\\d+\\.\\d+$" },
    "author": { "type": "string" },
    "license": { "type": "string" },
    "compatibility": {
      "type": "object",
      "additionalProperties": { "type": "boolean" }
    },
    "tags": { "type": "array", "items": { "type": "string" }, "uniqueItems": true }
  },
  "additionalProperties": true
}
```

## 2. Required SKILL.md Sections

| Section | Required | Content |
|---------|----------|---------|
| `# Title` | yes | Human name |
| `## Purpose` | yes | One paragraph scope |
| `## Agent Protocol` | yes | Trigger, input context, output artifact, response format, completion criteria |
| `## Rules` | yes | Non-negotiable constraints |
| `## References` | if `references/` exists | One line per reference file |
| `## Handoff` | yes | Artifact produced and next likely skill |

## 3. Routing Table Row

Text form in `routing.md`:

```text
idempotency/idempotent          → backend/universal/idempotency
```

Structured form for tooling:

```json
{
  "$id": "RouteRow",
  "type": "object",
  "required": ["triggers", "targets"],
  "properties": {
    "triggers": { "type": "array", "items": { "type": "string", "pattern": "^[a-z0-9.#+\\-]+$" }, "minItems": 1 },
    "targets": { "type": "array", "items": { "type": "string", "pattern": "^[a-z0-9\\-]+(/[a-z0-9\\-{}]+)*/?$" }, "minItems": 1 },
    "section": { "type": "string" }
  }
}
```

`targets` may contain `{stack}` / `{engine}` template variables resolved after stack detection, or several comma-separated skills when two skills share a topic.

## 4. Project State

```json
{
  "$id": "ProjectState",
  "type": "object",
  "required": ["root", "artifacts", "manifests"],
  "properties": {
    "root": { "type": "string" },
    "artifacts": {
      "type": "object",
      "properties": {
        "brief": { "type": "boolean" },
        "prd": { "type": "boolean" },
        "decisions": { "type": "boolean" },
        "specs": { "type": "boolean" }
      }
    },
    "manifests": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["path", "kind"],
        "properties": {
          "path": { "type": "string" },
          "kind": { "enum": ["package.json", "go.mod", "Cargo.toml", "pyproject.toml", "requirements.txt",
                             "pom.xml", "build.gradle", "build.gradle.kts", "pubspec.yaml", "csproj",
                             "Package.swift", "mix.exs", "Gemfile", "deno.json", "bun.lock"] },
          "dependencies": { "type": "array", "items": { "type": "string" } }
        }
      }
    },
    "workspace": { "enum": ["none", "pnpm", "npm", "yarn", "nx", "turbo", "go.work", "cargo"] }
  }
}
```

## 5. Routing Decision

```json
{
  "$id": "RoutingDecision",
  "type": "object",
  "required": ["template"],
  "oneOf": [
    {
      "properties": {
        "template": { "const": "A" },
        "skill": { "type": "string" },
        "reason": { "type": "string", "maxLength": 200 },
        "context": { "type": "string" }
      },
      "required": ["skill", "reason"]
    },
    {
      "properties": {
        "template": { "const": "B" },
        "steps": {
          "type": "array", "minItems": 2, "maxItems": 4,
          "items": { "type": "object", "required": ["skill", "reason"],
                     "properties": { "skill": { "type": "string" }, "reason": { "type": "string" } } }
        }
      },
      "required": ["steps"]
    },
    {
      "properties": {
        "template": { "const": "C" },
        "need": { "type": "string" },
        "options": { "type": "array", "minItems": 2, "maxItems": 4, "items": { "type": "string" } }
      },
      "required": ["need", "options"]
    }
  ]
}
```

Rendering: A → 3 lines (`Next skill`, `Reason`, `Context`); B → numbered list; C → `Need` plus bullet options.

## 6. Handoff Context

```json
{
  "$id": "Handoff",
  "type": "object",
  "required": ["route", "stack", "artifacts"],
  "properties": {
    "route": { "type": "array", "items": { "type": "string" } },
    "stack": {
      "type": "object",
      "properties": {
        "language": { "type": "string" },
        "framework": { "type": "string" },
        "runtime": { "type": "string" },
        "package": { "type": "string", "description": "workspace package path in monorepos" }
      }
    },
    "artifacts": { "type": "array", "items": { "type": "string" } },
    "open_questions": { "type": "array", "items": { "type": "string" } }
  }
}
```

## 7. Bundle Definition

```json
{
  "name": "backend-only",
  "description": "Backend-only: OOP, design patterns, microservices, ...",
  "skills": ["master-orchestrator", "project-init", "create-brief", "backend-api-design"]
}
```

Bundle entries use skill *names* (frontmatter `name`, sometimes category-prefixed), not paths. Tooling must map names to paths before validating routes.

## 8. Golden Routing Case

```yaml
- id: greenfield-01
  request: "I want to build a recipe sharing app"
  state: { artifacts: {}, manifests: [] }
  expect: { template: A, skill: planning/create-brief }
```

## Validation Rules

- Every `targets` path resolves to `skills/<path>/SKILL.md` (after template-variable expansion).
- Frontmatter `name` equals the directory's last segment unless documented otherwise.
- Template B never contains the same skill twice.
- Handoff `artifacts` lists only paths that exist.

## Checklist

- [ ] Frontmatter lint passes for all skills
- [ ] Routing rows parse and resolve
- [ ] Decisions validate against `RoutingDecision`
- [ ] Bundle names map to existing skills
