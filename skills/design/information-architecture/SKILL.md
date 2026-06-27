---
name: design-information-architecture
description: >
  Use when the user asks about information architecture, sitemaps, user flows, content hierarchy, navigation design, content organization, labeling, or taxonomy. Do NOT use for: UX research (design-ux-research), visual design (design-visual-design), or prototyping (design-prototyping).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [design, information-architecture, phase-3]
---

# Information Architecture

## Purpose
Design information architecture: organize content, create navigation systems, define taxonomies, design user flows, and ensure findability across digital products. The goal is to help users find information and complete tasks with minimum cognitive load by creating intuitive, user-centered content structures.

## Agent Protocol

### Trigger
Exact user phrases: "information architecture" "sitemap" "user flow" "content hierarchy" "navigation" "content organization" "labeling" "taxonomy" "card sorting" "tree testing" "findability" "IA audit".

### Input Context
- What type of product or website is being designed?
- Who are the primary user segments and their information needs?
- What content exists and what content is planned?
- What are the key user tasks and goals?
- What are the business objectives (conversion, engagement, retention)?
- What is the current IA (if redesigning) and its known issues?
- What competitive or reference IAs exist?

### Output Artifact
Information architecture specification with content audit, sitemap, navigation design, taxonomy, and user flows.

### Response Format
```
## Information Architecture Plan
### Content Audit Summary
Total pages: {N} | Gaps: {list} | Duplicates: {list}

### Sitemap Structure
Level 1: {category} → Level 2: {subcategory} → Level 3: {page}

### Navigation System
Primary: {top / side / hub-and-spoke}
Secondary: {utility / breadcrumb / footer}
Contextual: {cross-links / related content / tags}

### Taxonomy
Type: {flat / hierarchical / faceted / tags}
Categories: {list}
Labels: {list}
```

No preamble. No postamble. No explanations.

### Completion Criteria
- [ ] Content audit completed with inventory and gap analysis
- [ ] User research conducted to understand mental models
- [ ] Card sorting conducted (open or closed) with results analyzed
- [ ] Tree testing conducted with findability rate measured
- [ ] Sitemap created showing full content hierarchy
- [ ] Navigation system designed (primary, secondary, utility)
- [ ] Taxonomy defined with labels and categorization rules
- [ ] User flows documented for key tasks
- [ ] IA validated with usability testing
- [ ] Responsive/adaptive navigation behavior defined

### Max Response Length
150 lines of spec and structure.

## Framework/Methodology

### IA Design Framework

The IA design process follows the Four Circles model:

```
Content Context
  ↓
User Needs & Behaviors  →  IA Design  →  Navigation & Labeling
  ↑
Business Context & Constraints
```

The intersection of these three circles (content, users, context) defines the optimal IA.

### Findability Principles

| Principle | Definition | Application |
|-----------|------------|-------------|
| Predictability | Users can guess where content lives | Clear labels, consistent patterns |
| Findability | Content can be located by browsing or search | Multiple access paths to same content |
| Understandability | Content organization makes sense to users | Mental model alignment |
| Consistency | Similar content is organized similarly | Same patterns across sections |
| Accessibility | Content is available to all users regardless of ability | Semantic structure, keyboard nav |

### Cognitive Load in IA

| IA Factor | Cognitive Load Impact | Mitigation |
|-----------|----------------------|------------|
| Navigation depth (>3 levels) | Users lose orientation | Breadcrumbs, visual hierarchy |
| Navigation breadth (>7 items per level) | Choice overload | Prioritize top items, group secondary |
| Unclear labels | Users waste time clicking | User-tested labeling, familiar terms |
| Multiple competing navigation systems | Confusion | Clear primary navigation, distinct secondary |
| Inconsistent organization across sections | Mental effort to re-learn | Apply same IA principles site-wide |

### Information Architecture Maturity

| Level | Name | Characteristics |
|-------|------|-----------------|
| 1 | Organic | Content organized by team structure, no intentional IA |
| 2 | Hierarchical | Basic category tree, top-down organization |
| 3 | User-centered | IA informed by user research (card sorting, tree testing) |
| 4 | Adaptive | IA adapts to user behavior and context |
| 5 | Predictive | Anticipates user needs, proactive content delivery |

## Workflow

### Step 1: Content Audit
Inventory all content, identify gaps and duplicates. Categorize content by type, owner, format, and status. Quantify volume to understand scale of IA challenge.

Content audit template:

| # | URL/Path | Title | Content Type | Format | Owner | Status | Notes |
|---|----------|-------|-------------|--------|-------|--------|-------|
| 1 | /products/widget | Widget Pro | Product page | HTML | Product team | Published | Needs IA review |
| 2 | /help/faq | FAQ | Support | HTML | Support team | Published | Multiple duplicates |

Content audit analysis outputs:
- Total content volume (pages, documents, media files)
- Content type distribution (product, support, marketing, legal)
- Orphaned content (no parent, no navigation path)
- Duplicate content (same information in multiple locations)
- Content gaps (missing content for known user needs)
- Stale content (not updated in >12 months)

### Step 2: User Research for IA
Understand mental models and findability patterns. Methods specific to IA research:

| Method | Purpose | Participants | Timeline | Output |
|--------|---------|-------------|----------|--------|
| Card sorting (open) | Understand how users naturally group content | 20-50 | 1 week | Category clusters, label suggestions |
| Card sorting (closed) | Validate proposed categories | 20-50 | 1 week | Category assignment accuracy |
| Tree testing | Test findability in proposed navigation | 20-50 | 1 week | Findability rate, directness score |
| First-click testing | Test if users click correct navigation item | 20-50 | 3-5 days | First-click accuracy |
| Reverse card sorting | Test if users can place content in correct categories | 20-50 | 1 week | Categorization accuracy |
| Content needs survey | Identify what content users need | 50-200 | 1-2 weeks | Content priority ranking |

### Step 3: Card Sorting
Group content into logical categories based on user mental models.

Open card sorting process:
1. Prepare content cards (40-80 items for manageable sessions)
2. Use tools: OptimalSort, Miro, UserZoom, or physical cards
3. Instruct participants to group cards and label groups
4. Analyze using similarity matrix to identify clusters
5. Identify: high-agreement groups (strong categories), ambiguous cards (don't fit anywhere), labels that resonate

Closed card sorting process:
1. Provide predefined categories
2. Ask participants to assign each content item to a category
3. Calculate: % correct assignment, categories with confusion
4. Identify: categories that need renaming, content that needs recategorizing

Analysis outputs:
- Dendrogram: visual tree of content clusters
- Similarity matrix: % of participants who grouped each pair together
- Category labels: the most common labels suggested by participants
- Mismatches: content that consistently gets placed in unexpected categories

### Step 4: Tree Testing
Validate navigation structure by testing findability of specific content items.

Tree testing process:
1. Build text-only tree from proposed navigation
2. Define test tasks: "Find information about X"
3. Participants navigate tree to find each item
4. Measure: success rate, directness (did they go straight there), time, path
5. Identify: items with low findability, mislabeled categories, wrong placement

Targets:
- Findability rate: >80% for critical content, >70% for secondary content
- Directness: >60% direct paths
- Time: users should find most items within 10-20 seconds

Iteration: After first round of tree testing, revise IA and re-test. Each round typically improves findability by 10-20%.

### Step 5: Sitemap Creation
Visual hierarchy of pages and sections. Sitemap formats:

- Visual sitemap: Diagram showing page relationships (spreadsheet, diagram tool)
- XML sitemap: Search engine crawlable listing (developers)
- Content matrix: Table showing content by category and page

Sitemap conventions:
```
Level 1          Level 2         Level 3          Level 4
Home
  Products
    Widget Pro
      Features   (features list page)
      Pricing    (pricing page)
      FAQ        (product FAQ)
    Widget Lite
      Features
      Pricing
  Support
    Documentation
      Getting Started
      Advanced Guide
      API Reference
    Contact
      Email Support
      Live Chat
  About
    Team
    Careers
    Press
```

### Step 6: Navigation Design
Primary, secondary, utility, breadcrumb, and contextual navigation systems.

Navigation design principles:
- Expose 80% of user tasks in top two levels of navigation
- Highlight current location (visual indicator, breadcrumb)
- Use progressive disclosure for deep hierarchies
- Provide consistent navigation across all pages
- Minimize number of clicks to reach any content (3-click rule is a guideline, not law)
- Offer multiple paths to same content when appropriate

Navigation patterns detailed:

| Pattern | Implementation | Max Items | Best For |
|---------|---------------|-----------|----------|
| Top horizontal nav | Categories across top, dropdown for sub-items | 5-7 top-level items | Marketing sites, broad content |
| Side navigation (expandable) | Expandable/collapsible tree in sidebar | Unlimited nested levels | SaaS applications, documentation |
| Hub-and-spoke | Central hub, each spoke is a self-contained flow | 3-5 spokes | Task-focused workflows, checkout |
| Search-dominant | Search as primary access, browsing secondary | N/A (search handles depth) | Large content volumes, knowledge bases |
| Faceted navigation | Filters and attributes for content refinement | Unlimited filters | E-commerce, catalogs, databases |
| Mega menu | Large dropdown showing multiple levels at once | 20-50 items visible | Large product catalogs, complex sites |
| Progressive disclosure | Show more options on interaction | Any number | Settings, account management |

### Step 7: Taxonomy Design
Define content classification system.

Taxonomy types:

- Flat taxonomy: Simple list of categories (best for <20 categories)
  - Pros: Simple to implement, easy to understand
  - Cons: Limited scalability, single perspective
  - Use when: Small content volume, single user type

- Hierarchical taxonomy: Parent-child category relationships
  - Pros: Intuitive, supports depth, well-understood
  - Cons: Rigid, can force unnatural groupings
  - Use when: Broad content scope, multiple levels of detail

- Faceted taxonomy: Multi-dimensional classification
  - Pros: Flexible, supports multiple user needs
  - Cons: Complex to implement, requires metadata
  - Use when: Large content volumes, diverse user needs

- Tags: Flexible, user-generated categorization
  - Pros: Adaptive, low-maintenance
  - Cons: Inconsistent, no hierarchy
  - Use when: User-generated content, blogs

### Step 8: User Flows
Document key task paths through the IA. Each flow shows:
- Entry point (how user arrives)
- Decision points
- Navigation path through content
- Completion (success or failure)
- Alternative paths (search, direct navigation)

User flow template:
```
Task: {user goal}
Entry: {entry point}
Primary Path:
  Step 1: {action} → {destination}
  Step 2: {action} → {destination}
  Step 3: {action} → {destination}
Alternative Paths:
  Path B: {alternative route}
  Search: {search query} → {results} → {selection}
Failure: {what happens if user can't complete}
```

## Common Pitfalls

| Pitfall | Description | Prevention |
|---------|-------------|------------|
| Mirroring org chart | Content organized by company structure, not user needs | Research user mental models via card sorting |
| Overly deep hierarchy | Content buried under too many levels | Keep maximum 3-4 levels; use mega menus for breadth |
| Ambiguous labels | Labels that don't clearly describe content | Test labels in tree testing; use familiar terms |
| One-size-fits-all IA | Same structure for different user segments | Consider persona-specific navigation or personalization |
| Ignoring search behavior | Designing for browsing when users search | Include search prominently; use search analytics to inform IA |
| Inconsistent labeling | Different terms for same concept across the site | Create label taxonomy with approved terms and variations |
| Content migration without IA review | Moving content to new design without restructuring | Always conduct content audit and IA review during redesign |
| Too many navigation systems | Users overwhelmed by choice | Distinguish primary, secondary, and contextual navigation |
| Skipping mobile IA | Desktop IA that doesn't adapt to mobile | Design mobile-first IA with progressive disclosure |
| No IA governance | IA degrades over time without ownership | Assign IA owner; establish content publishing guidelines |

## Best Practices

| Practice | Rationale |
|----------|-----------|
| Test IA with real users before building | IA changes after build are expensive; validate early |
| Use user language for labels | Industry jargon confuses users; use terms they use |
| Provide multiple access paths | Users arrive differently; offer browse, search, and related links |
| Keep navigation consistent across pages | Users should not have to re-learn navigation on each page |
| Use breadcrumbs for deep hierarchies | Shows location and enables navigation up the hierarchy |
| Design for scanning, not reading | Users scan; use descriptive headings, clear categories, visual hierarchy |
| Prioritize content by user needs | Most-needed content should be easiest to find |
| Plan for content growth | IA should accommodate 2-3x content volume without restructuring |
| Use analytics to inform IA decisions | Search queries, page views, and navigation patterns reveal IA issues |
| Establish IA governance | Assign ownership, create content standards, review IA annually |

## Templates & Tools

### Content Audit Template (Spreadsheet)
```
URL | Page Title | Content Type | Category | Format | Owner | Last Updated | Status | Notes
/help/getting-started | Getting Started Guide | Help | Onboarding | Article | Docs Team | 2025-06-01 | Published |
/products/pro/features | Pro Features | Product | Products | HTML | Product | 2025-05-15 | Needs Update |
```

### Card Sorting Results Analysis
```
Task: {sorting task description}
Participants: {N}
Method: {Open / Closed / Hybrid}

Top Category Clusters (by agreement %):
1. {Category Label} — {X%} agreement — {N items assigned}
2. {Category Label} — {X%} agreement — {N items assigned}

Ambiguous Items (no clear category):
- {Item}: equally distributed across {categories}
- {Item}: {X%} categorized differently from expected

Suggested Labels:
- {Original term} → {Suggested term} ({X%} of participants)
- {Original term} → {Suggested term} ({X%} of participants)
```

### Tree Testing Report Template
```
Navigation Structure Tested: {version}
Participants: {N}
Tasks: {N}

Overall Findability Rate: {X%}
Average Directness: {X%}
Average Time: {X}s

Tasks with Findability <80%:
1. {Task} — {X%} findability — Issue: {common wrong path}
   Action: {IA change needed}

Tasks with Best Findability:
1. {Task} — {X%} findability — {path used}
```

### IA Tools

| Tool | Purpose | Pricing |
|------|---------|---------|
| OptimalSort | Card sorting (online, remote) | Paid/free tier |
| Treejack | Tree testing (online, remote) | Paid/free tier |
| Miro/Mural | Collaborative diagramming, card sorting | Freemium |
| UserZoom | Integrated IA research platform | Paid |
| LucidChart | Sitemap and flow diagramming | Freemium |
| FlowMapp | Sitemap creation, user flows | Paid/free tier |
| Dynalist | Content inventory and hierarchy | Freemium |
| Slickplan | Visual sitemap builder | Paid |

## Case Studies

### Case Study 1: E-commerce IA Redesign Increases Revenue 18%
An online retailer with 50,000+ products organized them by manufacturer (the company's org structure). Card sorting with 35 shoppers revealed users thought in terms of use case (home office, gaming, professional) and price range, not brand. The redesigned IA used use-case categories as primary navigation with brand as a filter. Findability in tree testing improved from 55% to 85%, and revenue increased 18% after launch as users found products more easily.

Method: Open card sorting (35 participants) + tree testing (40 participants)
Key insight: User mental model was use-case based, contrary to org chart structure
Impact: Findability 55% to 85%, revenue +18%

### Case Study 2: SaaS Documentation IA Reduces Support Tickets 30%
A B2B SaaS company had support documentation organized by feature name (matching internal engineering names). Tree testing showed only 40% findability for common tasks. After restructuring around user goals (getting started, troubleshooting, integrations, account management), findability improved to 82%. Support tickets for "how to" questions dropped 30% as users found self-serve answers.

Method: Tree testing (50 participants) before and after IA restructure
Key insight: Feature-name organization meant nothing to users; goal-based organization was intuitive
Impact: Support tickets -30%, documentation findability 40% to 82%

### Case Study 3: Government Website IA with Universal Design
A government services website was organized by department (35+ departments, each with their own navigation). User research showed citizens don't know which department handles their issue. The redesign used a life-event IA (birth, marriage, moving, death, business) as primary, with department as secondary. Findability for common tasks increased from 35% to 78%, and task completion time decreased by 60%.

Method: Large-scale card sorting (200 participants across demographics) + tree testing
Key insight: Life-event IA maps to citizen mental models better than government structure
Impact: Findability 35% to 78%, task time -60%

## Rules
- IA must be based on user research, not team structure assumptions.
- Labels must use user language, not internal terminology.
- Navigation depth should not exceed 4 levels without strong justification.
- Every content item must have a single canonical location in the IA.
- Critical content must be findable within 2 clicks of home page.
- Navigation must be consistent across all pages (same labels, same order).
- Breadcrumbs must be provided for hierarchies deeper than 2 levels.
- Search must be available on every page for content-heavy sites.
- IA must be validated with tree testing before implementation.
- 80% findability rate is the minimum acceptable threshold.
- Card sorting requires minimum 20 participants for statistically meaningful results.
- Content audit must be conducted before any IA redesign of existing products.
- Sitemap must show all pages, including utility and support pages.
- Mobile IA must be designed independently, not adapted from desktop.
- IA governance must be established with a designated owner and review cadence.

## References
  - references/content-modeling.md — Content Modeling Reference
  - references/ia-methods.md — Information Architecture Methods Reference
  - references/information-architecture-advanced.md — Information Architecture Advanced Topics
  - references/information-architecture-fundamentals.md — Information Architecture Fundamentals
  - references/navigation-design.md — Navigation Design Reference
  - references/sitemap-taxonomy.md — Sitemaps and Taxonomy Reference
  - references/ia-card-sorting-tree-testing.md — IA Card Sorting and Tree Testing
  - references/ia-navigation-design.md — IA Navigation Design
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

## Production Considerations

### Deployment Checklist
- [ ] Configuration validated against schema before startup
- [ ] Health check endpoints registered and monitored
- [ ] Graceful shutdown with draining period (30s timeout)
- [ ] Resource limits configured (CPU, memory, file descriptors)
- [ ] Log level set appropriate for environment
- [ ] Metrics endpoint secured and exposed
- [ ] Rate limiting configured per-tier
- [ ] TLS certificates valid and auto-renewing
- [ ] Database migrations run as separate deployment step
- [ ] Feature flags ready for gradual rollout

### Monitoring and Alerting
| Metric | Threshold | Severity | Action |
|--------|-----------|----------|--------|
| Error rate | > 1% over 5min | Critical | Page on-call |
| p99 latency | > 2s over 5min | Warning | Investigate |
| Throughput drop | > 50% over 1min | Critical | Check upstream |
| Queue depth | > 1000 over 1min | Warning | Scale consumers |
| Disk usage | > 85% | Warning | Clean or expand |
| Memory usage | > 90% heap | Critical | Restart or scale |

## Anti-Patterns

| Anti-Pattern | Symptom | Root Cause | Solution |
|-------------|---------|------------|----------|
| Premature optimization | Complex code for no measured benefit | Guessing instead of profiling | Measure first, optimize based on data |
| Copy-paste reuse | Duplicate code across codebase | Lack of abstraction | Extract shared logic into libraries |
| Gold-plating | Features with no current requirement | Over-engineering | YAGNI — build what's needed now |
| Magical thinking | Assumptions without validation | Skipping error handling | Handle all failure modes explicitly |

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

### Navigation Structure Decision Tree
`
How many top-level sections?
  ├── 3-5 → Flat navigation (all sections accessible from top)
  ├── 5-8 → Mega menu or hub-and-spoke with sub-navigation
  └── 8+ → Search-dominant with faceted navigation
       Is content primarily task-oriented or exploratory?
       ├── Task → Goal-focused navigation, shortcut paths
       └── Exploratory → Browse-focused, category-based discovery
            Mobile vs desktop usage ratio?
            ├── Mobile-first → Bottom navigation, hamburger menu, progressive disclosure
            └── Desktop-first → Sidebar or top navigation with visible labels
`

### Content Organization Decision Tree
`
Is the content structured or unstructured?
  ├── Structured → Database-driven, taxonomy essential, metadata critical
  └── Unstructured → Full-text search primary, tagging secondary
       Does the content need versioning?
       ├── Yes → Content management system with revision history
       └── No  → Static content with periodic updates
            Multi-language support needed?
            ├── Yes → Language-independent IA with locale-specific adaptations
            └── No  → Single-language IA, no i18n considerations
`
