---
name: design-prototyping
description: >
  Use when the user asks about prototyping, wireframing, interactive mockups, fidelity levels, prototyping tools, user testing prototypes, or design validation. Do NOT use for: visual design (design-visual-design), UX research (design-ux-research), or design systems (design-design-systems).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [design, prototyping, phase-3]
---

# Prototyping

## Purpose
Create prototypes at appropriate fidelity levels — from low-fidelity wireframes to high-fidelity interactive mockups — to validate design decisions, test usability, communicate interactions, and align stakeholders before committing to development. A prototype answers a specific question at the lowest cost.

## Agent Protocol

### Trigger
Exact user phrases: "prototype", "wireframe", "mockup", "interactive prototype", "fidelity", "click-through", "design validation", "prototyping tool", "rapid prototyping", "paper prototyping".

### Input Context
- What question the prototype needs to answer (feasibility, usability, desirability, viability)
- Target audience for testing (internal stakeholders, users, developers)
- Timeline and resources available (hours, days, weeks)
- Existing design artifacts (sketches, user flows, information architecture)
- Fidelity requirements (lo-fi, mid-fi, hi-fi) based on stage of the project
- Platform constraints (web, mobile, desktop, hardware)

### Output Artifact
Interactive prototype at the appropriate fidelity level, with defined user flows and test scenarios.

### Completion Criteria
- [ ] Prototype purpose defined (what question are we answering?)
- [ ] Fidelity level selected and justified
- [ ] Key user flows mapped and prioritized
- [ ] Prototype created with core interactions functional
- [ ] Test scenarios and tasks defined
- [ ] Stakeholder walkthrough completed
- [ ] Feedback collected and documented
- [ ] Next steps / iteration plan defined
- [ ] Handoff artifacts prepared (annotations, specs, assets)

### Max Response Length
200 lines of framework, patterns, and guidance.

## Framework/Methodology

### Prototyping Decision Tree
```
What is the primary question?
├── Is the concept valuable? → Low-fidelity concept testing
│   Paper sketches, wireframes, storyboards — test desirability
├── Can users navigate this flow? → Mid-fidelity flow testing
│   Click-through wireframes, task flows — test usability
├── Does the interaction feel right? → High-fidelity interaction testing
│   Animated transitions, micro-interactions — test feel
├── Will this work technically? → Technical/proof-of-concept prototype
│   Code prototype, functional MVP — test feasibility
└── Should we invest in building this? → Live-data prototype
    Functional prototype with real data — test viability
```

### Fidelity Level Selection Matrix

| Fidelity | Time | Tools | Tests | Audience |
|----------|------|-------|-------|----------|
| Low (Paper) | Minutes | Pen, paper, whiteboard | Flow validation, concept screening | Internal, early-stage |
| Low (Digital) | Hours | Balsamiq, Whimsical, Excalidraw | Layout, content hierarchy | Team, early stakeholders |
| Mid (Static) | Hours-days | Figma, Sketch, Adobe XD | Visual hierarchy, readability | Stakeholders, dev review |
| Mid (Clickable) | Days | Figma prototyping, Framer, Axure | Task completion, navigation | User testing |
| High (Interactive) | Days-weeks | Framer, Protopie, Principle | Micro-interactions, transitions | Stakeholder sign-off |
| High (Code) | Weeks | React, Flutter, SwiftUI | Performance, feasibility | Dev team, production |

### Fidelity Guidelines by Phase

```
Discovery:        Paper sketches → flow diagrams
Define:           Digital wireframes → click-through prototype
Develop:          High-fidelity mockups → interactive prototype
Deliver:          Annotated specs → code prototype
```

## Workflow

### Step 1: Define Prototype Scope

Prototype Brief Template:
```yaml
question: "Can users complete the checkout flow without errors?"
fidelity: "mid-fi (clickable wireframes)"
scope:
  flows:
    - "Add item to cart → checkout → payment → confirmation"
    - "Apply promo code → see updated total"
  out_of_scope:
    - "Account creation flow (separate prototype)"
    - "Product search and browse (existing flows)"
test_scenarios:
  - "Add a $49 item to cart, apply code SAVE10, and complete purchase"
  - "Try to checkout with an empty cart and see what happens"
success_metrics:
  - "Task completion rate >80% without assistance"
  - "Time on task <3 minutes"
  - "Error recovery without starting over"
```

### Step 2: Build Low-Fidelity Prototypes

Paper Prototyping:
- Materials: Paper, markers, sticky notes, scissors
- Process: Sketch key screens, cut out movable elements (dropdowns, modals), test by physically moving pieces
- Best for: Early concept exploration, team workshops, rapid iteration
- Pro tip: Use different colored paper for different screen states

Digital Wireframing:
- Tools: Balsamiq, Whimsical, Excalidraw, Figma (wireframe kits)
- Style: Grayscale, placeholder text, generic icons, no real content
- Focus: Layout, hierarchy, content structure, navigation
- Key principle: If the wireframe communicates the structure, it's done

```yaml
wireframe_conventions:
  text: "Use lorem ipsum or [bracketed descriptions]"
  images: "Box with X or labeled rectangle"
  interactive_elements: "Distinct border or underline"
  hierarchy: "Size and weight differences, no real typography"
  consistency: "Same element = same representation every time"
```

### Step 3: Build Mid-Fidelity Prototypes

Screenshot → Interactive: Link wireframe screens together with clickable hotspots.
- Define clickable areas (buttons, links, menu items)
- Connect screens with transitions (none or simple fade)
- Add basic hover/active states on interactive elements
- Annotate assumptions and decisions for stakeholder input

Task Flow Mapping:
```yaml
flow: "Password Reset"
screens:
  - id: "login"
    description: "Login screen with 'Forgot password?' link"
    interactions:
      - trigger: "Click 'Forgot password?'"
        action: "Navigate to reset-request"
  - id: "reset-request"
    description: "Enter email address form"
    interactions:
      - trigger: "Submit valid email"
        action: "Navigate to reset-confirmation"
      - trigger: "Submit empty/invalid email"
        action: "Show inline error on email field (same screen)"
  - id: "reset-confirmation"
    description: "Check your email message with link back to login"
```

### Step 4: Build High-Fidelity Prototypes

Interactive Prototyping Tools & Capabilities:

| Tool | Interactivity | Animation | Collaboration | Code Export |
|------|---------------|-----------|---------------|-------------|
| Figma | On-click, overlay, scroll, conditionals | Smart animate, transitions | Real-time, comments, dev handoff | CSS, inspect |
| Framer | React components, states, variables | Spring, transition, keyframes | Version history, sharing | React, TypeScript |
| Protopie | Triggers, multi-condition, sensors | Auto-animate, 3D, native feel | Review link | Video, GIF |
| Principle | Driver, scroll, drag | Native-quality animations | Single file | No code export |
| Axure | Conditional logic, variables, adaptive | Basic transitions | Team projects | HTML, Word, specs |

High-Fidelity Prototyping Rules:
- Use real content whenever possible (gives realistic reading time, reveals truncation issues)
- Match final visual design (colors, typography, spacing from design system)
- Implement core flows only (don't prototype every edge case)
- Document micro-interactions (hover states, transitions, loading)
- Consider: dark mode, responsive behavior, error states, empty states

Micro-Interaction Documentation:
```yaml
interaction: "Button hover → pressed → success"
element: "Submit button (primary)"
states:
  default: "Solid blue bg, white text, border-radius 8px"
  hover: "Darker blue bg, cursor pointer, slight scale 1.02"
  active: "Even darker bg, scale 0.98, no shadow"
  loading: "Spinner replaces text, button disabled, no hover"
  success: "Button turns green, checkmark icon, text 'Saved!'"
transition:
  duration: "200ms"
  easing: "ease-in-out"
  property: "background-color, transform"
```

### Step 5: Prototype Testing and Validation

Test Preparation:
1. Define 3-5 specific tasks for test participants
2. Write a neutral script (no leading questions, no hints)
3. Set up recording (screen + face for reaction capture)
4. Prepare prototype (reset state, known starting point)
5. Define success criteria per task

Usability Test Metrics:
- **Task success rate**: Did they complete it? (binary or scale)
- **Time on task**: How long did it take? (seconds, compared to baseline)
- **Error rate**: How many mistakes? (clicks on wrong element, navigation errors)
- **Clicks to completion**: Number of interactions before success
- **System Usability Scale (SUS)**: Standardized 10-question survey after testing
- **Net Promoter Score (NPS)**: "Would you recommend this to a colleague?"

### Step 6: Handoff

Prototype Handoff Checklist:
- [ ] Design specs generated (measurements, colors, typography)
- [ ] Assets exported (icons, images, @2x @3x)
- [ ] Interactive behaviors documented (hover, active, loading, error, empty)
- [ ] Responsive breakpoints defined
- [ ] Content guidelines provided (character limits, truncation rules)
- [ ] Accessibility notes included (focus order, ARIA labels, keyboard shortcuts)
- [ ] Prototype URL shared with development team
- [ ] Prototype version and date noted

## Common Pitfalls

| Pitfall | Description | Prevention |
|---------|-------------|------------|
| Too much fidelity too early | Spending days on pixel-perfect mockups before validating concept | Start with lo-fi, increase fidelity only as needed |
| Prototyping everything | Every state, every edge case, every screen | Scope to the question being answered |
| Perfect-data syndrome | Only testing with ideal data (short text, perfect images) | Test with real data, edge cases, error conditions |
| Stakeholder-only testing | Only showing to execs, not real users | Test with actual target users as early as possible |
| Confusing prototype with product | Treating a prototype as production-ready code | Clearly mark as prototype, set expectations |
| Ignoring technical feasibility | Prototyping something that can't be built | Include technical review before hi-fi prototyping |
| No test scenarios | Building prototype without knowing what to test | Define test tasks BEFORE building prototype |
| Over-polishing interactions | Spending hours on a micro-interaction that nobody notices | Prioritize core flow polish over edge case delight |

## Best Practices

| Practice | Rationale |
|----------|-----------|
| Prototype to learn, not to present | The goal is answers, not approval |
| Match fidelity to question | Lo-fi for concept, hi-fi for feel and sign-off |
| Use real content | Reveals layout, truncation, and reading time issues |
| Prototype only what's needed | An incomplete prototype that teaches something is better than a complete one that doesn't |
| Test with real users | Internal stakeholders are not representative users |
| Iterate fast | A prototype is a hypothesis, not a deliverable |
| Document assumptions | What was decided, what was deferred, what needs validation |
| Include edge cases | Error states, empty states, loading states |
| Plan for the handoff | Annotations, specs, and assets save development time |
| Version your prototypes | Multiple rounds of testing produce multiple prototypes |

## Templates & Tools

### Prototype Test Plan Template
```yaml
project: "Checkout Redesign"
date: "2026-06-01"
participants: "5-8 users matching target persona"
method: "Moderated remote usability testing"
tasks:
  - name: "Complete purchase with promo code"
    scenario: "You found a $79 item you want. Apply code WELCOME20 and complete the purchase."
    success_criteria: "Reaches confirmation screen with discounted total"
    notes: "Observe if user finds promo code field or searches for it"
  - name: "Recover from payment error"
    scenario: "Try to pay with an expired card and see what happens"
    success_criteria: "User understands the error and can retry with different card"
```

### Prototype Review Checklist
- [ ] Prototype answers the specific question it was built for
- [ ] Major user flows are represented
- [ ] Error states, empty states, loading states included
- [ ] Real or realistic content used
- [ ] Interactive elements have correct behavior (hover, click, transition)
- [ ] Responsive behavior included (if relevant)
- [ ] Dark mode included (if relevant)
- [ ] Accessibility basics covered (focus indicators, color contrast)
- [ ] Test tasks defined with success criteria
- [ ] Feedback gathered and documented

## Case Studies

### Case Study 1: Paper Prototyping Saves $50k in Development
A fintech startup spent 3 weeks building a high-fidelity Figma prototype for a new investment flow, only to discover in user testing that 7/10 users didn't understand the core concept. The team then paper-prototyped 8 different onboarding approaches in 2 days and tested them all. One approach tested at 9/10 comprehension. Total savings: $50k of development on the wrong approach, and 3 weeks versus 3 days to reach the same insight.

Method: Lo-fi paper prototyping → rapid iteration → user testing
Key insight: Fidelity correlates inversely with iteration speed — use lo-fi while questions remain
Impact: $50k saved, iteration time 3 weeks → 3 days

### Case Study 2: Clickable Prototype Reveals Navigation Blindness
A SaaS dashboard prototype worked perfectly in stakeholder review but failed in user testing: 8/12 users couldn't find the settings panel. The settings icon was in the top-right header, a common pattern the design team assumed was obvious. A click-through wireframe prototype costing 4 hours to build revealed this issue before any visual design was done. The fix — moving settings to the sidebar — required only a wireframe update, not a full redesign.

Method: Mid-fi click-through prototype → user testing → structural fix
Key insight: Common UI patterns to designers are invisible to users
Impact: 4 hours of prototyping saved 40+ hours of hi-fi redesign

## Rules
- Prototype fidelity must match the question being asked (lo-fi → concept, hi-fi → feel)
- Maximum 3 core flows per prototype — scope tightly
- Use real content in hi-fi prototypes (reveals issues that lorem ipsum hides)
- All prototypes include: loading, empty, error, and success states for key flows
- Prototypes are throwaway by nature — don't treat them as production artifacts
- Test with 5-8 real target users minimum per iteration
- Define test scenarios and success metrics BEFORE building the prototype
- Document what the prototype intentionally does NOT include (scope boundaries)
- A prototype that doesn't get tested is a mockup, not a prototype
- Always validate prototype assumptions with data or user feedback before proceeding to development
- Version your prototypes — maintain a changelog of what changed between iterations
- Handoff should include annotations, specs, and exported assets for development

## Prototyping Tools Deep Dive

### Tool Selection Matrix

| Tool | Learning Curve | Fidelity | Interactivity | Collaboration | Platform Support | Pricing |
|------|---------------|----------|---------------|---------------|------------------|---------|
| Figma | Low | Mid-High | Medium (smart animate, overlay, scroll, conditionals) | Excellent (real-time, comments) | Web, mobile, desktop | Free tier, $12/editor/month |
| Framer | Medium | High | High (React components, states, variables, spring) | Good (version history, share links) | Web, desktop | Free tier, $15/editor/month |
| ProtoPie | Medium-High | High | Very High (sensors, multi-condition, 3D, haptic) | Medium (review link only) | Desktop, mobile | Free tier, $29/month |
| Axure | High | Mid-High | High (conditional logic, variables, adaptive views) | Good (team projects) | Desktop | $29/month |
| Principle | Low | Very High | Medium (driver-based, native quality animation) | Poor (single file, no co-editing) | Mac only | $129 one-time |
| Sketch | Low | Mid-High | Medium (smart animate) | Medium (Sketch Cloud, handoff) | Mac only | $10/month |
| Penpot | Low | Mid | Low (basic linking) | Good (open source, self-host) | Web | Free (open source) |
| Balsamiq | Very Low | Low | None (static wireframes) | Medium (project sharing) | Web, desktop | $12/month |
| Excalidraw | Very Low | Very Low | None | Good (live collaboration) | Web | Free |

### Tool Decision Tree
```
Primary prototyping need?
├── Collaborative, design-to-dev handoff → Figma
│   Best for: most product teams, design systems, end-to-end workflow
├── High-fidelity interactions with code export → Framer
│   Best for: interaction-heavy prototypes, developer handoff via React
├── Advanced conditional logic + sensors → ProtoPie
│   Best for: mobile gesture testing, multi-device interactions, IoT
├── Complex enterprise workflows with data logic → Axure
│   Best for: large enterprise apps, logic-heavy workflows, government
├── Native-quality animation on Mac → Principle
│   Best for: micro-interaction prototypes, animation spec creation
└── Quick low-fi wireframes → Balsamiq / Excalidraw / Pen and paper
    Best for: early ideation, workshops, rapid iteration
```

## Prototyping Process Framework

### Fidelity Progression Model
```
Week 1                    Week 2                    Week 3
[Paper sketches]  →  [Clickable wireframes]  →  [High-fidelity prototype]
    5 iterations          3 iterations             2 iterations
    User testing          User testing             Stakeholder sign-off
```

Each phase answers a different question:
1. **Paper sketches**: "Is this the right concept?" — test with 3-5 internal users
2. **Clickable wireframes**: "Can users navigate this flow?" — test with 5-8 target users
3. **High-fidelity prototype**: "Does the interaction feel right?" — test for sign-off

### Rapid Iteration Cycle
```
Define question → Build prototype → Test with 5 users → Analyze findings → Iterate
      ↓                                                                 ↑
      └────────────────── Repeat until question is answered ──────────────┘
```

Each cycle should take 1-3 days. If a cycle takes longer, the scope is too large or fidelity is too high. Reduce scope (fewer flows) or fidelity (lower fidelity, faster changes).

### Testing Protocol Per Fidelity

**Low-fidelity testing**:
- "Walk me through what you think this screen is showing"
- "What would you do next?"
- "Where would you click to find X?"
- Focus on: conceptual understanding, task flow, content hierarchy

**Mid-fidelity testing**:
- Scenario-based tasks: "You need to reset your password from the login screen"
- Measure: task completion, time on task, navigation path
- Focus on: navigation, labeling, content findability

**High-fidelity testing**:
- "Try to complete this purchase using a promo code"
- Measure: task completion, error rate, satisfaction (SEQ/SUS)
- Focus on: visual hierarchy, interaction feel, micro-interactions, error recovery

## Production Considerations

### Prototype Handoff Standards

Handoff artifacts for development:
1. **Design specs**: Measurements, spacing, colors, typography — auto-generated from Figma/Xcode/Framer
2. **Assets**: Export at 1x, 2x, 3x for mobile; SVG for icons; optimize raster images
3. **Interaction specification**: For each interaction: trigger, animation, duration, easing, state transitions
4. **Responsive behavior**: How layout adapts to breakpoints; what stacks, what hides, what transforms
5. **Accessibility notes**: Focus order, ARIA labels, keyboard shortcuts, screen reader announcements
6. **Content guidelines**: Character limits, truncation behavior, empty states, error messages

### Prototype to Production Gap Analysis

Common gaps between prototype and shipped product:
- **Missing states**: Error, empty, loading, success states are often prototyped only for the "happy path"
- **Real content**: Lorem ipsum hides truncation, wrapping, and overflow issues
- **Performance**: Prototypes don't reveal loading times, animation jank, or memory issues
- **Device diversity**: A prototype on a designer's MacBook Pro doesn't show how it feels on a budget Android phone
- **Network conditions**: No latency, no disconnection, no API errors in prototypes

**Gap mitigation checklist**:
- [ ] All interactive component states prototyped (hover, active, focus, disabled, loading, error, empty)
- [ ] Real or near-real content used (character lengths match production data)
- [ ] Prototype tested on target devices (not just design tool preview)
- [ ] Loading, empty, and error states included for every data-driven screen
- [ ] Keyboard and screen reader navigation verified for core flows
- [ ] Dark mode / high contrast mode checked
- [ ] Slow network simulation reviewed (throttle to 3G)

## Anti-Patterns

| Anti-Pattern | Symptom | Fix |
|-------------|---------|-----|
| **Over-fidelity** | Spending 2 weeks on pixel-perfect mockups before validating concept | Start with paper, validate concept, increase fidelity only when question changes |
| **Stakeholder-only testing** | Showing to execs instead of real users | Test with 5 target users before stakeholder reviews |
| **Perfect data trap** | Only testing with ideal content (short text, perfect images) | Test with real data including edge cases, long text, broken images |
| **Prototype drift** | Prototype keeps growing, never gets tested, becomes a design spec | Set a timebox (max 3 days) per iteration; test or throw away |
| **Feature creep in prototype** | Adding features that weren't in scope because "it would be cool" | Anchor every addition to the prototype's original question |
| **Missing state blindness** | Only building the happy path | For each screen, list: loading, empty, error, success, partial states |
| **Handoff without context** | Developers get screenshots and have to guess interactions | Annotate every interaction: trigger, animation, state transition |
| **One prototype to rule them all** | Trying to validate concept, usability, and visual design in one prototype | Separate concept prototypes (lo-fi) from visual prototypes (hi-fi) |
| **Prototype as requirements** | Assuming the prototype is complete as a specification | Supplement prototype with written specs for logic, validation, edge cases |
| **Ignoring development constraints** | Prototyping interactions that are technically impossible | Include technical review before finalizing high-fidelity prototype |

## Deliverables Checklist

### Low-Fidelity Deliverables
- [ ] Paper sketches or digital wireframes for each screen
- [ ] Task flow diagrams showing navigation paths
- [ ] Annotations explaining interaction logic
- [ ] Test scenarios and task scripts

### Mid-Fidelity Deliverables
- [ ] Clickable wireframe prototype (linked screens with hotspots)
- [ ] User flow documentation with decision points
- [ ] Content hierarchy and labeling decisions
- [ ] Navigation structure and labeling rationale
- [ ] Usability test results with task completion rates

### High-Fidelity Deliverables
- [ ] Interactive prototype with micro-interactions
- [ ] Visual design spec (colors, typography, spacing, icons)
- [ ] Asset exports organized by platform and density
- [ ] Interaction annotations per component
- [ ] Responsive behavior documentation
- [ ] Accessibility notes and ARIA patterns
- [ ] Handoff URL shared with development team

## References
  - references/high-fidelity-prototyping.md — High-Fidelity Prototyping Reference
  - references/low-fidelity-prototyping.md — Low-Fidelity Prototyping Reference
  - references/prototyping-advanced.md — Prototyping Advanced Topics
  - references/prototyping-fundamentals.md — Prototyping Fundamentals
  - references/prototyping-testing.md — Prototyping Testing Reference
  - references/prototyping-tools.md — Prototyping Tools Reference
## Handoff
Hand off to `design-ux-research` for usability test design. Hand off to `design-visual-design` for visual refinement. Hand off to `design-accessibility` for WCAG compliance audit.
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

### Prototype Fidelity Decision Tree
`
What is the goal of the prototype?
  ├── Concept validation → Low-fidelity (wireframes, paper sketches)
  ├── Usability testing → Medium-fidelity (interactive, limited visuals)
  └── Stakeholder approval → High-fidelity (polished UI, real content, animations)
       How much interactivity is needed?
       ├── Click-through only → Static screens with links (Figma prototyping)
       ├── Conditional logic → Variable-based interactions (Figma variables, Protopie)
       └── Real data simulation → Code prototype (React, Framer, Webflow)
`

### Tool Selection Decision Tree
`
Who needs to edit the prototype?
  ├── Designers only → Figma (collaborative, developer handoff built-in)
  ├── Cross-functional team → Framer (design + code in same tool)
  └── Developers + Designers → Code prototype (Next.js, Storybook)
       What integrations are required?
       ├── Design system → Link to component library in Figma/Storybook
       ├── Real data → Connect to API mock (Mockaroo, Mirage JS)
       └── Analytics → Track prototype interactions (Hotjar, FullStory)
`
