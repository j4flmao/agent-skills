# Brand Consistency

## Brand Asset Management

| Asset Type | Format | Storage | Versioning |
|------------|--------|---------|------------|
| Logo (primary) | SVG, PNG, EPS | Asset library | Semantic version |
| Logo (variants) | SVG, PNG | Per usage context | Linked to primary |
| Color swatches | .ase, .clr | Design tool library | Per brand refresh |
| Typography | WOFF2, TTF | CDN + local | Per typeface version |
| Icon set | SVG sprite | npm package | Semver |
| Templates | Figma, AI, PSD | Design tool | Per project |

### Brand Audit Checklist

| Check | Frequency | Owner |
|-------|-----------|-------|
| Logo usage audit | Quarterly | Brand team |
| Color compliance | Monthly | Design team |
| Typography consistency | Monthly | Design team |
| Voice/tone review | Quarterly | Content team |
| Asset freshness | Per release | Dev team |
| Third-party brand usage | Annually | Legal |

## Brand Consistency Rules

```python
class BrandValidator:
    def __init__(self, brand_config):
        self.config = brand_config

    def validate_colors(self, hex_colors: list[str]):
        palette = set(self.config["colors"]["primary"])
        palette.update(self.config["colors"]["secondary"])
        palette.update(self.config["colors"]["neutral"])
        for color in hex_colors:
            if color.lower() not in palette:
                return False, f"Color {color} not in brand palette"
        return True, "All colors valid"

    def validate_logo_usage(self, filename: str, context: str):
        allowed = self.config["logo"][context]
        if filename not in allowed:
            return False, f"Logo {filename} not approved for {context}"
        return True, "Logo usage valid"
```

## Documentation Standards

| Section | Required Content | Format |
|---------|-----------------|--------|
| Brand story | Mission, vision, values | Narrative text |
| Logo specs | Clear space, min size, incorrect examples | Visual + rules |
| Color palette | Hex, RGB, CMYK, Pantone values | Table |
| Typography | Font stack, weights, line heights | Specs + examples |
| Voice & tone | Principles, do/don't, examples | Guide |
| Application | Business cards, email, social templates | Templates |

## Approval Workflow

```
Draft → Design Review → Stakeholder Review → Final Approval
                                                    ↓
                                              Asset Library
                                                    ↓
                                              Distribution
```

- All brand assets require 2 approvals before publishing
- External-facing materials require legal review
- Asset library is source of truth (no local copies)
- Brand deviations require exception request and CMO approval

## Brand Audit Process

| Phase | Activities | Duration |
|-------|-----------|----------|
| Discovery | Gather all brand assets, interview stakeholders | 2 weeks |
| Review | Compare against brand guidelines, identify gaps | 1 week |
| Report | Document findings, prioritize issues | 1 week |
| Remediation | Fix issues, update assets | 2-4 weeks |
| Verification | Re-audit remediated items | 1 week |

### Audit Scoring
```python
class BrandAudit:
    def __init__(self):
        self.categories = {
            "logo": {"weight": 0.25, "checks": ["usage", "clear_space", "color_variants"]},
            "color": {"weight": 0.20, "checks": ["hex_match", "usage_correct", "contrast"]},
            "typography": {"weight": 0.20, "checks": ["font_match", "sizing", "licensing"]},
            "voice": {"weight": 0.15, "checks": ["tone", "vocabulary", "consistency"]},
            "imagery": {"weight": 0.20, "checks": ["style", "quality", "consistency"]},
        }

    def score_category(self, category, results):
        passed = sum(1 for r in results.values() if r)
        total = len(results)
        return (passed / total) * 100 if total > 0 else 0

    def total_score(self, scores):
        return sum(scores[c] * self.categories[c]["weight"] for c in scores)
```
