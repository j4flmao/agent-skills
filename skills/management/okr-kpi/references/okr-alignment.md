# OKR Alignment

## Vertical Alignment

```typescript
interface OKRNode {
  id: string
  objective: string
  keyResults: KeyResult[]
  childNodes: OKRNode[]
  parentId: string | null
  team: string
  owner: string
  confidence: number
}

interface KeyResult {
  description: string
  metric: string
  baseline: number
  target: number
  current: number
  unit: string
}

function alignOKRs(topLevel: OKRNode, teams: OKRNode[]): OKRNode[] {
  return teams.map(team => {
    const aligned = topLevel.keyResults.map(kr => {
      const teamKR = findContributingKR(team, kr)
      return {
        ...kr,
        contributedBy: teamKR ? team.name : undefined,
        contribution: teamKR ? calculateContribution(teamKR, kr) : 0,
      }
    })

    return {
      ...team,
      alignedKeyResults: aligned,
      alignmentScore: calculateAlignmentScore(aligned),
    }
  })
}

function calculateContribution(child: KeyResult, parent: KeyResult): number {
  if (child.metric !== parent.metric) return 0
  const childProgress = (child.current - child.baseline) / (child.target - child.baseline)
  const parentProgress = (parent.current - parent.baseline) / (parent.target - parent.baseline)
  return parentProgress > 0 ? childProgress / parentProgress : 0
}

function calculateAlignmentScore(krs: KeyResult[]): number {
  const scores = krs.filter(kr => kr.contributedBy).map(kr => kr.contribution ?? 0)
  if (scores.length === 0) return 0
  return scores.reduce((a, b) => a + b, 0) / scores.length
}
```

## Cross-Team Dependency Mapping

```typescript
interface Dependency {
  id: string
  fromTeam: string
  toTeam: string
  fromKR: string
  toKR: string
  type: 'blocking' | 'contributing' | 'shared'
  status: 'identified' | 'in-progress' | 'resolved'
  deadline: string
}

function mapDependencies(teams: OKRNode[]): Dependency[] {
  const deps: Dependency[] = []

  for (const team of teams) {
    for (const kr of team.keyResults) {
      const blockers = findBlockers(kr, teams)
      for (const blocker of blockers) {
        deps.push({
          id: crypto.randomUUID(),
          fromTeam: team.name,
          toTeam: blocker.team,
          fromKR: kr.description,
          toKR: blocker.description,
          type: 'blocking',
          status: 'identified',
          deadline: calculateDeadline(kr.target, blocker.target),
        })
      }
    }
  }

  return deps
}

function findBlockers(kr: KeyResult, teams: OKRNode[]): { team: string; description: string; target: number }[] {
  return teams
    .filter(t => t.keyResults.some(k => isPrerequisite(k, kr)))
    .map(t => ({
      team: t.name,
      description: t.keyResults.find(k => isPrerequisite(k, kr))!.description,
      target: t.keyResults.find(k => isPrerequisite(k, kr))!.target,
    }))
}
```

## Confidence Scoring

```typescript
enum ConfidenceLevel {
  HIGH = 4,
  MEDIUM_HIGH = 3,
  MEDIUM = 2,
  LOW = 1,
  AT_RISK = 0,
}

interface ConfidenceAssessment {
  level: ConfidenceLevel
  factors: string[]
  mitigationPlan?: string
  assessedBy: string
  date: string
}

function assessConfidence(kr: KeyResult, progress: number, blockers: string[]): ConfidenceAssessment {
  const progressRatio = progress / kr.target
  let level: ConfidenceLevel

  if (blockers.length > 0) {
    level = ConfidenceLevel.AT_RISK
  } else if (progressRatio >= 0.7) {
    level = ConfidenceLevel.HIGH
  } else if (progressRatio >= 0.4) {
    level = ConfidenceLevel.MEDIUM_HIGH
  } else if (progressRatio >= 0.2) {
    level = ConfidenceLevel.MEDIUM
  } else {
    level = ConfidenceLevel.LOW
  }

  return {
    level,
    factors: buildConfidenceFactors(progressRatio, blockers),
    assessedBy: currentUser(),
    date: new Date().toISOString(),
  }
}
```

## Quarterly Review Process

```typescript
interface OKRReview {
  quarter: string
  year: number
  okrs: OKRNode[]
  scores: Record<string, number>
  learnings: string[]
  adjustments: string[]
}

function conductReview(okrs: OKRNode[]): OKRReview {
  const scores: Record<string, number> = {}

  for (const okr of okrs) {
    const progress = okr.keyResults.reduce((acc, kr) => {
      if (kr.target === kr.baseline) return acc
      return acc + (kr.current - kr.baseline) / (kr.target - kr.baseline)
    }, 0)

    scores[okr.objective] = (progress / okr.keyResults.length) * 100
  }

  return {
    quarter: getCurrentQuarter(),
    year: new Date().getFullYear(),
    okrs,
    scores,
    learnings: extractLearnings(okrs),
    adjustments: proposeAdjustments(scores),
  }
}
```

## OKR Cascade Visualization

```typescript
function generateCascadeReport(companyOKR: OKRNode, teams: OKRNode[]): string {
  const report = [
    '# OKR Cascade Report',
    '',
    `## Company Objective: ${companyOKR.objective}`,
    '',
    '### Key Results',
    ...companyOKR.keyResults.map(kr => `- ${kr.description} (${kr.current}/${kr.target} ${kr.unit})`),
    '',
    '### Team Alignment',
  ]

  for (const team of teams) {
    const alignment = calculateTeamAlignment(team, companyOKR)
    report.push(
      `#### ${team.name} (Alignment: ${alignment.toFixed(0)}%)`,
      `Objective: ${team.objective}`,
      ...team.keyResults.map(kr =>
        `- ${kr.description}: ${kr.current}/${kr.target} ${kr.unit}`
      ),
      ''
    )
  }

  return report.join('\n')
}
```

## Key Points

- OKRs must cascade from company to team to individual level
- Each team OKR should explicitly map to a company KR contribution
- Identify cross-team dependencies and track them as risks
- Update confidence scores weekly and escalate when at risk
- Conduct quarterly reviews with scoring and learning capture
- Visualize the OKR cascade to show alignment gaps
- Track blockers between teams with clear owners and deadlines
- Use progress ratios to objectively measure KR completion
- Document adjustments and rationale for future reference
- Celebrate wins and analyze failures equally in reviews
