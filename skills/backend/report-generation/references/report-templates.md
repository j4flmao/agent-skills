# Report Templates

## Overview
Report templates provide reusable layouts, styles, and data bindings that separate report structure from content. A template-driven approach enables non-developers to create and modify reports, ensures consistent branding across outputs, and accelerates the development of new report types.

## Template Architecture

### Template Model

```python
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional

class TemplateFormat(Enum):
    PDF = "pdf"
    HTML = "html"
    EXCEL = "excel"
    CSV = "csv"
    MARKDOWN = "markdown"

@dataclass
class ReportTemplate:
    id: str
    name: str
    description: str
    format: TemplateFormat
    version: str
    author: str
    engine: str
    source: str
    styles: dict[str, Any] = field(default_factory=dict)
    variables: dict[str, VariableDef] = field(default_factory=dict)
    sections: list[SectionDef] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)
    created_at: datetime | None = None
    updated_at: datetime | None = None

@dataclass
class VariableDef:
    name: str
    type: str
    label: str
    required: bool = False
    default: Any = None
    validation: dict | None = None

@dataclass
class SectionDef:
    name: str
    type: str
    config: dict[str, Any] = field(default_factory=dict)
    condition: str | None = None
```

## Template Engines

### Jinja2 Templates

```python
from jinja2 import Environment, FileSystemLoader, select_autoescape
from datetime import datetime

class JinjaTemplateEngine:
    def __init__(self, template_dir: str):
        self.env = Environment(
            loader=FileSystemLoader(template_dir),
            autoescape=select_autoescape(["html", "xml"]),
            extensions=["jinja2.ext.do", "jinja2.ext.loopcontrols"]
        )
        self._register_filters()

    def _register_filters(self):
        def currency(value: float, symbol: str = "$") -> str:
            return f"{symbol}{value:,.2f}"

        def percentage(value: float, decimals: int = 1) -> str:
            return f"{value * 100:.{decimals}f}%"

        def date_format(value: str, fmt: str = "%Y-%m-%d") -> str:
            return datetime.fromisoformat(value).strftime(fmt)

        self.env.filters["currency"] = currency
        self.env.filters["pct"] = percentage
        self.env.filters["date"] = date_format

    def render(self, template_name: str, context: dict) -> str:
        template = self.env.get_template(template_name)
        return template.render(**context)

    def render_string(self, template_string: str, context: dict) -> str:
        template = self.env.from_string(template_string)
        return template.render(**context)
```

### HTML Template Example

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        @page {
            size: A4;
            margin: 2cm;
        }
        body {
            font-family: 'Helvetica Neue', Arial, sans-serif;
            color: #333;
            line-height: 1.6;
        }
        .header {
            border-bottom: 3px solid #2563eb;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #2563eb;
            margin: 0;
            font-size: 24px;
        }
        .header .meta {
            color: #666;
            font-size: 12px;
            margin-top: 5px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        th {
            background: #2563eb;
            color: white;
            padding: 10px 12px;
            text-align: left;
            font-size: 13px;
        }
        td {
            padding: 8px 12px;
            border-bottom: 1px solid #e5e7eb;
            font-size: 13px;
        }
        tr:nth-child(even) td {
            background: #f9fafb;
        }
        .summary-card {
            background: #f0f4ff;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            display: flex;
            gap: 40px;
        }
        .summary-item {
            text-align: center;
        }
        .summary-item .value {
            font-size: 28px;
            font-weight: bold;
            color: #2563eb;
        }
        .summary-item .label {
            font-size: 12px;
            color: #666;
            text-transform: uppercase;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 11px;
            color: #999;
            text-align: center;
        }
        .chart-container {
            margin: 30px 0;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{ report_name }}</h1>
        <div class="meta">
            Generated: {{ generated_at | date("%B %d, %Y %H:%M") }} |
            Period: {{ period_start | date("%b %d, %Y") }} - {{ period_end | date("%b %d, %Y") }}
        </div>
    </div>

    <div class="summary-card">
        {% for item in summary %}
        <div class="summary-item">
            <div class="value">{{ item.value | currency }}</div>
            <div class="label">{{ item.label }}</div>
        </div>
        {% endfor %}
    </div>

    {% if chart_url %}
    <div class="chart-container">
        <img src="{{ chart_url }}" alt="Chart" style="max-width: 100%;">
    </div>
    {% endif %}

    <table>
        <thead>
            <tr>
                {% for col in columns %}
                <th>{{ col.label }}</th>
                {% endfor %}
            </tr>
        </thead>
        <tbody>
            {% for row in rows %}
            <tr>
                {% for col in columns %}
                <td>{{ row[col.key] }}</td>
                {% endfor %}
            </tr>
            {% endfor %}
        </tbody>
    </table>

    <div class="footer">
        <p>{{ footer_text | default("Confidential - For Internal Use Only") }}</p>
        <p>Page {{ page_number }} of {{ total_pages }}</p>
    </div>
</body>
</html>
```

## Template Storage

### Database Storage

```sql
CREATE TABLE report_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    format VARCHAR(20) NOT NULL,
    version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
    engine VARCHAR(50) NOT NULL DEFAULT 'jinja2',
    source TEXT NOT NULL,
    styles JSONB DEFAULT '{}',
    variables JSONB DEFAULT '[]',
    sections JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_templates_active ON report_templates(is_active);
CREATE INDEX idx_templates_format ON report_templates(format);
```

### File System Storage

```python
import os
from pathlib import Path

class FileSystemTemplateStore:
    def __init__(self, base_path: str):
        self.base_path = Path(base_path)
        self.base_path.mkdir(parents=True, exist_ok=True)

    def save(self, template: ReportTemplate) -> str:
        ext = template.format.value
        file_path = self.base_path / f"{template.id}.{ext}"
        file_path.write_text(template.source, encoding="utf-8")
        return str(file_path)

    def load(self, template_id: str, format: str) -> str:
        ext = format
        file_path = self.base_path / f"{template_id}.{ext}"
        if not file_path.exists():
            raise TemplateNotFoundError(f"Template {template_id} not found")
        return file_path.read_text(encoding="utf-8")

    def delete(self, template_id: str, format: str):
        ext = format
        file_path = self.base_path / f"{template_id}.{ext}"
        if file_path.exists():
            file_path.unlink()

    def list_templates(self) -> list[str]:
        return [
            str(f.relative_to(self.base_path))
            for f in self.base_path.iterdir()
            if f.is_file()
        ]
```

## Template Versioning

```python
class TemplateVersionManager:
    def __init__(self, store: FileSystemTemplateStore):
        self.store = store
        self.version_dir = store.base_path / "_versions"

    def create_version(self, template: ReportTemplate) -> VersionRecord:
        self.version_dir.mkdir(exist_ok=True)
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        version_file = (
            self.version_dir /
            f"{template.id}_v{template.version}_{timestamp}.{template.format.value}"
        )
        version_file.write_text(template.source, encoding="utf-8")

        record = VersionRecord(
            template_id=template.id,
            version=template.version,
            file_path=str(version_file),
            created_at=datetime.utcnow()
        )
        self._save_record(record)
        return record

    def get_versions(self, template_id: str) -> list[VersionRecord]:
        records = []
        for f in self.version_dir.glob(f"{template_id}_*.json"):
            records.append(VersionRecord.parse_raw(f.read_text()))
        return sorted(records, key=lambda r: r.created_at, reverse=True)

    def rollback(self, template_id: str, version: str) -> ReportTemplate:
        records = self.get_versions(template_id)
        target = next(
            (r for r in records if r.version == version), None
        )
        if not target:
            raise VersionNotFoundError(
                f"Version {version} not found for template {template_id}"
            )
        source = Path(target.file_path.replace(
            Path(target.file_path).suffix, ".json"
        ))
        return ReportTemplate.parse_raw(source.read_text())

    def _save_record(self, record: VersionRecord):
        record_file = (
            self.version_dir /
            f"{record.template_id}_{record.version}.json"
        )
        record_file.write_text(record.json(), encoding="utf-8")
```

## Template Inheritance and Composition

```python
class TemplateComposer:
    def __init__(self, engine: JinjaTemplateEngine):
        self.engine = engine

    def compose(self, base_template: str,
                components: list[ComponentRef],
                context: dict) -> str:
        composed_html = self.engine.render(base_template, context)

        for component in components:
            component_html = self.engine.render(
                component.template_name,
                {**context, **component.context_overrides}
            )
            placeholder = f"{{% component '{component.name}' %}}"
            composed_html = composed_html.replace(
                placeholder, component_html
            )

        return composed_html

    def create_derived_template(self, parent: ReportTemplate,
                                overrides: dict) -> ReportTemplate:
        derived = copy.deepcopy(parent)
        derived.id = str(uuid.uuid4())
        derived.name = f"{parent.name} (Derived)"
        derived.variables = {
            **parent.variables,
            **overrides.get("variables", {})
        }

        if "sections" in overrides:
            derived.sections = self._merge_sections(
                parent.sections, overrides["sections"]
            )

        if "source_override" in overrides:
            derived.source = overrides["source_override"]

        return derived

    def _merge_sections(self, base: list[SectionDef],
                        overrides: list[dict]) -> list[SectionDef]:
        merged = {s.name: s for s in base}

        for override in overrides:
            name = override.pop("name")
            if name in merged:
                for key, value in override.items():
                    setattr(merged[name], key, value)
            else:
                merged[name] = SectionDef(name=name, **override)

        return list(merged.values())
```

## Dynamic Data Binding

```python
class DataBinder:
    def __init__(self):
        self.transformers: dict[str, callable] = {}
        self._register_defaults()

    def _register_defaults(self):
        self.register("pivot", self._pivot_transform)
        self.register("aggregate", self._aggregate_transform)
        self.register("filter", self._filter_transform)
        self.register("sort", self._sort_transform)

    def register(self, name: str, transformer: callable):
        self.transformers[name] = transformer

    def bind(self, data: list[dict],
             template: ReportTemplate) -> dict:
        bound = {"raw_data": data}

        for section in template.sections:
            if section.condition and not self._evaluate_condition(
                section.condition, data
            ):
                continue

            section_data = data
            transforms = section.config.get("transforms", [])
            for transform in transforms:
                t_name = transform.pop("type")
                if t_name in self.transformers:
                    section_data = self.transformers[t_name](
                        section_data, **transform
                    )

            bound[section.name] = section_data

        return bound

    def _pivot_transform(self, data: list[dict],
                         index: str, columns: str,
                         values: str, agg: str = "sum") -> list[dict]:
        import pandas as pd
        df = pd.DataFrame(data)
        pivot = df.pivot_table(
            index=index, columns=columns,
            values=values, aggfunc=agg
        ).reset_index()
        return pivot.to_dict("records")

    def _aggregate_transform(self, data: list[dict],
                             group_by: str,
                             metrics: list[dict]) -> list[dict]:
        import pandas as pd
        df = pd.DataFrame(data)
        agg_dict = {m["column"]: m.get("function", "sum")
                    for m in metrics}
        result = df.groupby(group_by).agg(agg_dict).reset_index()
        return result.to_dict("records")

    def _filter_transform(self, data: list[dict],
                          field: str, operator: str,
                          value: Any) -> list[dict]:
        ops = {
            "eq": lambda x: x == value,
            "ne": lambda x: x != value,
            "gt": lambda x: x > value,
            "gte": lambda x: x >= value,
            "lt": lambda x: x < value,
            "lte": lambda x: x <= value,
            "in": lambda x: x in value,
            "contains": lambda x: value in str(x)
        }
        op_func = ops.get(operator)
        if not op_func:
            raise ValueError(f"Unknown operator: {operator}")
        return [row for row in data if op_func(row.get(field))]

    def _sort_transform(self, data: list[dict],
                        by: str, ascending: bool = True) -> list[dict]:
        return sorted(data, key=lambda x: x.get(by, ""),
                      reverse=not ascending)

    def _evaluate_condition(self, condition: str,
                            data: list[dict]) -> bool:
        try:
            return bool(eval(condition, {"__builtins__": {}},
                             {"len": len, "data": data}))
        except Exception:
            return False
```

## Branding and Theming

```python
class ThemeManager:
    def __init__(self):
        self.themes: dict[str, Theme] = {}

    def define_theme(self, name: str, config: dict):
        self.themes[name] = Theme(
            name=name,
            primary_color=config.get("primary", "#2563eb"),
            secondary_color=config.get("secondary", "#7c3aed"),
            font_family=config.get("font", "Inter, sans-serif"),
            font_sizes=config.get("font_sizes", {
                "title": 24, "heading": 18,
                "body": 13, "small": 11
            }),
            colors=config.get("colors", {
                "header_bg": "#1e3a5f",
                "header_text": "#ffffff",
                "row_even": "#f8fafc",
                "row_odd": "#ffffff",
                "border": "#e2e8f0",
                "positive": "#10b981",
                "negative": "#ef4444",
                "warning": "#f59e0b"
            }),
            logo_url=config.get("logo_url"),
            footer_text=config.get("footer_text",
                "Confidential - For Internal Use Only")
        )

    def apply_theme(self, template_source: str,
                    theme_name: str) -> str:
        theme = self.themes.get(theme_name)
        if not theme:
            raise ThemeNotFoundError(f"Theme {theme_name} not found")

        css_vars = f"""
        <style>
        :root {{
            --primary: {theme.primary_color};
            --secondary: {theme.secondary_color};
            --font-family: {theme.font_family};
            --title-size: {theme.font_sizes["title"]}px;
            --heading-size: {theme.font_sizes["heading"]}px;
            --body-size: {theme.font_sizes["body"]}px;
            --small-size: {theme.font_sizes["small"]}px;
            --header-bg: {theme.colors["header_bg"]};
            --header-text: {theme.colors["header_text"]};
            --row-even: {theme.colors["row_even"]};
            --row-odd: {theme.colors["row_odd"]};
            --border: {theme.colors["border"]};
            --positive: {theme.colors["positive"]};
            --negative: {theme.colors["negative"]};
            --warning: {theme.colors["warning"]};
        }}
        </style>
        """

        if theme.logo_url:
            logo_html = (
                f'<img src="{theme.logo_url}" '
                f'style="height:40px;margin-bottom:10px;">'
            )
            template_source = template_source.replace(
                "<!-- LOGO -->", logo_html
            )

        footer = theme.footer_text
        template_source = template_source.replace(
            "{{ footer_text | default('Confidential - For Internal Use Only') }}",
            footer
        )

        return css_vars + template_source
```

## Conditional Sections

```python
class ConditionalSectionEngine:
    def evaluate_section_visibility(self, section: SectionDef,
                                    context: dict) -> bool:
        if not section.condition:
            return True

        safe_context = SafeDict(context)
        try:
            result = eval(
                section.condition,
                {"__builtins__": {}},
                dict(safe_context)
            )
            return bool(result)
        except Exception as e:
            logging.warning(f"Condition eval failed: {e}")
            return False

    def filter_sections(self, sections: list[SectionDef],
                        context: dict) -> list[SectionDef]:
        return [
            s for s in sections
            if self.evaluate_section_visibility(s, context)
        ]

class SafeDict(dict):
    def __getitem__(self, key):
        if key.startswith("_"):
            raise KeyError(f"Access to {key} is restricted")
        return super().__getitem__(key)
```

## Template Testing

```python
class TemplateTester:
    def __init__(self, engine: JinjaTemplateEngine):
        self.engine = engine
        self.test_cases: list[TestCase] = []

    def add_test_case(self, name: str, template: str,
                      context: dict, expected: str | None = None):
        self.test_cases.append(TestCase(
            name=name, template=template,
            context=context, expected=expected
        ))

    def run_all(self, sample_data: dict) -> list[TestResult]:
        results = []
        for case in self.test_cases:
            try:
                output = self.engine.render_string(
                    case.template, {**sample_data, **case.context}
                )

                checks = {
                    "no_error": True,
                    "rendered_not_empty": len(output.strip()) > 0,
                }

                if case.expected:
                    checks["matches_expected"] = case.expected in output

                checks["no_unresolved_vars"] = "{{" not in output
                checks["no_undefined"] = "undefined" not in output.lower()

                results.append(TestResult(
                    name=case.name, passed=all(checks.values()),
                    checks=checks, output_length=len(output)
                ))
            except Exception as e:
                results.append(TestResult(
                    name=case.name, passed=False,
                    error=str(e)
                ))

        return results

    def preview(self, template: ReportTemplate,
                data: dict) -> str:
        bound = DataBinder().bind(data, template)
        return self.engine.render(template.source, bound)
```

## Key Points

- Report templates separate layout, styling, and content for maintainability and reusability.
- Jinja2 is a versatile template engine supporting filters, inheritance, and conditional rendering.
- Templates can be stored in databases for versioning and access control or on filesystems for simplicity.
- Version management supports rollback to previous template states for recovery and audit.
- Template composition allows building complex reports from reusable component blocks.
- Data binding with transform pipelines (pivot, aggregate, filter, sort) adapts raw data to template structure.
- Theming systems provide consistent branding across all reports with minimal per-report configuration.
- Conditional sections enable dynamic show/hide logic based on runtime data evaluation.
- Template testing with sample data validates rendering before production use.
