# Report Visualization and Charts

## Chart Libraries

### Library Comparison

| Library | Format | Interactivity | Use Case |
|---------|--------|--------------|----------|
| Chart.js | Canvas | High | Web dashboards |
| D3.js | SVG | Very High | Custom visualization |
| ECharts | Canvas | High | Enterprise dashboards |
| Plotly | WebGL | High | Scientific/analytical |
| ApexCharts | SVG | High | Business dashboards |
| Vega-Lite | JSON | Medium | Declarative specs |

## Server-Side Chart Generation

### Chart.js PNG Generation
```javascript
const { createCanvas } = require('canvas');
const { Chart } = require('chart.js/auto');

async function generateChart(data, outputPath) {
  const width = 800;
  const height = 400;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.labels,
      datasets: [{
        label: 'Revenue',
        data: data.values,
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1,
      }],
    },
    options: {
      responsive: false,
      plugins: {
        title: {
          display: true,
          text: data.title || 'Chart',
        },
      },
      scales: {
        y: { beginAtZero: true },
      },
    },
  });

  const buffer = canvas.toBuffer('image/png');
  require('fs').writeFileSync(outputPath, buffer);
}
```

### ECharts Server-Side
```python
from pyecharts.charts import Bar, Line, Pie, Timeline
from pyecharts import options as opts
from pyecharts.globals import ThemeType
import json

def create_revenue_chart(monthly_data: list[dict]) -> dict:
    chart = (
        Bar(init_opts=opts.InitOpts(
            width="800px",
            height="400px",
            theme=ThemeType.LIGHT,
        ))
        .add_xaxis([d["month"] for d in monthly_data])
        .add_yaxis(
            "Revenue",
            [d["revenue"] for d in monthly_data],
            itemstyle_opts=opts.ItemStyleOpts(
                color="#3B82F6",
                border_radius=[4, 4, 0, 0],
            ),
        )
        .add_yaxis(
            "Expenses",
            [d["expenses"] for d in monthly_data],
            itemstyle_opts=opts.ItemStyleOpts(
                color="#EF4444",
                border_radius=[4, 4, 0, 0],
            ),
        )
        .set_global_opts(
            title_opts=opts.TitleOpts(title="Monthly Financial Summary"),
            tooltip_opts=opts.TooltipOpts(trigger="axis"),
            legend_opts=opts.LegendOpts(pos_top="5%"),
            xaxis_opts=opts.AxisOpts(type_="category"),
            yaxis_opts=opts.AxisOpts(
                type_="value",
                axislabel_opts=opts.LabelOpts(formatter="${value}"),
            ),
        )
    )

    return json.loads(chart.dump_options_with_quotes())
```

## Template-Based Charts

### Chart.js Template
```html
<!-- templates/reports/chart.html -->
<div class="chart-container">
  <canvas id="{{ chart_id }}"></canvas>
</div>

<script>
document.addEventListener('DOMContentLoaded', function() {
  const ctx = document.getElementById('{{ chart_id }}').getContext('2d');

  new Chart(ctx, {
    type: '{{ chart_type }}',
    data: {{{ chart_data_json }}},
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index',
      },
      plugins: {
        legend: { position: 'bottom' },
        tooltip: {
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) label += ': ';
              if (context.parsed.y !== null) {
                label += new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD'
                }).format(context.parsed.y);
              }
              return label;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return '$' + value.toLocaleString();
            }
          }
        }
      }
    }
  });
});
</script>
```

## Interactive Dashboard Components

### Metrics Grid
```html
<div class="metrics-grid">
  {% for metric in metrics %}
  <div class="metric-card {{ 'trend-up' if metric.trend > 0 else 'trend-down' }}">
    <div class="metric-label">{{ metric.label }}</div>
    <div class="metric-value">{{ metric.value }}</div>
    <div class="metric-trend">
      <span class="trend-indicator">
        {% if metric.trend > 0 %}↑{% else %}↓{% endif %}
      </span>
      {{ metric.trend_percentage }}%
    </div>
    <div class="metric-subtitle">{{ metric.subtitle }}</div>
  </div>
  {% endfor %}
</div>
```

### Data Table
```python
def render_data_table(columns: list[str], rows: list[list], options: dict = None):
    html = ['<div class="table-container">']
    html.append('<table class="data-table">')

    # Header
    html.append('<thead><tr>')
    for col in columns:
        html.append(f'<th>{col}</th>')
    html.append('</tr></thead>')

    # Body
    html.append('<tbody>')
    for row in rows:
        html.append('<tr>')
        for cell in row:
            html.append(f'<td>{cell}</td>')
        html.append('</tr>')
    html.append('</tbody>')

    html.append('</table>')
    html.append('</div>')

    return ''.join(html)
```

## Automated Report Generation

### Report Builder
```python
from dataclasses import dataclass, field
from datetime import datetime

@dataclass
class ReportSection:
    title: str
    type: str  # chart, table, text, metrics
    data: dict
    config: dict = field(default_factory=dict)

@dataclass
class Report:
    title: str
    description: str
    generated_at: datetime = field(default_factory=datetime.now)
    sections: list[ReportSection] = field(default_factory=list)

class ReportBuilder:
    def __init__(self, title: str, description: str = ""):
        self.report = Report(title=title, description=description)

    def add_chart(self, title: str, chart_type: str, data: dict, **kwargs):
        self.report.sections.append(
            ReportSection(
                title=title,
                type="chart",
                data={"chart_type": chart_type, **data},
                config=kwargs,
            )
        )
        return self

    def add_table(self, title: str, columns: list, rows: list, **kwargs):
        self.report.sections.append(
            ReportSection(
                title=title,
                type="table",
                data={"columns": columns, "rows": rows},
                config=kwargs,
            )
        )
        return self

    def add_metrics(self, title: str, metrics: list[dict], **kwargs):
        self.report.sections.append(
            ReportSection(
                title=title,
                type="metrics",
                data={"metrics": metrics},
                config=kwargs,
            )
        )
        return self

    def build(self) -> Report:
        return self.report
```

## Embedding in PDF Reports
```javascript
// puppeteer script for chart screenshots
const puppeteer = require('puppeteer');

async function captureChart(html, outputPath) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.setContent(html, { waitUntil: 'networkidle0' });
  await page.waitForSelector('canvas');

  const chartElement = await page.$('canvas');
  await chartElement.screenshot({
    path: outputPath,
    type: 'png',
  });

  await browser.close();
}
```

## Key Points
- Chart.js and ECharts are the most practical choices for business report charts
- Server-side chart rendering generates PNG images for PDF reports
- Template-based charts enable dynamic data binding in HTML reports
- Metrics grid provides at-a-glance KPI summaries
- Data tables support detailed tabular reporting with sorting and filtering
- Report builder pattern composes charts, tables, and metrics into structured reports
- Puppeteer captures chart screenshots for embedding in PDF exports
- Interactive dashboards combine multiple chart types with real-time data
- Format values consistently (currency, percentages, dates) across all visualizations
- Responsive chart sizing ensures readability across desktop and mobile
