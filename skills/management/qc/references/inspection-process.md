# Inspection Process

## Inspection Types

| Type | Scope | Duration | Participants | Formality |
|------|-------|----------|--------------|-----------|
| Self-review | Own code before PR | 10-15 min | Author | Informal |
| Peer review | PR-level, everyday | 30 min | Author + 1 reviewer | Standard |
| Walkthrough | Design/architecture | 60 min | Team | Semi-formal |
| Technical review | Complex implementation | 60-90 min | Author + 2-3 reviewers | Formal |
| Formal inspection | Critical code, security | 90 min | Moderator + reviewers | Rigorous |

## Formal Inspection Process

### 1. Planning
- Moderator selects the artifact to inspect
- Defines inspection scope and entry criteria
- Selects reviewers (2-4, including author's peer)
- Schedules session (max 90 minutes)
- Distributes artifact and checklist 48 hours in advance

### 2. Overview (Optional)
- Author presents background (5-10 min)
- Reviewers ask clarifying questions
- Only for complex or unfamiliar artifacts

### 3. Preparation
- Each reviewer examines artifact independently
- Identifies potential defects using checklist
- Records defects on inspection log
- Notes questions for clarification
- Typically 30-60 minutes of preparation

### 4. Inspection Meeting
| Phase | Time | Activity |
|-------|------|----------|
| Kickoff | 5 min | Moderator reviews rules and goals |
| Presentation | 15-20 min | Author walks through artifact |
| Defect identification | 40-50 min | Reviewers raise defects, moderator logs |
| Clarification | 10 min | Author asks questions |
| Decision | 5 min | Accept / Conditional / Re-inspect |

### 5. Rework
- Author fixes all defects
- Verification depends on severity:
  - Minor: moderator verifies
  - Major: re-inspection by original reviewer
  - Critical: full re-inspection

### 6. Follow-up
- Moderator verifies all fixes are complete
- Updates inspection log with resolution
- Archives inspection records
- Updates process based on lessons learned

## Inspection Roles

| Role | Responsibilities |
|------|------------------|
| Moderator | Leads process, keeps meeting on track, ensures checklist followed, logs defects |
| Author | Presents artifact, answers questions, fixes defects |
| Reviewer | Examines artifact, identifies defects, provides improvement suggestions |
| Scribe | Records defects, decisions, action items (may be moderator) |
| Manager | Never attends — inspections are technical, not evaluative |

## Defect Classification

| Severity | Definition | Action Required |
|----------|------------|----------------|
| Critical | Will cause failure, security breach, data loss | Must fix before any further work |
| Major | Significant deviation from requirements | Must fix before release |
| Minor | Deviation but does not affect functionality | Should fix |
| Trivial | Cosmetic, readability, style | Optional |

## Inspection Entry Criteria

- [ ] Artifact is complete (no placeholders or TODOs)
- [ ] Author has performed self-review
- [ ] Required checklists are available
- [ ] All prerequisite artifacts are available
- [ ] Reviewers have been trained in inspection process

## Inspection Exit Criteria

- [ ] All critical and major defects resolved
- [ ] Minor defects have target resolution date
- [ ] Inspection log completed and signed
- [ ] Moderator has verified fixes (or delegated verification)
- [ ] Lessons learned documented

## Inspection Rules

- Managers never attend inspections — removes evaluation pressure
- Focus on defects, not solutions — author determines how to fix
- Maximum 90 minutes per session — longer sessions lose effectiveness
- Preparation time counts — require 30-60 min per reviewer
- Defect counts are process data, not people data — never use for performance evaluation
- Each artifact is inspected once — re-inspection only if defect density exceeds threshold
- Inspection rate: code < 200 LOC/hour, documents < 5 pages/hour
- Defect density > 6 defects/page warrants re-inspection of entire artifact
