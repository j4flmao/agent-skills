# Accessible Data Visualization

## Chart Accessibility

```typescript
interface AccessibleChartProps {
  data: ChartData[]
  title: string
  description: string
  xLabel: string
  yLabel: string
  role?: string
}

function AccessibleChart({
  data, title, description, xLabel, yLabel,
}: AccessibleChartProps) {
  return (
    <figure role="figure" aria-label={title}>
      <figcaption>{description}</figcaption>
      <svg role="img" aria-hidden="true">
        {renderChart(data)}
      </svg>
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">{xLabel}</th>
            <th scope="col">{yLabel}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((point, i) => (
            <tr key={i}>
              <td>{point.x}</td>
              <td>{point.y}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
```

## Color Considerations

```typescript
const COLORBLIND_SAFE_PALETTE = [
  '#0077BB', '#EE7733', '#009988', '#CC3311',
  '#33BBEE', '#EE3377', '#BBBBBB', '#AA3377',
]

interface ColorConfig {
  series: string
  color: string
  pattern?: 'solid' | 'dashed' | 'dotted'
  marker?: 'circle' | 'square' | 'diamond' | 'triangle'
}

function getAccessibleColorConfig(series: string[]): ColorConfig[] {
  return series.map((s, i) => ({
    series: s,
    color: COLORBLIND_SAFE_PALETTE[i % COLORBLIND_SAFE_PALETTE.length],
    pattern: getPattern(i),
    marker: getMarker(i),
  }))
}
```

## Screen Reader Data Tables

```typescript
interface DataTableProps {
  headers: string[]
  rows: (string | number)[][]
  caption: string
  summary?: string
}

function AccessibleDataTable({ headers, rows, caption, summary }: DataTableProps) {
  return (
    <div role="region" aria-label={caption} tabIndex={0}>
      <table aria-describedby={summary ? 'table-summary' : undefined}>
        <caption>{caption}</caption>
        {summary && <p id="table-summary" className="sr-only">{summary}</p>}
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} scope="col">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} scope={j === 0 ? 'row' : undefined}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

## Interactive Charts

```typescript
function InteractiveAccessibleChart() {
  const [focusedPoint, setFocusedPoint] = useState<number | null>(null)
  const chartRef = useRef<SVGSVGElement>(null)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      setFocusedPoint(p => p === null ? 0 : Math.min(p + 1, data.length - 1))
      e.preventDefault()
    }
    if (e.key === 'ArrowLeft') {
      setFocusedPoint(p => p === null ? 0 : Math.max(p - 1, 0))
      e.preventDefault()
    }
  }

  return (
    <div
      role="application"
      aria-label="Interactive chart. Use arrow keys to navigate data points."
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <svg ref={chartRef} role="img" aria-hidden="true">
        {data.map((point, i) => (
          <circle
            key={i}
            cx={point.x}
            cy={point.y}
            r={i === focusedPoint ? 8 : 4}
            aria-label={`Point: ${point.x}, ${point.y}`}
            tabIndex={-1}
          />
        ))}
      </svg>
      <div aria-live="polite" className="sr-only">
        {focusedPoint !== null
          ? `Data point ${focusedPoint + 1}: ${data[focusedPoint].x}, ${data[focusedPoint].y}`
          : 'No point selected'}
      </div>
    </div>
  )
}
```

## Key Points

- Provide data tables as fallback for all charts and graphs
- Use colorblind-safe palettes with distinct patterns and markers
- Add descriptive captions and summaries to all visualizations
- Support keyboard navigation for interactive charts
- Announce data point changes via aria-live regions
- Include context and trends in text descriptions
- Allow users to access raw data behind visualizations
- Test with screen readers to verify comprehension
- Avoid relying solely on color to convey information
- Provide zoom and detail-on-demand for complex charts
- Support multiple visualization types for the same data
- Document any assumptions or data transformations
