# PR Writer Fundamentals

## Overview
PR writing is the skill of communicating code changes effectively to reviewers. A well-written PR expedites review, improves code quality, and serves as documentation for future reference.

## Core Concepts

### Concept 1: PR Title
Follow conventional commits: `<type>(<scope>): <description>`. Examples: "feat(api): add user preferences endpoint", "fix(ui): resolve datepicker timezone issue". Title should be descriptive enough to understand the change at a glance.

### Concept 2: PR Description Template
Organization-standard template: Problem/Background (why?), Solution/Approach (how?), Testing (how verified?), Screenshots (for UI changes), Related Issues (#123), and Checklist. Consistent format helps reviewers find information.

### Concept 3: Size Management
Small PRs get better reviews. Target under 400 lines changed. Split large features into logical PRs: scaffolding, core logic, tests, integration. Link PRs in series with dependency labeling. Each PR should be independently reviewable.

### Concept 4: Description Content
Explain motivation and context: "We need this because user requests time out at 30s". Describe alternative approaches considered. Call out design decisions. Include migration or deployment notes. Explain tricky or non-obvious code sections.

### Concept 5: Ready for Review
PR is complete when: CI passes, all tests pass, code is self-documenting, description is filled, screenshots attached for UI changes, and reviewer assignments match CODEOWNERS. Use Draft PR for work-in-progress.

## Best Practices

- Conventional commit title format
- Always fill the description template
- Keep PRs under 400 lines
- Link related issues and PRs
- Include screenshots for UI changes
- Self-review before requesting review
- Use Draft PR for early feedback
- Explain WHY, not just WHAT
- Call out risky changes or decisions

## Anti-Patterns

- Empty or one-line description
- Large PRs (500+ lines, nobody reviews fully)
- Vague titles ("fix", "update", "changes")
- No context (reviewers don't know WHY)
- Skipping screenshots for UI changes
- Multiple unrelated changes in one PR
- Merging with failing CI
- No testing notes (how to verify?)
