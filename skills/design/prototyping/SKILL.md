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

## References
  - references/high-fidelity-prototyping.md — High-Fidelity Prototyping Reference
  - references/low-fidelity-prototyping.md — Low-Fidelity Prototyping Reference
  - references/prototyping-advanced.md — Prototyping Advanced Topics
  - references/prototyping-fundamentals.md — Prototyping Fundamentals
  - references/prototyping-testing.md — Prototyping Testing Reference
  - references/prototyping-tools.md — Prototyping Tools Reference
## Handoff
Hand off to `design-ux-research` for usability test design. Hand off to `design-visual-design` for visual refinement. Hand off to `design-accessibility` for WCAG compliance audit.
