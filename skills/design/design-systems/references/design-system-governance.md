# Design System Governance

## What Is Design System Governance?

Governance is the set of processes, roles, and decision-making frameworks that ensure a design system remains consistent, high-quality, and aligned with product needs. Without governance, design systems accumulate stale components, conflicting patterns, and technical debt.

### Core Governance Principles

1. **Explicit ownership** -- Every token, component, and pattern has a named owner or team
2. **Documented process** -- Contribution, review, and deprecation workflows are written down
3. **Transparent decisions** -- Why a pattern was chosen (or rejected) is recorded in ADRs
4. **Measurable quality** -- Test coverage, a11y compliance, and adoption metrics are tracked
5. **Regular cadence** -- Reviews, releases, and syncs happen on a schedule, not ad-hoc

## Governance Models

### Model A: Centralized (Single Team)

A dedicated design system team owns all tokens, components, and documentation. Product teams consume the system but do not contribute directly.

```
Pros:
- High consistency
- Fast decision-making
- Coherent vision

Cons:
- Bottleneck for new components
- Team may be disconnected from product needs
- Scaling requires hiring more DS team members

Best for: Teams of 3-10 product teams, < 100 engineers
```

**Staffing**: 1 design lead, 2-3 frontend engineers, 1 technical writer (shared).

### Model B: Federated (Distributed Contributors)

A core team maintains the system infrastructure and review process, but product teams contribute components and patterns. The core team reviews and accepts contributions.

```
Pros:
- Scales with organization growth
- Product teams have ownership
- Real-world patterns feed into the system

Cons:
- Inconsistency if review is lax
- Requires documented contribution process
- Core team becomes a review bottleneck

Best for: Teams of 10-50 product teams, 100-500 engineers
```

**Staffing**: 1 design lead, 2 frontend engineers (core), 1 rotating contributor from each product team.

### Model C: Hybrid (Core + Guild)

A small core team maintains infrastructure, token architecture, and critical components. A cross-team guild (one representative per product team) meets regularly to review contributions, share patterns, and align on direction.

```
Pros:
- Best of both models
- Guild creates shared ownership
- Scales to very large organizations

Cons:
- Meeting overhead (bi-weekly guild syncs)
- Requires strong guild lead
- Decisions may take longer

Best for: Teams of 50+ product teams, 500+ engineers
```

**Staffing**: 1 DS lead (guild chair), 2-3 core engineers, 1 representative per product team (part-time, ~10% allocation).

## Governance Roles

### Design System Lead

- Owns the vision and roadmap for the design system
- Chairs the review board / guild
- Makes final decisions on contentious proposals
- Reports to VP of Design or CTO

### Core Engineers

- Maintain infrastructure (Style Dictionary, Storybook, build pipeline)
- Implement and review core components
- Manage releases and versioning
- Write contribution documentation

### Product Team Representatives (Federated / Hybrid)

- Advocate for their team's needs
- Contribute components and patterns
- Review contributions from other teams
- Communicate DS changes to their team

### Accessibility Specialist

- Audits all components for WCAG compliance
- Defines accessible patterns and guidelines
- Reviews all new components for a11y

### Technical Writer

- Maintains documentation
- Writes contribution guides
- Creates migration guides for breaking changes

## Contribution Process

### Step 1: Proposal

Anyone can propose a new component or token. The proposal must include:

1. **Problem statement**: What gap does this fill?
2. **Usage frequency**: How many teams would use it? How many instances?
3. **Existing alternatives**: Why do existing components not cover this?
4. **Rough API sketch**: Props, variants, behaviors
5. **Design mockups**: Figma screenshots or spec

**Template**:

```
# New Component Proposal: {Name}

## Problem
{1-2 sentences describing the gap}

## Usage
- Teams that need this: {list}
- Estimated instances: {number}
- Priority: {critical / high / medium / low}

## API
```tsx
<{Name}
  variant="primary | secondary"
  size="sm | md | lg"
  onChange={(value) => void}
/>
```

## Design
[Figma link]

## Existing Alternatives
{Why existing components don't work}
```

### Step 2: Review

The review board evaluates proposals against these criteria:

| Criterion | Must Have | Nice to Have |
|-----------|-----------|--------------|
| Need by 2+ teams | Yes | |
| Clear API design | Yes | |
| Accessibility spec | Yes | |
| Design mockups | Yes | |
| Usage metrics forecast | | Yes |
| Performance budget | | Yes |

**Review outcomes**:
- **Accepted**: Move to implementation
- **Returned for revision**: Specific changes needed
- **Rejected**: With explanation, recorded in ADR

### Step 3: Implementation

```yaml
Requirements:
- Unit tests covering all variants and states
- Accessibility tests (axe-core, no violations)
- Storybook story for every variant and state
- Design documentation (Figma component spec)
- Token audit (no hardcoded values)
- Performance check (bundle size impact)
```

### Step 4: Review Gate

The implementation must pass:

1. **Code review**: Core team reviews implementation
2. **Design review**: Design lead reviews visual output
3. **Accessibility review**: a11y specialist audits
4. **Storybook review**: Documentation completeness check
5. **Bundle size review**: Size impact within budget

### Step 5: Release

Components are released according to the versioning policy:

- **Alpha**: Available in canary/pre-release, API may change
- **Beta**: Stable API, limited adoption, gathering feedback
- **Stable**: Full test coverage, documented, recommended for all teams

## Component Lifecycle

```
Proposal -> Accepted -> In Development
                              |
                              v
                           Alpha (canary)
                              |
                              v
                           Beta (feedback)
                              |
                              v
                           Stable (recommended)
                              |
                              v
                        Deprecated (superseded)
                              |
                              v
                           Removed
```

### Deprecation Process

1. Mark component as deprecated in Storybook and add JSDoc `@deprecated`
2. Add console.warn in development mode
3. Create migration guide to replacement
4. Keep deprecated component for 2 minor versions
5. Remove in next major version

## Versioning Strategy

### Semantic Versioning for Design Systems

| Change | Version Bump | Examples |
|--------|-------------|----------|
| Breaking token change | Major | Renaming `color-primary` to `color-brand` |
| Breaking component API | Major | Removing a prop, changing default variant |
| Breaking visual change | Major | Changing base spacing from 4px to 8px |
| New token | Minor | Adding `color-accent` |
| New component | Minor | Adding a `DatePicker` component |
| New variant | Minor | Adding `size="xl"` to Button |
| Bug fix | Patch | Fixing a CSS specificity issue |
| Documentation update | Patch | Fixing a typo in Storybook |
| Dependency update | Patch | Upgrading internal build deps |

### Release Cadence

- **Patch releases**: As needed (bug fixes)
- **Minor releases**: Bi-weekly (new components, features)
- **Major releases**: Quarterly (breaking changes, visual refresh)

## Token Governance

### Adding New Tokens

A new token must follow the naming convention and fit into the existing hierarchy:

```
Request:
  Token: --color-bg-inverse
  Category: color
  Concept: bg
  Variant: inverse
  Value: #111827 (primitive reference)
  Justification: "Needed for inverse backgrounds on highlighted cards"
```

### Audit Process

Quarterly token audit:

- Count total tokens by category
- Identify unused tokens (track via grep or tooling)
- Identify duplicate tokens (same value, different name)
- Measure token adoption (what % of CSS values reference tokens vs hardcoded)

## Adoption Metrics

### Tracking Adoption

| Metric | How to Measure | Target |
|--------|---------------|--------|
| Component adoption | % of pages using DS components | > 80% |
| Token adoption | % of CSS values using tokens | > 90% |
| DS version lag | How many versions behind are consumers | < 2 versions |
| Component coverage | % of product UI covered by DS | > 70% |
| Contribution pipeline | Proposals in review / accepted / released | Balanced |
| Accessibility pass rate | Components passing axe-core audit | 100% |

### Measurement Tools

```bash
# Find hardcoded color values (not using tokens)
grep -r '#[0-9a-fA-F]\{3,8\}' src/components/ --include="*.css" --include="*.tsx"

# Count DS component usage
grep -r '<Button' src/pages/ | wc -l
grep -r '<Card' src/pages/ | wc -l

# Check DS version in package.json
Get-Content package.json | Select-String '"@company/ui"'
```

## Communication and Community

### Design System Newsletter

A monthly internal newsletter keeps stakeholders informed:

- **New releases**: What shipped, what changed
- **Deprecation warnings**: What is being phased out
- **Adoption metrics**: How the system is being used
- **Tips and tricks**: Best practices discovered by teams
- **Spotlight**: A team that used the DS in an interesting way

### Office Hours

Weekly or bi-weekly open sessions where:

- Product teams ask questions
- Core team demo upcoming features
- Teams share patterns they have built
- Migration questions are answered

### DS Champions Program

Designate one person per product team as a DS champion:

- Attends guild meetings
- Reviews DS-related PRs from their team
- Disseminates DS updates to their team
- Provides feedback to core team
- 10% time allocation

## Breaking Change Management

### Communication Timeline

| Time | Action |
|------|--------|
| T - 4 weeks | Announce upcoming breaking change in newsletter |
| T - 2 weeks | Share migration guide with DS champions |
| T - 1 week | Demo migration in office hours |
| T - 0 | Release major version |
| T + 2 weeks | Remove old version from Figma library |
| T + 4 weeks | Archive old version from codebase |

### Migration Guide Format

```
# Migration Guide: v1.x to v2.0

## Summary
{1-2 sentences about what changed and why}

## Breaking Changes
1. **Button variant renamed**: `primary` -> `filled`, `outline` -> `outlined`
   - Before: `<Button variant="primary">`
   - After: `<Button variant="filled">`
   - Migration script: `npx @company/ui-codemod button-variant-v2`

2. **Spacing tokens removed**: `--spacing-7`, `--spacing-9`
   - Replace `--spacing-7` with `--spacing-8`
   - Replace `--spacing-9` with `--spacing-8`

## Codemods Available
- `button-variant-v2`: Renames button variants
- `spacing-migration`: Replaces removed spacing tokens

## Manual Migration Steps
1. Update package: `npm install @company/ui@^2.0.0`
2. Run codemods: `npx @company/ui-codemod apply-all`
3. Check for build errors: `npm run build`
4. Visual regression test: `npm run test:visual`
```

## Design System Review Checklist

- [ ] Every component has a named owner
- [ ] Contribution process is documented and accessible
- [ ] Token naming convention is documented and enforced
- [ ] Versioning policy is documented and followed
- [ ] Breaking changes follow communication timeline
- [ ] Adoption metrics are tracked and reported monthly
- [ ] Deprecated components have migration guides
- [ ] Accessibility audits happen before every major release
- [ ] Cross-team guild/board meets bi-weekly or monthly
- [ ] Figma and code libraries are versioned together
