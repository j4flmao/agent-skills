# ADR Workflow

## Lifecycle

### States
```
Draft → Proposed → Accepted → Superseded
                 → Rejected
```

### State Transitions
| Transition | Action | Approver |
|------------|--------|----------|
| Draft → Proposed | Submit PR with ADR | Author |
| Proposed → Accepted | Merge PR | Tech lead / Architect |
| Proposed → Rejected | Close PR without merge | Tech lead / Architect |
| Accepted → Superseded | New ADR references old | Any |

## Team Workflow

### Identifying When to Write an ADR
- Any non-trivial technical decision
- Framework or library selection
- Architecture pattern choice
- API design decisions
- Database technology selection
- Infrastructure decisions

### Collaboration Process
1. Author creates ADR in draft state
2. Share with team for early feedback
3. Submit as PR with ADR document
4. Team reviews during architecture sync
5. Address feedback and iterate
6. Tech lead approves or rejects
7. Merge and notify stakeholders

### Review Checklist
- [ ] Decision is clearly stated
- [ ] Context provides sufficient background
- [ ] Alternatives are fairly evaluated
- [ ] Consequences are realistic
- [ ] Compliance mechanism is defined
- [ ] Status is appropriate

## Tooling Integration

### GitHub Actions
```yaml
name: ADR Review
on:
  pull_request:
    paths:
      - 'docs/decisions/**'
jobs:
  validate:
    steps:
      - run: |
          for file in docs/decisions/*.md; do
            # Validate ADR template compliance
            check_adr_template "$file"
          done
```

### Template Enforcement
- Mandatory sections: Title, Status, Context, Decision, Consequences
- File naming: `ADR-NNN-kebab-case-title.md`
- Maximum 2 pages per ADR
- One decision per ADR

## Distribution

### Notification
- Post to team architecture channel on merge
- Include in weekly engineering newsletter
- Tag relevant stakeholders

### Discoverability
- Index in docs/decisions/README.md
- Cross-reference in related ADRs
- Link from code comments to relevant ADRs
