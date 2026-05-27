# Risk Reporting

## Report Generator

```typescript
interface RiskReport {
  id: string
  title: string
  period: {
    start: string
    end: string
  }
  generated: string
  summary: RiskSummary
  details: RiskDetail[]
  trends: RiskTrend[]
  recommendations: Recommendation[]
}

interface RiskSummary {
  totalRisks: number
  criticalCount: number
  highCount: number
  mediumCount: number
  lowCount: number
  mitigatedCount: number
  newRisksCount: number
  overallScore: number
}

interface RiskDetail {
  id: string
  description: string
  category: string
  probability: number
  impact: number
  score: number
  status: string
  owner: string
  mitigation: string
  lastUpdated: string
}

class RiskReportGenerator {
  generateReport(risks: Risk[], period: DateRange): RiskReport {
    const active = risks.filter(r => r.status !== 'closed')
    const summary: RiskSummary = {
      totalRisks: active.length,
      criticalCount: active.filter(r => r.score >= 20).length,
      highCount: active.filter(r => r.score >= 12 && r.score < 20).length,
      mediumCount: active.filter(r => r.score >= 6 && r.score < 12).length,
      lowCount: active.filter(r => r.score < 6).length,
      mitigatedCount: risks.filter(r => r.status === 'mitigated').length,
      newRisksCount: risks.filter(r =>
        r.createdAt >= period.start && r.createdAt <= period.end
      ).length,
      overallScore: this.calculateOverallScore(active),
    }

    return {
      id: crypto.randomUUID(),
      title: `Risk Report ${period.start} - ${period.end}`,
      period: { start: period.start, end: period.end },
      generated: new Date().toISOString(),
      summary,
      details: this.buildDetails(active),
      trends: this.analyzeTrends(risks, period),
      recommendations: this.generateRecommendations(active),
    }
  }

  private calculateOverallScore(risks: Risk[]): number {
    if (risks.length === 0) return 0
    return risks.reduce((acc, r) => acc + r.score, 0) / risks.length
  }

  private buildDetails(risks: Risk[]): RiskDetail[] {
    return risks.map(r => ({
      id: r.id,
      description: r.description,
      category: r.category,
      probability: r.probability,
      impact: r.impact,
      score: r.score,
      status: r.status,
      owner: r.owner,
      mitigation: r.mitigation,
      lastUpdated: r.updatedAt,
    }))
  }
}
```

## Trend Analysis

```typescript
interface RiskTrend {
  category: string
  period: string
  count: number
  averageScore: number
  direction: 'increasing' | 'decreasing' | 'stable'
}

function analyzeRiskTrends(
  risks: Risk[],
  periods: { label: string; start: string; end: string }[]
): RiskTrend[] {
  const categories = [...new Set(risks.map(r => r.category))]
  const trends: RiskTrend[] = []

  for (const category of categories) {
    const categoryRisks = risks.filter(r => r.category === category)
    const periodData = periods.map(p => {
      const inPeriod = categoryRisks.filter(r =>
        r.updatedAt >= p.start && r.updatedAt <= p.end
      )
      return {
        label: p.label,
        count: inPeriod.length,
        avgScore: inPeriod.length > 0
          ? inPeriod.reduce((a, r) => a + r.score, 0) / inPeriod.length
          : 0,
      }
    })

    const direction = determineTrend(periodData.map(p => p.avgScore))
    const latest = periodData[periodData.length - 1]

    trends.push({
      category,
      period: latest.label,
      count: latest.count,
      averageScore: latest.avgScore,
      direction,
    })
  }

  return trends
}

function determineTrend(scores: number[]): 'increasing' | 'decreasing' | 'stable' {
  if (scores.length < 3) return 'stable'
  const recent = scores.slice(-3)
  const trend = recent[2] - recent[0]
  if (trend > 0.5) return 'increasing'
  if (trend < -0.5) return 'decreasing'
  return 'stable'
}
```

## Risk Heat Map Data

```typescript
interface HeatMapCell {
  probability: number
  impact: number
  count: number
  risks: Risk[]
  color: string
}

function generateHeatMap(risks: Risk[]): HeatMapCell[] {
  const cells: HeatMapCell[] = []

  for (let prob = 1; prob <= 5; prob++) {
    for (let imp = 1; imp <= 5; imp++) {
      const cellRisks = risks.filter(r =>
        Math.round(r.probability) === prob &&
        Math.round(r.impact) === imp
      )

      if (cellRisks.length > 0) {
        cells.push({
          probability: prob,
          impact: imp,
          count: cellRisks.length,
          risks: cellRisks,
          color: getHeatMapColor(prob * imp),
        })
      }
    }
  }

  return cells
}

function getHeatMapColor(value: number): string {
  if (value >= 20) return '#DC2626'
  if (value >= 12) return '#EA580C'
  if (value >= 6) return '#CA8A04'
  return '#16A34A'
}
```

## Export Formats

```typescript
type ExportFormat = 'pdf' | 'csv' | 'json' | 'xlsx'

interface ExportOptions {
  format: ExportFormat
  includeDetails: boolean
  includeHeatMap: boolean
  includeTrends: boolean
  dateRange?: DateRange
}

class RiskExporter {
  async export(risks: Risk[], options: ExportOptions): Promise<Blob> {
    switch (options.format) {
      case 'csv':
        return this.exportCSV(risks)
      case 'json':
        return this.exportJSON(risks)
      case 'pdf':
        return this.exportPDF(risks, options)
      case 'xlsx':
        return this.exportXLSX(risks)
    }
  }

  private exportCSV(risks: Risk[]): Blob {
    const headers = ['ID', 'Description', 'Category', 'Probability', 'Impact', 'Score', 'Status', 'Owner', 'Mitigation']
    const rows = risks.map(r => [
      r.id,
      `"${r.description.replace(/"/g, '""')}"`,
      r.category,
      r.probability,
      r.impact,
      r.score,
      r.status,
      r.owner,
      `"${r.mitigation.replace(/"/g, '""')}"`,
    ])

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    return new Blob([csv], { type: 'text/csv' })
  }

  private exportJSON(risks: Risk[]): Blob {
    const json = JSON.stringify(risks, null, 2)
    return new Blob([json], { type: 'application/json' })
  }
}
```

## Compliance Report

```typescript
interface ComplianceCheck {
  standard: string
  requirement: string
  status: 'compliant' | 'non-compliant' | 'partial'
  risks: string[]
  deadline: string
  owner: string
}

function generateComplianceReport(
  standards: string[],
  risks: Risk[]
): ComplianceCheck[] {
  const checks: ComplianceCheck[] = []

  for (const standard of standards) {
    const relevantRisks = risks.filter(r =>
      r.complianceStandards?.includes(standard)
    )

    checks.push({
      standard,
      requirement: `Risk management requirements for ${standard}`,
      status: relevantRisks.some(r => r.score >= 15)
        ? 'non-compliant'
        : relevantRisks.some(r => r.score >= 8)
          ? 'partial'
          : 'compliant',
      risks: relevantRisks.map(r => r.id),
      deadline: calculateComplianceDeadline(standard),
      owner: getComplianceOwner(standard),
    })
  }

  return checks
}
```

## Key Points

- Generate reports on regular cadences with consistent structure
- Include summary metrics for quick executive overview
- Analyze risk trends across categories and time periods
- Visualize risk distribution with heat map data
- Support multiple export formats (CSV, JSON, PDF, XLSX)
- Track new risks identified within the reporting period
- Measure mitigation progress over time
- Include compliance status against relevant standards
- Provide actionable recommendations based on risk analysis
- Track risk score direction to identify emerging threats
- Include owner accountability for each risk item
- Archive historical reports for trend comparison
