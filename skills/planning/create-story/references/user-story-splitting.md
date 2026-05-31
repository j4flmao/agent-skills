# User Story Splitting

## Overview

Story splitting is the practice of breaking large user stories into smaller, independently valuable stories that can be completed within a single sprint (1-3 days per story). Effective splitting is one of the highest-leverage skills in agile development. It enables continuous delivery, reduces cycle time, improves estimation accuracy, and helps the team ship value incrementally. This reference covers story splitting patterns, techniques, anti-patterns, and examples.

## When to Split

### The Splitting Threshold

A story should be split when any of these conditions are true:

| Indicator | Threshold | Action |
|-----------|-----------|--------|
| Time estimate | > 3 days | Split the story |
| Acceptance criteria | > 7 criteria | Consider splitting |
| "And" in description | Multiple features in one story | Split at the "and" |
| Unknowns | > 2 significant unknowns | Consider a spike first |
| Team members | > 1 developer implied | Split for parallel work |
| Layers | Incomplete across layers | Ensure each slice is vertical |

### The SPIDR Heuristic

Use the SPIDR acronym to evaluate whether a story needs splitting:

```
S - Size: Would this take more than 3 days? → Split
P - Patterns: Does it mix multiple patterns? → Split  
I - Interfaces: Does it change multiple APIs? → Consider splitting
D - Dependencies: Would splitting unlock parallel work? → Split
R - Risk: Does high risk block other work? → Split risk into a spike
```

## Story Splitting Patterns

### Pattern 1: Vertical Slicing

The most important splitting pattern. Split by functionality, not by layer:

```
BAD: Horizontal Split
  Story 1: Database schema for orders
  Story 2: API endpoints for orders  
  Story 3: UI for order management

GOOD: Vertical Split
  Story 1: User can view order list (schema + API + UI for listing)
  Story 2: User can view order detail (schema + API + UI for detail)
  Story 3: User can cancel an order (schema + API + UI for cancellation)
```

**Why vertical slicing works:**
- Each story delivers user-facing value independently.
- The team validates the full stack early.
- Dependencies between layers are caught in the first story.
- Stakeholders see progress after each story, not after all layers.

### Pattern 2: Happy Path First

Build the simplest working version first, then add edge cases:

```markdown
### Before Splitting (Large Story)
STORY-101: User can purchase items
  - Create order
  - Process payment (credit card, PayPal, crypto)
  - Handle inventory
  - Send confirmation email
  - Handle failed payments
  - Handle refunds
  - Applied discounts and promotions

### After Splitting
STORY-101: User can purchase items with credit card (happy path)
STORY-102: User can purchase with PayPal
STORY-103: User can purchase with cryptocurrency
STORY-104: Handle failed payment during purchase
STORY-105: Process refund for a completed purchase
STORY-106: Apply promotional discount to purchase
```

### Pattern 3: Operations Split

Split CRUD operations into individual stories:

```markdown
### Before
STORY-201: Full product management (CRUD + search + import)

### After
STORY-201: Admin can create a product
STORY-202: Admin can view product list with search
STORY-203: Admin can edit product details
STORY-204: Admin can archive/deactivate a product
STORY-205: Admin can bulk import products via CSV
STORY-206: Admin can export products to CSV
```

### Pattern 4: Business Rule Variations

When a story involves multiple business rules or variations, split by rule:

```markdown
### Before
STORY-301: System calculates shipping cost based on weight, distance, and membership tier

### After
STORY-301: System calculates shipping cost by weight for standard members
STORY-302: System calculates shipping cost by distance for standard members
STORY-303: Premium members get free shipping (overrides weight/distance)
STORY-304: Express shipping option with surcharge
```

### Pattern 5: Spike + Implementation

When the story involves significant unknowns:

```markdown
### Before
STORY-401: Implement AI-powered product recommendations

### After
SPIKE-401: Research and prototype recommendation engine options
STORY-402: Implement basic popularity-based recommendations (fallback)
STORY-403: Implement collaborative filtering recommendations
STORY-404: A/B test recommendation algorithms
```

### Pattern 6: Major Effort Splitting

For very large features, use a phased approach:

```markdown
### Before
STORY-501: Single sign-on integration with enterprise identity providers

### After
Phase 1 (Foundation):
  STORY-501: Implement SSO authentication flow with one provider (Okta)
  STORY-502: Add SSO configuration UI in admin settings
  STORY-503: Support SAML 2.0 protocol

Phase 2 (Expansion):
  STORY-504: Add Azure AD as SSO provider
  STORY-505: Add Google Workspace as SSO provider
  STORY-506: Add OneLogin as SSO provider

Phase 3 (Advanced):
  STORY-507: SCIM provisioning for user sync
  STORY-508: Just-in-time user provisioning on SSO login
  STORY-509: SSO session management and logout
```

### Pattern 7: Acceptance Criteria Splitting

When one story has too many acceptance criteria, group them logically:

```markdown
### Before: 12 criteria in one story

### After
STORY-601: Search returns results by product name
  - Given I search for an exact product name When... Then matching products
  - Given I search for a partial name When... Then fuzzy matches
  - Given I search with misspelling When... Then suggested corrections

STORY-602: Search filters by category and price
  - Given I select a category filter When... Then filtered results
  - Given I set a price range When... Then results within range
  - Given I combine category and price filters When... Then combined filter

STORY-603: Search sorts and paginates results
  - Given I have 100+ results When... Then paginated 20 per page
  - Given I select sort by price When... Then sorted ascending
  - Given I select sort by rating When... Then sorted descending
```

## Splitting Techniques

### Technique 1: The SPIDR Framework

```
SPIDR Story Splitting

S - Simplify: Can we simplify the scope without losing the core value?
P - Patterns: Can we build one pattern end-to-end first?
I - Interfaces: Can we stub/mock interfaces and implement later?
D - Data: Can we start with simple data and add complexity?
R - Rules: Can we start with default rules and add variations?
```

### Technique 2: User Role Expansion

Split by user role:

```markdown
Before: User can manage team members

After:
- Admin can invite team members
- Admin can remove team members
- Admin can change team member roles
- Team member can view team roster
- Team member can leave team
```

### Technique 3: Device/Platform Split

```markdown
Before: User can view responsive dashboard

After:
- User can view dashboard on desktop
- User can view dashboard on tablet
- User can view dashboard on mobile
```

### Technique 4: Input/Output Variations

```markdown
Before: User can import data from external sources

After:
- User can import data from CSV
- User can import data from Excel
- User can import data via API
- User can connect Google Sheets import
```

### Technique 5: Performance/Scale Split

Implement the feature first, then optimize:

```markdown
Before: Dashboard loads quickly with 100K records

After:
- Dashboard displays data (initial implementation)
- Dashboard paginates results for performance (N records per page)
- Dashboard uses server-side search/filter for large datasets
- Dashboard caches data for sub-second load times
```

## Splitting Anti-Patterns

### Anti-Pattern 1: Horizontal Splitting

```
BAD: Each layer in its own story
  Story 1: Add order database tables
  Story 2: Add order API endpoints
  Story 3: Add order UI screens

Problem: Stories 1 and 2 deliver no user value independently.
If Story 1 is delayed, Stories 2 and 3 are blocked.
Testing is delayed until all three are done.
```

### Anti-Pattern 2: UI-First Splitting

```
BAD: Static UI first, then backend
  Story 1: Build order management screens (static mockups)
  Story 2: Connect order screens to backend API
  Story 3: Add order validation and error handling

Problem: Story 1 cannot be tested with real data.
Integration issues surface too late.
```

### Anti-Pattern 3: Splitting Too Fine

```
BAD: Micro-stories that create overhead
  Story 1: Add "name" field to user model
  Story 2: Add "email" field to user model
  Story 3: Add "phone" field to user model

Problem: Each story has overhead (grooming, planning, QA, demo).
Three tiny stories take more total effort than one well-sized story.
```

### Anti-Pattern 4: Splitting by Developer

```
BAD: Each developer takes a layer
  Story 1 (Alice): Database changes
  Story 2 (Bob): Backend API
  Story 3 (Carol): Frontend UI

Problem: Creates handoff dependencies. No shared ownership.
Integration risk at the end of the sprint.
```

### Anti-Pattern 5: Complexity Splitting (The "Easy Parts" Trap)

```
BAD: Easy parts first, hard parts ignored
  Story 1: Display product list (simple - just query)
  Story 2: Display product detail (simple - just query)
  Story 3: Handle inventory synchronization (complex - never gets done)

Problem: Easy stories get done, complex stories linger.
The real value (accurate inventory) is never delivered.
```

## Splitting Examples by Domain

### E-commerce

```markdown
### Large Story
User can complete checkout process

### Split Stories
STORY-101: Guest user can checkout with credit card (no account)
STORY-102: Registered user can checkout with saved payment method
STORY-103: User can apply promo code during checkout
STORY-104: User can choose shipping method during checkout
STORY-105: User receives order confirmation after checkout
STORY-106: Handle out-of-stock items during checkout
```

### SaaS Platform

```markdown
### Large Story
User can configure workspace settings

### Split Stories
STORY-201: Admin can change workspace name and URL
STORY-202: Admin can manage workspace member roles
STORY-203: Admin can configure workspace branding (logo, colors)
STORY-204: Admin can set workspace default permissions
STORY-205: Admin can configure SSO for workspace
STORY-206: Admin can export workspace data
```

### Mobile App

```markdown
### Large Story
User can manage their profile

### Split Stories
STORY-301: User can view their profile
STORY-302: User can edit display name and avatar
STORY-303: User can change email address (with verification)
STORY-304: User can change password
STORY-305: User can set notification preferences
STORY-306: User can delete their account
```

### Data Pipeline

```markdown
### Large Story
Data pipeline processes and visualizes sales data

### Split Stories
STORY-401: Pipeline ingests raw sales data from CSV
STORY-402: Pipeline validates and cleanses incoming data
STORY-403: Pipeline transforms data into reporting format
STORY-404: Dashboard displays daily sales totals
STORY-405: Dashboard displays sales trends over time
STORY-406: Dashboard supports date range filtering
```

## Splitting Workflow

```mermaid
1. Identify large story during backlog grooming
2. Apply splitting patterns to break it down
3. Validate each split story independently:
   - Does it deliver value on its own?
   - Can it be completed in 1-3 days?
   - Does it touch all layers (vertical slice)?
   - Can it be tested independently?
4. Prioritize split stories
5. Update story tracking with new estimates
6. Review with team for buy-in
```

### Grooming Session for Splitting

```markdown
## Story Splitting Session (30 min)

### Step 1: Identify Large Stories
- Review backlog for stories estimated L or XL
- Flag stories with >7 acceptance criteria

### Step 2: Apply Splitting Patterns
- Which pattern fits this story?
- Brainstorm 2-3 splitting approaches
- Choose the approach that produces the most independent stories

### Step 3: Validate Splits (5 min per split)
| Check | Pass/Fail |
|-------|-----------|
| Each split is independently valuable | |
| Each split is 1-3 days of work | |
| Each split is a full vertical slice | |
| Splits can be prioritized independently | |
| No split depends on another split being completed first | |

### Step 4: Update Backlog
- Replace the large story with split stories
- Add dependencies between splits if any
- Re-estimate each split
- Re-prioritize if needed
```

## Splitting Decision Tree

```
Is the story estimated at L or XL?
  |
  ├── YES: Does it deliver a single user goal?
  |     |
  |     ├── YES: Is the complexity from technical risk?
  |     |     |
  |     |     ├── YES: Create a spike story for the risk
  |     |     └── NO: Are there multiple business rules?
  |     |           |
  |     |           ├── YES: Split by business rule
  |     |           └── NO: Split by operations (CRUD)
  |     |
  |     └── NO: Does the story cover multiple user goals?
  |           |
  |           ├── YES: Split by user goal
  |           └── NO: Does it cover multiple device/platforms?
  |                 |
  |                 ├── YES: Split by platform
  |                 └── NO: Split by happy path + edge cases
  |
  └── NO: Story is appropriately sized

Is the story estimated at S or M but feels too large?
  |
  ├── Does it have more than 7 acceptance criteria?
  |     ├── YES: Split criteria into 2+ stories by criteria group
  |     └── NO: Is the ambiguity causing estimation uncertainty?
  |           ├── YES: Add a spike or research task first
  |           └── NO: Story is likely fine as-is
```

## Measuring Split Quality

### Split Quality Metrics

| Metric | Good | Needs Improvement |
|--------|------|-------------------|
| Average story size | 1-3 days | >3 days or <2 hours |
| Stories completed per sprint | 8-12 (4-6 person team) | <5 or >20 |
| Split stories completed together | 80%+ within same sprint | Only 50% |
| Blocked stories (dependency) | <10% | >30% |
| Independently deployable | 90%+ | <50% |

### Retrospective Questions

After a sprint, ask these questions about story sizing:

- Were any stories still too large? Which ones? What splitting pattern would have helped?
- Were any stories too small and created overhead? How could they have been combined?
- Did any split stories create unexpected dependencies?
- Did the team agree on the splitting approach?
- What patterns worked well? What patterns should we try next sprint?

## References
- references/user-story-acceptance-criteria.md — User Story Acceptance Criteria
- references/story-refinement.md — Story Refinement
- references/story-examples.md — Story Examples
- references/acceptance-criteria.md — Acceptance Criteria Guide
- references/create-story-advanced.md — Create Story Advanced Topics
- references/story-template.md — Story Template
