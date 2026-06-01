## Goal
- Deepen 8 enterprise skill directories (SKILL.md → 400–600+ lines, rewrite generic *-fundamentals.md and *-advanced.md, add 1 new ref file per skill)

## Constraints & Preferences
- All 8 skills live under `skills/enterprise/`
- Target: 400–600+ lines per SKILL.md with decision trees, patterns, anti-patterns, code examples
- *-fundamentals.md and *-advanced.md were generic 147/143‑line templates — must be rewritten with domain-specific content
- Create 1 new reference file per skill to fill identified gaps

## Progress
### Done
- **business-continuity**: SKILL.md 515 lines, fundamentals/advanced rewritten, `third-party-continuity.md` created
- **compliance-audit**: SKILL.md 563 lines, fundamentals/advanced rewritten, `compliance-incident-response.md` created
- **cost-governance**: SKILL.md 585 lines, fundamentals/advanced rewritten, `ri-savings-plan-strategy.md` created
- **data-governance**: SKILL.md 565 lines, fundamentals/advanced rewritten, `data-contracts.md` created
- **identity-provider**: SKILL.md 508 lines, fundamentals/advanced rewritten, `conditional-access-zero-trust.md` created
- **integration-patterns**: SKILL.md 535 lines, fundamentals/advanced rewritten, `api-gateway-patterns.md` created
- **itil-service-mgmt**: SKILL.md 546 lines, fundamentals/advanced rewritten, `capacity-availability-management.md` created
- **legacy-migration**: SKILL.md 515 lines, fundamentals/advanced rewritten, `strangler-fig-implementation.md` created

### In Progress
- (none)

### Blocked
- (none)

## Key Decisions
- Added code examples (Python/YAML/HCL/Rego/JSON) and anti-patterns sections to every SKILL.md to reach 400–600+ lines
- Each new ref file addresses a specific gap: third-party continuity, compliance incident response, RI/SP strategy, data contracts, conditional access/zero-trust, API gateway patterns, capacity/availability management, strangler fig implementation
- Fundamentals/advanced files completely rewritten with domain-specific content — no longer generic "GENERAL" placeholders

## Next Steps
(none — all 8 skills completed)

## Critical Context
- All 8 skills were initially under 400 lines in SKILL.md and had generic fundamentals/advanced templates
- SKILL.md files now range 508–585 lines (all within 400–600+ target)
- All fundamentals/advanced files are now domain-specific
- 8 new reference files created total (1 per skill)
- Reference files are not counted in SKILL.md line totals but contribute to overall skill depth

## Relevant Files
- All 8 skill directories under `skills/enterprise/` are now fully deepened