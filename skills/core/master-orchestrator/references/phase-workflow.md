# Phase Workflow Reference

## Phase Definitions

| Phase | Name | Skills | Purpose |
|-------|------|--------|---------|
| Phase 0 | Init & Define | project-init, create-brief, create-prd, create-story | Define what to build |
| Phase 1 | Architect | create-adr, create-tech-spec, {stack}-architecture | Design architecture |
| Phase 2 | API Design | backend-api-design, api-response, grpc-patterns | Define contracts |
| Phase 3 | Implement | {stack}-patterns, frontend-*, mobile-* | Write code |
| Phase 4 | Validate | testing, debugging, performance, code-review | Verify correctness |
| Phase 5 | Deploy & Operate | docker, k8s, cicd, monitoring, observability | Ship and run |
| Phase 6 | Manage | pm, ba, qa, qc, team-rules, security | Coordinate team |
| Phase 7 | Retrospect | changelog, retro, post-mortem | Learn and improve |
| Phase 8 | Cross-cutting | alerting, pentesting, all universal skills | Ongoing concerns |

## Workflow State Machine

```
[Start] → Phase 0: Init & Define
    ↓
Phase 1: Architect
    ↓
Phase 2: API Design
    ↓
Phase 3: Implement
    ↓
Phase 4: Validate → ⚠️ Failed? → back to Phase 3
    ↓
Phase 5: Deploy & Operate
    ↓
Phase 6: Manage
    ↓
Phase 7: Retrospect
    ↓
Phase 8: Cross-cutting (continuous, parallel)
```

## State Transitions

### Allowed backward transitions

| From | To | Condition |
|------|-----|-----------|
| Phase 4 | Phase 3 | Tests fail or bugs found |
| Phase 4 | Phase 1 | Architecture doesn't support testing |
| Phase 5 | Phase 4 | Production incident found |
| Phase 5 | Phase 2 | API contract changes needed |

### Allowed skip transitions

| From | To | Condition |
|------|-----|-----------|
| Phase 0 | Phase 3 | Existing project with architecture docs |
| Phase 1 | Phase 5 | Using known patterns (no design needed) |

## Routing State Pattern

```
state = {
  phase: 0-8,
  stack: detected | null,
  artifacts: [brief, prd, adr, spec],
  last_skill: skill_name | null
}
```

The orchestrator checks artifacts in order:
1. docs/brief* — brief exists
2. docs/prd* — PRD exists
3. docs/decisions/ — ADRs exist
4. docs/specs/ — tech specs exist
5. package.json / Cargo.toml / go.mod — stack detected

## Completion Criteria per Phase

### Phase 0 Complete When
- docs/brief.md exists
- docs/prd.md exists with epics and stories

### Phase 1 Complete When
- docs/decisions/ with at least one ADR
- docs/specs/ with tech spec

### Phase 2 Complete When
- API contracts defined
- Data models documented

### Phase 3 Complete When
- Feature implementation done
- Tests passing

### Phase 4 Complete When
- All tests green
- Code review approved
- Performance acceptable
