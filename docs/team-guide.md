# Team Guide

## Adding a New Skill

1. Choose the right area: `core/`, `planning/`, `backend/`, `frontend/`, `mobile/`, `dev-loop/`, `devops/`, `management/`
2. Create `skills/{area}/{name}/SKILL.md` following `docs/skill-template.md`
3. Add 3-4 reference files in `skills/{area}/{name}/references/`
4. Add routing entry in `skills/core/master-orchestrator/SKILL.md`
5. Update agent configs if the skill should appear in quick maps:
   - `.claude/rules/routing.md`
   - `.codex/rules/routing.md`
   - `.opencode/AGENTS.md`
   - `.gemini/INSTRUCTIONS.md`
6. Add to relevant bundles in `bundles/bundle-definitions.json`
7. Update README.md skill table and counts

## Naming Conventions

### Skill Names
- Lowercase kebab-case: `database-patterns`, `mobile-deployment`
- Prefix area for clarity: `frontend-tailwind-css`, `backend-grpc-patterns`

### Directory Structure
```
skills/{area}/{skill-name}/
  SKILL.md
  references/
    {topic}.md
```

### Bundle Names
- Prefix bundle type: `fullstack-{backend}-{frontend}`
- Suffix: `-only` for single-area bundles

## Git Workflow

```
Branch naming:  feat/{skill-name} | fix/{skill-name} | docs/{skill-name}
Commit format:  {type}({area}): {description}
                Types: feat, fix, docs, refactor, chore
                Example: feat(backend): add grpc-patterns skill
```

## Code Review Checklist

- [ ] SKILL.md follows the standard template (frontmatter, Agent Protocol, Workflow, Rules, References, Handoff)
- [ ] Compression rule present in Response Format section
- [ ] All reference files exist and are linked correctly
- [ ] UTF-8 NO BOM encoding
- [ ] Routing entry in master-orchestrator
- [ ] Bundle definitions updated if applicable
- [ ] Agent configs updated if skill list changed

## Customizing Skills for Your Stack

Create a directory `skills/{area}/{team-name}/` with overridden SKILL.md files. The master-orchestrator checks for team-specific overrides before falling back to the standard skill. Alternatively, create custom bundles in `bundles/bundle-definitions.json` that include only the skills your team uses.
