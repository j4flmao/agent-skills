---
name: design-brand-identity
description: >
  Use when the user asks about brand identity, brand guidelines, visual identity, brand strategy, logo usage, brand voice, or brand consistency. Do NOT use for: visual design (design-visual-design), design systems (design-design-systems), or UX research (design-ux-research).
version: "2.0.0"
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
Define and maintain a cohesive brand identity — visual language, voice, personality, and guidelines — that communicates a product's or company's values consistently across all touchpoints. Brand identity bridges strategy (who you are, why you exist) and execution (how you look, sound, and feel).

## Agent Protocol

### Trigger
Exact user phrases: "brand identity", "brand guidelines", "visual identity", "brand strategy", "logo usage", "brand voice", "brand consistency", "brand book", "style guide", "corporate identity".

### Input Context
- Company name, mission, vision, values
- Target audience demographics and psychographics
- Competitive landscape (3-5 key competitors)
- Existing brand assets (logo, colors, typefaces, marketing materials)
- Product type and industry (B2B SaaS, consumer retail, healthcare, etc.)
- Brand personality archetype (if defined)

### Output Artifact
Brand identity system with mission/values, visual language, voice guidelines, and application rules.

### Completion Criteria
- [ ] Brand mission, vision, and values documented
- [ ] Brand personality defined (5 traits with behavioral examples)
- [ ] Brand voice guidelines with tone parameters and do/don't examples
- [ ] Color palette with primary, secondary, accent, neutral, and semantic colors
- [ ] Typography system with typeface selections, hierarchy, and usage rules
- [ ] Logo usage guidelines (clear space, minimum size, incorrect usage)
- [ ] Visual language rules (photography style, illustration, iconography, motion)
- [ ] Application guidelines (digital, print, environmental)
- [ ] Brand guidelines document structure outlined

### Max Response Length
200 lines of spec, patterns, and guidance.

## Framework/Methodology

### Brand Identity Decision Tree
```
What is the primary brand challenge?
├── No existing identity → Build from strategy
│   → Mission → Values → Personality → Visual Identity → Voice → Guidelines
├── Existing identity is inconsistent → Audit and unify
│   → Brand audit → Gap analysis → Unification → Guidelines → Governance
├── Rebranding or refresh → Evolve with purpose
│   → Strategic rationale → Audience research → Evolution → Rollout plan
└── Need application guidelines → Extend and document
    → Touchpoint audit → Template creation → Usage examples → Exceptions
```

### Brand Identity Process
```
Discovery → Strategy → Visual Identity → Voice & Tone → Guidelines → Application → Governance
   │           │            │               │              │             │            │
   ├ Research  ├ Mission    ├ Logo          ├ Voice       ├ Document    ├ Digital    ├ Reviews
   ├ Audit     ├ Vision     ├ Color         ├ Vocabulary  ├ Rules       ├ Print      ├ Updates
   ├ Analysis  ├ Values     ├ Typography    ├ Tone map    ├ Examples    ├ Environ.   ├ Training
   └ Goals     ├ Persona    ├ Imagery       └ Do/Don't    └ Templates   └ Motion    └ Enforcement
               └ Position   └ Layout
```

### Brand Archetype Framework

| Archetype | Core Desire | Brand Examples | Personality Traits |
|-----------|-------------|----------------|-------------------|
| The Innocent | Safety, simplicity | Dove, Nintendo | Honest, optimistic, pure |
| The Explorer | Freedom, discovery | Jeep, Patagonia | Adventurous, independent |
| The Sage | Truth, knowledge | Google, BBC | Analytical, wise, informed |
| The Hero | Mastery, achievement | Nike, BMW | Courageous, disciplined |
| The Outlaw | Revolution, disruption | Harley-Davidson, Virgin | Rebellious, bold |
| The Magician | Transformation | Disney, Dyson | Visionary, innovative |
| The Everyman | Belonging, connection | IKEA, Target | Relatable, down-to-earth |
| The Lover | Intimacy, passion | Chanel, Godiva | Sensuous, passionate |
| The Jester | Joy, spontaneity | M&M's, Old Spice | Playful, irreverent |
| The Ruler | Control, stability | Rolex, Microsoft | Authoritative, refined |
| The Caregiver | Nurture, protection | Johnson & Johnson | Compassionate, supportive |
| The Creator | Innovation, expression | Lego, Apple | Creative, visionary |

## Workflow

### Step 1: Define Brand Strategy

Brand Mission Statement Template:
```
[Brand Name] exists to [action verb] [target audience] to [achieve outcome] by [unique approach].
```
Example: "Patagonia exists to build the best product, cause no unnecessary harm, and use business to inspire and implement solutions to the environmental crisis."

Brand Values (4-6 core values):
Each value needs a name, a brief definition, and 2-3 behavioral examples of how it manifests.

```yaml
values:
  - name: "Craftsmanship"
    definition: "We obsess over quality in every detail..."
    behaviors:
      - "We ship only when it meets our quality bar"
      - "We invest in tools that elevate our output"
      - "We seek and act on critical feedback"
```

Brand Personality (5 traits on a 1-5 scale):

| Dimension | Low (1) | High (5) |
|-----------|---------|----------|
| Sincerity | Cynical | Wholesome |
| Excitement | Calm | Energetic |
| Competence | Inefficient | Reliable |
| Sophistication | Rustic | Elegant |
| Ruggedness | Delicate | Tough |

### Step 2: Create Visual Identity

Logo Architecture:
- **Wordmark**: Text-only logo (Google, Coca-Cola) — good for unique names
- **Lettermark**: Initials (IBM, HBO) — good for long names
- **Pictorial**: Icon-only (Apple, Twitter) — requires recognition
- **Abstract**: Geometric symbol (Nike, Chase) — flexible, ownable
- **Combination**: Mark + text (Adidas, Burger King) — most common
- **Emblem**: Text inside symbol (Starbucks, NFL) — traditional, cohesive

Logo Rules:
- Clear space: Minimum the height of the logo mark on all sides
- Minimum size: Never scale below [X]px digital, [X]mm print
- Color variations: Full color, single color (black), reversed (white), grayscale
- Background restrictions: Never place on busy backgrounds without clear space
- Prohibited: Stretching, rotating, recoloring, adding effects, rearranging elements

Color Palette Structure:
```yaml
primary:
  main: "#0052CC" (brand blue)
  light: "#4C8CFF"
  dark: "#003399"
secondary:
  main: "#00B8D9" (teal accent)
  light: "#61E0FF"
  dark: "#0085A3"
neutrals:
  100: "#FFFFFF" (white)
  200: "#F4F5F7" (page background)
  300: "#DFE1E6" (borders)
  400: "#7A869A" (secondary text)
  500: "#42526E" (body text)
  600: "#172B4D" (headings)
semantic:
  success: "#36B37E"
  warning: "#FFAB00"
  error: "#FF5630"
  info: "#0065FF"
```

### Step 3: Define Brand Voice

Voice Dimensions:
- **Formal** ↔ **Casual**: Language formality
- **Serious** ↔ **Playful**: Tone weight
- **Respectful** ↔ **Irreverent**: Deference
- **Enthusiastic** ↔ **Matter-of-fact**: Energy level
- **Concrete** ↔ **Abstract**: Specificity

Tone Map (adjust voice by context):

| Context | Tone Description | Example |
|---------|-----------------|---------|
| Error message | Empathetic, direct, helpful | "Something went wrong. We've saved your work and our team is on it." |
| Marketing | Energetic, benefits-focused | "Do more in less time with one-click automation." |
| Onboarding | Encouraging, educational | "Let's get you set up — it only takes 2 minutes." |
| Social media | Conversational, timely | "We heard you! Dark mode is now available. 🌙" |
| Legal | Precise, neutral | As required by regulation, this notice informs you..." |
| Technical docs | Clear, direct, jargon-aware | "The API returns a 200 status code on success." |

Do/Don't Examples:
```
DO: "We're here to help. Reach out anytime."
DON'T: "Feel free to contact our customer service department at your earliest possible convenience."

DO: "Starting at $19/month."
DON'T: "Our pricing begins at the low, low price of $19 per month!!"
```

### Step 4: Create Brand Guidelines

Guidelines Document Structure:
1. **Brand Overview** — Mission, vision, values, personality, positioning statement
2. **Logo** — Primary, secondary, clear space, minimum size, color variations, incorrect usage
3. **Color** — Primary, secondary, neutral, semantic palettes with usage rules and accessibility
4. **Typography** — Typefaces, hierarchy, sizing, usage rules, pairings, web font loading
5. **Imagery** — Photography style, illustration guidelines, iconography, image treatment
6. **Layout** — Grid systems, spacing, composition principles, white space
7. **Voice & Tone** — Voice dimensions, tone map, vocabulary, do/don't examples
8. **Applications** — Email, social, print, presentation, signage, merchandise
9. **Motion** — Animation principles, transitions, loading states, video style
10. **Governance** — Review process, update cycle, exceptions, contacts

### Step 5: Implement and Govern

Brand Audit (quarterly):
- Collect all brand touchpoints (digital, print, environmental)
- Score each against brand guidelines (0=violation, 1=partial, 2=full compliance)
- Identify top 3-5 inconsistencies and create remediation plan
- Track brand consistency score over time

Digital Brand Enforcement:
- Design system tokens enforce color, typography, spacing
- Shared component libraries enforce layout and interaction patterns
- Automated linting checks for brand color usage
- Template-based email, social, and presentation systems

## Common Pitfalls

| Pitfall | Description | Prevention |
|---------|-------------|------------|
| Generic brand | "Quality, innovation, integrity" — every brand says this | Use specific, ownable language tied to real behaviors |
| Inconsistent voice | Different teams use different tone on different channels | Central voice guidelines + channel-specific tone maps |
| Over-designed logo | Too complex, doesn't scale, works only at one size | Test at 16px favicon to 10ft billboard |
| Color overload | 15+ brand colors with no system | Limit core palette to 4-6 colors max |
| Neglecting dark mode | Brand looks wrong on dark backgrounds | Design for light and dark equally |
| Rigid guidelines | No room for context, leading to guideline violations | Include exception rules and usage principles |
| No governance | Guidelines exist but no one enforces them | Assign brand owners, quarterly audits |
| Designing in isolation | Brand doesn't connect with audience | Validate identity concepts with target users |

## Best Practices

| Practice | Rationale |
|----------|-----------|
| Design for flexibility | Brand should work across mediums, sizes, contexts |
| Pattern over prescription | Explain why, not just what — enables good decisions |
| Include anti-patterns | "Don't do this" examples are more effective than "do this" |
| Version your guidelines | Brand evolves — document what changed and why |
| Make guidelines accessible | Searchable, web-based, not a locked PDF |
| Test in context | Brand elements must work in real environments |
| Audit regularly | Brands drift without systematic governance |
| Train the organization | Guidelines only work if people understand them |
| Lead from strategy | Every visual decision connects back to brand strategy |
| Design for extension | Third parties, partners, and co-branding scenarios |

## Templates & Tools

### Brand Brief Template
```yaml
brand_name: "AcmeCorp"
industry: "B2B SaaS — Project Management"
tagline: "Ship faster, together"
mission: "Empower teams to deliver exceptional products on time, every time."
vision: "A world where every team ships with confidence."
target_audience:
  primary: "Engineering managers at 50-500 person companies"
  secondary: "CTOs and VPs of Engineering"
competitive_landscape:
  - "Asana (established, feature-rich)"
  - "Jira (technical, enterprise)"
  - "Linear (fast, developer-focused)"
positioning: "For engineering teams who value speed without sacrificing quality"
personality:
  - "Competent (4/5): Reliable, precise, knows their craft"
  - "Exciting (3/5): Energizing, forward-looking, not boring"
  - "Sincere (4/5): Transparent, honest, no marketing fluff"
  - "Sophisticated (2/5): Clean but not precious"
  - "Rugged (2/5): Sturdy but not rough"
```

### Brand Consistency Scorecard
```yaml
touchpoints:
  - name: "Website hero section"
    owner: "Marketing"
    score: 2  # 0=violation, 1=partial, 2=full compliance
    issues: ["Font weight mismatch on H1"]
  - name: "Mobile app onboarding"
    owner: "Product"
    score: 2
  - name: "Email newsletter"
    owner: "Marketing"
    score: 1
    issues: ["Secondary color used where primary should be"]
overall_score: 5/6 (83%)
```

## Case Studies

### Case Study 1: Brand Unification After Merger
Two SaaS companies merged, each with established but conflicting brand identities. Company A was blue, serious, enterprise-focused. Company B was orange, playful, startup-oriented. The merged brand audit showed 78% inconsistency across touchpoints. The solution was not to blend but to create a third identity — a deep purple primary with a new positioning ("Powerful yet approachable") that neither company owned. The visual identity was entirely new, avoiding favoritism. Post-launch employee satisfaction with brand identity rose from 42% to 89%, and customer surveys showed 34% improvement in brand perception clarity.

Method: Strategy-first rebrand with neutral territory visual identity
Key insight: After mergers, a completely new identity avoids "us vs them" dynamics
Impact: Brand perception clarity +34%, employee satisfaction +47 points

### Case Study 2: Design System Improves Brand Consistency
A 200-person product team had 14 different button styles, 6 different blues, and 8 distinct border radii across products. Brand consistency audits scored below 40%. Implementing a comprehensive design system with brand tokens, component library, and automated linting raised consistency to 95% within 6 months. The design system enforced brand rules at the code level, making violations impossible rather than merely discouraged.

Method: Brand tokens → Component library → Automated enforcement
Key insight: Code-level enforcement is more effective than guideline documentation
Impact: Brand consistency from <40% to 95% in 6 months

## Rules
- Brand must be defined by specific behaviors, not generic adjectives ("quality," "innovation")
- Logo clear space = height of logo mark on all sides (minimum)
- Minimum logo size: 24px digital, 1cm print
- Maximum 2 typeface families in brand typography
- Core palette: 4-6 colors maximum (expand via tints/shades)
- Every color must have a defined usage rule
- Voice guidelines include both do AND don't examples
- Guidelines are living documents — versioned, reviewed quarterly
- All brand touchpoints must pass quarterly consistency audits
- Brand identity must work in both light and dark environments
- Iconography style must be unified (outline, filled, duotone — pick one)
- Photography style guide includes lighting, composition, color treatment, subjects
- Third-party usage requires specific guidelines section (partners, co-branding)
- Brand guidelines must be accessible as a searchable web resource
- Rebrand announcements include rationale, timeline, and migration guide

## Production Considerations

### Brand Governance Workflow
```
Brand asset created → Review against guidelines → Approve → Distribute via brand library → Quarterly audit → Update guidelines
```

**Brand asset library**: Centralize all approved assets in a shared platform (Figma, Brandfolder, Frontify, or simple cloud storage). Structure: `assets/logos/` (primary, secondary, icon, favicon), `assets/icons/` (SVG sources in multiple sizes), `assets/photography/` (approved image library), `assets/templates/` (slide decks, letterhead, social media templates). Version each asset with date and change reason.

**Digital asset management (DAM)**: For organizations with 500+ brand assets, invest in a DAM system (Bynder, Widen, Cloudinary). DAM provides: access control, usage tracking, automated format conversion, expiration dates on seasonal assets, and AI-powered search by color/object.

**Brand approval matrix**:
| Asset Type | Creator | Approver | Turnaround |
|------------|---------|----------|------------|
| Social media graphic | Marketing designer | Brand manager | 4 hours |
| Landing page | Product designer | Brand director | 2 days |
| TV commercial | Agency | VP Marketing + Brand director | 1 week |
| Partner co-branding | Partner team | Brand + Legal | 2 weeks |

### Brand Evolution Playbook
Brands evolve — plan for it. Three types of brand changes:

1. **Tactical refresh** (every 2-3 years): Update color palette, typography, photography style. No logo change. Impact: low. Migration: update design tokens, replace assets.
2. **Strategic evolution** (every 5-7 years): Refine logo (simplify, modernize), evolve voice. Impact: medium. Migration: phased rollout with legacy support.
3. **Full rebrand** (merger/acquisition): New name, logo, identity system. Impact: high. Migration: cutover date with all touchpoints updated simultaneously.

**Migration checklist for brand updates**:
- [ ] Update design tokens in code (CSS, Android XML, iOS asset catalog)
- [ ] Replace all logo files (web, mobile, email, print)
- [ ] Update favicon and app icon
- [ ] Refresh marketing materials (website hero, social profiles, ad creatives)
- [ ] Update email templates and signatures
- [ ] Replace physical signage and print materials
- [ ] Update internal tools (slide templates, docs, intranet)
- [ ] Announce change internally and externally
- [ ] Monitor for deprecated brand usage over 90-day window

### Digital Implementation
**CSS custom properties for brand tokens**:
```css
:root {
  --brand-primary: #0052CC;
  --brand-secondary: #00B8D9;
  --brand-neutral-100: #F4F5F7;
  --brand-font-heading: 'Inter', system-ui, sans-serif;
  --brand-font-body: 'Inter', system-ui, sans-serif;
  --brand-radius: 8px;
  --brand-shadow-sm: 0 1px 3px rgba(0,0,0,0.1);
}
```

**Multi-platform token delivery**: Maintain brand tokens in a single source (JSON/YAML) → generate platform-specific formats using Style Dictionary:
- Web: CSS custom properties + Sass variables
- iOS: Swift constants + asset catalog color set
- Android: XML color resources + Kotlin constants
- Figma: Token Studio plugin sync

## Anti-Patterns

| Anti-Pattern | Symptom | Fix |
|-------------|---------|-----|
| **Brand by committee** | Logo has 5 variations because no one could decide | Assign single decision-maker with design authority |
| **Copycat branding** | Looks like every other startup in the space | Differentiate through authentic personality, not visual trends |
| **Redesigning too often** | Users don't recognize the brand anymore | Lock visual identity for minimum 3 years between evolutions |
| **Brand strategy without execution** | Beautiful guidelines, nothing implemented | Measure adoption rate quarterly; enforce via design system |
| **Execution without strategy** | Looks good but doesn't communicate values | Start every visual decision from "what does this say about us?" |
| **Targeting everyone** | Brand appeals to nobody | Define who you're NOT for — exclusion creates stronger identity |
| **Inconsistent across platforms** | iOS app feels different from web | Design platform-aware but brand-consistent experiences |
| **Designer-only brand ownership** | Non-designers don't understand brand rules | Create a 1-page brand cheat sheet for the whole company |
| **No brand crisis protocol** | Inconsistent response during PR issues | Pre-define tone, approval chain, and templates for crisis communication |
| **Over-designed logo** | Too many details, unreadable at small sizes | Test logo at 16x16px (favicon), 32x32px (app icon), and 1 inch (business card) |

## Context-Aware Brand Application

### Platform Adaptation
Brand must feel native on each platform while remaining consistent:

| Element | Web | iOS | Android | Print |
|---------|-----|-----|---------|-------|
| Typography | System fonts + web fonts | SF Pro + brand font | Roboto + brand font | Brand fonts only |
| Icon style | Outline 2px | Fill with rounded corners | Fill with sharp corners | Outline 2px |
| Spacing | 8px grid | 8-point grid | 8dp grid | 4mm grid |
| Motion | CSS transitions | UIKit animate | Material animation | N/A |
| Shadow | CSS box-shadow | CALayer shadow | Elevation | N/A |

### Accessibility in Brand Application
Brand colors must meet WCAG AA minimums:
- Primary brand color on white: 4.5:1 minimum
- Primary brand color on brand backgrounds: verify with contrast checker
- Provide accessible alternate color pairings for low-contrast brand combinations
- Never use brand colors below 3:1 contrast for text; reserve low-contrast combos for decorative elements only

## Tools & Deliverables

| Deliverable | Format | Audience | Contents |
|------------|--------|----------|----------|
| Brand strategy brief | Slide deck/PDF | Leadership, agency | Mission, values, positioning, competitive differentiation |
| Visual identity guidelines | Web-based + PDF | Designers, developers, partners | Logo, color, typography, imagery, layout rules |
| Voice & tone guide | Web-based | All employees, writers | Vocabulary, tone map, do/don't examples per channel |
| Brand asset kit | ZIP with organized folders | All stakeholders | Logo files (multiple formats), icons, templates |
| Brand cheat sheet | 1-page PDF | All employees | Logo restrictions, colors, fonts, voice rules (condensed) |
| Template library | Figma/PPT/Google Slides | Marketing, sales | Presentation, email, social, document templates |
| Brand audit report | Slide deck/PDF | Leadership | Consistency scores, violations, remediation plan |

## References
  - references/brand-identity-advanced.md — Brand Identity Advanced Topics
  - references/brand-identity-fundamentals.md — Brand Identity Fundamentals
  - references/brand-messaging.md — Brand Messaging and Voice Reference
  - references/brand-touchpoint-audit.md — Brand Touchpoint Audit Reference
  - references/logo-design.md — Logo Design Reference
  - references/visual-identity-guidelines.md — Visual Identity Guidelines Reference
## Handoff
Hand off to `design-visual-design` for visual system implementation. Hand off to `design-design-systems` for token/component implementation. Hand off to `design-ux-research` for audience validation.
## Implementation Patterns

### Observer Pattern for Event Handling
`
interface EventObserver<T> {
  onEvent(event: T): Promise<void>;
}

class EventBus<T> {
  private observers: Set<EventObserver<T>> = new Set();
  subscribe(observer: EventObserver<T>): void {
    this.observers.add(observer);
  }
  unsubscribe(observer: EventObserver<T>): void {
    this.observers.delete(observer);
  }
  async emit(event: T): Promise<void> {
    const results = Array.from(this.observers).map(o => o.onEvent(event));
    await Promise.allSettled(results);
  }
}
`

### Configuration-Driven Approach
`
config:
  defaults:
    timeout: 30s
    retryCount: 3
  overrides:
    production:
      timeout: 60s
      retryCount: 5
    development:
      timeout: 300s
      retryCount: 1
`

## Performance Optimization

### Caching Strategy
Cache hierarchy: L1 (in-memory local) → L2 (distributed Redis/Memcached) → L3 (CDN/Edge).
Cache invalidation: TTL-based (simple, stale), event-based (complex, fresh), write-through (consistent, higher write latency), write-behind (fast writes, eventual consistency).

### Resource Pooling
- Database connections: Pool of reusable connections (HikariCP, pgBouncer)
- HTTP connections: Keep-alive + connection pooling for external calls
- Thread pool: Bounded thread pools for async task execution

### Profiling Methodology
1. Establish baseline with production traffic profile
2. Profile CPU with sampling profiler (pprof, perf, async-profiler)
3. Profile memory with heap dumps and allocation tracking
4. Profile I/O with strace/perf trace for syscall analysis
5. Profile latency with distributed tracing (OpenTelemetry)
6. Identify bottleneck, formulate hypothesis, implement fix
7. Re-profile to verify improvement, repeat

## Security Considerations

### Threat Modeling (STRIDE)
- Spoofing: Identity validation, authentication
- Tampering: Integrity checks, digital signatures
- Repudiation: Audit logs, non-repudiation
- Information disclosure: Encryption, access control
- Denial of service: Rate limiting, resource quotas
- Elevation of privilege: Principle of least privilege

### Supply Chain Security
- Dependency scanning: Snyk, Dependabot, Trivy
- SBOM generation: CycloneDX or SPDX format
- Signed commits: GPG or SSH commit signing
- Artifact verification: Checksum validation, signature verification

### Secrets Management
- Secrets never in code — always in secrets manager (Vault, AWS Secrets Manager)
- Rotation policy: Rotate database credentials every 90 days
- Access audit: Log every secrets access, alert on anomalies
- Encryption at rest and in transit for all secrets
- Principle of least privilege: each service gets only its own secrets

## Architecture Decision Trees

### Brand Architecture Decision Tree
`
Is the product a standalone brand or part of a portfolio?
  ├── Standalone → Full brand identity system from scratch
  └── Portfolio → Does it need to align with parent brand?
       ├── Tight alignment → Sub-brand with visual consistency
       └── Loose alignment → Independent brand with shared values
            Number of target markets?
            ├── Single → One cohesive identity
            └── Multiple → Master brand with market-specific adaptations
`

### Visual Identity Decision Tree
`
What is the primary application context?
  ├── Digital-first → Responsive logo, variable fonts, dark mode support
  ├── Print-first → CMYK color space, PANTONE reference, bleed specifications
  └── Environmental → Large-format scaling, material specifications
       Does the brand need motion identity?
       ├── Yes → Logo animation, loading sequences, transition guidelines
       └── No  → Static identity only, no motion specifications
`
