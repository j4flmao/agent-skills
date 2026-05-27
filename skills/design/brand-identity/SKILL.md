---
name: design-brand-identity
description: >
  Use when the user asks about brand identity, brand guidelines, logo design, brand colors, brand voice, logo systems, visual identity, or branding. Do NOT use for: visual design (design-visual-design), design systems (design-design-systems), or marketing design.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [design, brand-identity, phase-3]
---

# Brand Identity

## Purpose
Create and document brand identity: logo systems, brand guidelines, color palettes, typography, brand voice, and visual consistency across all touchpoints.

## Agent Protocol

### Trigger
- "brand identity", "brand guidelines", "logo design", "brand colors", "brand voice", "visual identity", "branding"
- "brand strategy", "brand audit", "rebrand", "brand refresh"

### Input Context
- Company name, industry, existing brand materials (if any)
- Target audience and brand personality (modern, luxury, playful, serious)
- Deliverables needed (logo, guidelines, full identity system)
- Timeline and budget constraints

### Output Artifact
- Brand identity system document with logo, colors, typography, voice, and usage guidelines
- SVG logo files or descriptions
- Brand guideline document

### Completion Criteria
- [ ] Logo system defined (primary, secondary, icon, monochrome)
- [ ] Color palette defined with hex/rgb values and accessibility checks
- [ ] Typography selected with hierarchy and size scale
- [ ] Brand voice documented with do/don't examples
- [ ] Usage guidelines for all applications
- [ ] Accessibility requirements met (WCAG contrast ratios)

## Workflow

### Brand Identity Components
| Component | Description | Deliverable |
|-----------|-------------|-------------|
| Logo | Primary symbol, horizontal, icon-only | SVG files, usage guide |
| Color palette | Primary, secondary, neutral, accent | Hex/rgb values, usage rules |
| Typography | Primary + secondary typefaces | Font files, size scale |
| Brand voice | Tone, vocabulary, personality | Writing guidelines |
| Imagery | Photo style, illustration style, icons | Style guide |

### Brand Identity Process

#### Step 1: Brand Audit
Assess existing brand materials, competitor brands, and market positioning:
```yaml
brand_audit:
  internal:
    - "Existing logo, collateral, digital presence"
    - "Brand perception surveys from stakeholders"
    - "Current brand usage inconsistencies"
  external:
    - "Top 5 competitor brand analysis"
    - "Industry visual trends"
    - "Target audience preference research"
  positioning:
    - "Brand archetype (Hero, Outlaw, Sage, Innocent, etc.)"
    - "Brand personality dimensions (sincerity, excitement, competence, sophistication, ruggedness)"
    - "Differentiation from competitors"
```

#### Step 2: Brand Strategy Definition
Define the strategic foundation before visual design:
```yaml
brand_strategy:
  mission: "What the brand exists to do"
  vision: "What the brand aspires to become"
  values: "3-5 core values that guide decisions and behavior"
  personality: "3-5 adjectives describing brand character"
  audience:
    primary: "Main target demographic with psychographics"
    secondary: "Adjacent audience segments"
  positioning_statement: "For [target], [brand] is the [category] that [point of difference]"
```

#### Step 3: Visual Identity Design
Design the visual system starting with the logo lockup:
```yaml
logo_system:
  primary_lockup:
    - "Full logo: wordmark + icon/symbol (horizontal)"
    - "Used on: website header, business cards, social media banners"
  secondary_lockup:
    - "Stacked or vertical variant"
    - "Used on: square spaces, app icons, favicon"
  icon_symbol:
    - "Standalone symbol or letterform mark"
    - "Used on: avatar, favicon, mobile icon, watermark"
  monochrome:
    - "Black and white versions of all lockups"
    - "Used on: single-color printing, embroidery, grayscale contexts"
  clear_space:
    - "Minimum clear space = height of the logo mark"
    - "No text, graphics, or edges within clear space"
  minimum_size:
    - "Print: 1 inch wide"
    - "Digital: 32px wide (icon), 120px wide (full lockup)"
  incorrect_usage:
    - "Do not stretch, recolor arbitrarily, add effects, rotate, or place on busy backgrounds"
```

#### Step 4: Color System Design
Build a systematic color palette:
```yaml
color_system:
  primary:
    usage: "Main brand color for key elements (logo, buttons, headlines)"
    accessibility: "Must pass WCAG AA contrast against white and black"
  secondary:
    usage: "Supporting color for accents, secondary elements"
    relationship: "Complementary, analogous, or triadic to primary"
  neutral:
    usage: "Text, backgrounds, borders, UI surfaces"
    range: "Light gray (#F5F5F5) through dark charcoal (#333333)"
  semantic:
    success: "Green for positive states"
    warning: "Amber for caution states"
    error: "Red for error states"
    info: "Blue for informational states"
  application:
    "Hero backgrounds": "Primary or secondary at 10-20% opacity"
    "Text": "Dark neutral (#1A1A1A) for body, light neutral for dark mode"
    "Buttons": "Primary for CTA, secondary for ghost, neutral for tertiary"
```

#### Step 5: Typography System
Select and specify typefaces:
```yaml
typography_system:
  primary_typeface:
    selection_criteria: ["Legibility at multiple sizes", "Multiple weights available", "License covers usage"]
    usage: "Headlines, subheadlines, navigation"
    weights: ["Light", "Regular", "Medium", "Bold", "Black"]
  secondary_typeface:
    selection_criteria: ["Readability at small sizes", "Character set coverage", "Web performance"]
    usage: "Body text, labels, captions, long-form content"
    weights: ["Regular", "Medium", "Bold"]
  size_scale:
    display: "48-72px — hero headlines"
    h1: "36-48px — page titles"
    h2: "28-36px — section headers"
    h3: "22-28px — card titles"
    body: "16-18px — paragraph text"
    small: "13-14px — labels, captions"
  line_height:
    headings: "1.2-1.3"
    body: "1.5-1.7"
```

#### Step 6: Brand Voice Guidelines
Document the brand's verbal identity:
```yaml
brand_voice:
  principles:
    - "Principle 1: Clear over clever — prioritize understanding over wordplay"
    - "Principle 2: Confident but not arrogant — authoritative tone without superiority"
    - "Principle 3: Human and approachable — write like a person, not a corporation"
  vocabulary:
    always_use: ["Brand-approved terms and product names"]
    never_use: ["Jargon, buzzwords, negative competitor mentions"]
  tone_by_channel:
    marketing: "Aspirational, benefit-focused, energetic"
    support: "Empathetic, solution-oriented, patient"
    technical: "Precise, direct, assumption-free"
    social: "Conversational, timely, engaging"
```

### Logo System
- Primary logo (full color, horizontal)
- Secondary logo (stacked or vertical variant)
- Icon/symbol (simplified for small spaces)
- Monochrome (black and white versions)

### Brand Guidelines Structure
1. Brand story and values
2. Logo: usage, clear space, minimum size, incorrect usage
3. Color: primary, secondary, neutral, semantic, accessibility requirements
4. Typography: typefaces, hierarchy, line heights, examples
5. Voice and tone: principles, do/don't, examples
6. Imagery: photo direction, illustration style, iconography
7. Applications: business cards, social media, presentations

## References
  - references/brand-consistency.md — Brand Consistency
  - references/brand-guidelines.md — Brand Guidelines Structure
  - references/brand-identity-advanced.md — Brand Identity Advanced Topics
  - references/brand-identity-fundamentals.md — Brand Identity Fundamentals
  - references/brand-voice.md — Brand Voice Guide
  - references/logo-systems.md — Logo Systems
## Handoff
Hand off to `design-visual-design` for UI implementation of brand guidelines. Hand off to `design-design-systems` for component-level brand application. Hand off to `frontend-universal-css` for CSS variable implementation of color and typography tokens.
