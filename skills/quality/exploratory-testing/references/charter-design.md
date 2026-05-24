# Charter Design

## Overview

A charter is the mission statement for an exploratory testing session. Well-designed charters focus testing effort, define scope, and provide a measurable completion criterion.

## Charter Anatomy

A complete charter contains five elements:

```
MISSION:    Clear, testable objective — what you seek to learn or find
SCOPE:      Boundaries — what is in and out of scope
RESOURCES:  What you need — accounts, data, tools, access
TIMEBOX:    Duration — typically 60-90 minutes
OUTPUTS:    What the session should produce — bugs, coverage, test ideas
```

### Template

```markdown
## Charter: <ID>

### Mission
<action verb> <target> using/with <resources> to <objective>

### Scope
In Scope:
- <list of areas to cover>
Out of Scope:
- <list of areas explicitly excluded>

### Resources
- <data, accounts, tools, access needed>

### Timebox
<minutes> minutes

### Expected Outputs
- Defects found in <area>
- Coverage assessment of <area>
- Test ideas for <related areas>
```

## Charter Types

### 1. Tour Charter
Explore a feature or area broadly to understand its structure and behavior.

**Example:**
```markdown
Mission: Tour the user profile management area to understand available settings,
         data flows, and navigation paths
Scope: All profile settings pages, edit flows, save/cancel behaviors
Timebox: 60 minutes
```

### 2. Scenario Charter
Test a specific user story or workflow end-to-end.

**Example:**
```markdown
Mission: Test the "guest checkout → create account → view order history" flow
         using various email formats and password policies
Scope: Guest cart, registration modal, order confirmation, order history page
Resources: Test email accounts, various password combinations
Timebox: 90 minutes
```

### 3. Feature Charter
Deep-dive into a specific feature or capability.

**Example:**
```markdown
Mission: Explore the coupon code engine to discover edge cases in
         discount calculation, stacking rules, and expiry behavior
Scope: All coupon types (%, $, free shipping), stacking rules, expiry dates,
       minimum purchase thresholds
Resources: Coupon admin panel, coupon code list, various cart values
Timebox: 75 minutes
```

### 4. Bug Hunt Charter
Target a specific risk area, known bug pattern, or quality concern.

**Example:**
```markdown
Mission: Hunt for XSS vulnerabilities in user-generated content areas
         including profile bios, product reviews, and forum posts
Scope: All text input fields accepting HTML/markdown, rendered output areas
Resources: XSS payload list, browser DevTools
Timebox: 90 minutes
```

### 5. Regression Miner Charter
Delve into a changed area to find regression bugs.

**Example:**
```markdown
Mission: Investigate the recent payment provider migration for regressions
         in transaction processing, receipt generation, and refund flows
Scope: Checkout, payment confirmation, receipts, refunds
Resources: Test credit cards, sandbox payment accounts
Timebox: 75 minutes
```

### 6. Variation Charter
Explore variations of a known scenario — data, environment, configuration.

**Example:**
```markdown
Mission: Test the file upload feature with variations in file type, size,
         encoding, and concurrent uploads
Scope: Supported formats, max file size, batch upload, progress indicators
Resources: Test file library (various formats, sizes, corrupt files)
Timebox: 60 minutes
```

## Charter Quality Dimensions

| Criterion | Good | Poor |
|-----------|------|------|
| Specific | "coupon stacking with 3+ coupons" | "test coupons" |
| Measurable | "find issues in X" | "check if it works" |
| Achievable | Single feature, one timebox | Multiple features, unbounded |
| Relevant | Tied to known risk | Random area with no risk basis |
| Time-bound | Explicit minutes | "Until done" |

## Charter Levels

### High-Level Charter (Product Area)
```
Mission: Evaluate the search feature for correctness, performance, and usability
Timebox: 3 sessions of 90 minutes
```
Break down into:

### Session-Level Charters
```
Session 1: Test basic search with single and multi-word queries
Session 2: Test filters, facets, and sort combinations
Session 3: Test search edge cases — special chars, empty, very long queries
```

## Charter Review Process

1. **Draft**: Tester writes charter based on risk, recent changes, or coverage gaps
2. **Review** (5 min): Peer or lead reviews for clarity, focus, and feasibility
3. **Adjust**: Refine scope or timebox based on feedback
4. **Execute**: Run the session against the charter
5. **Evaluate**: Did the charter produce valuable findings? Was scope appropriate?
6. **Retire or Refine**: Keep effective charters, update weak ones

## Charter Backlog Management

Maintain a prioritized backlog of charters:

```markdown
| Priority | Charter | Risk Area | Est. Time | Status |
|----------|---------|-----------|-----------|--------|
| P0 | Explore new payment gateway integration | Financial, Security | 90min | Ready |
| P1 | Test bulk import with 10K+ records | Performance, Data | 75min | Ready |
| P2 | Tour accessibility of checkout flow | Accessibility | 60min | Draft |
| P3 | Hunt for PII leaks in API responses | Security, Compliance | 90min | Needs review |
```

### Backlog Rules
- **Max 10 ready charters** at any time — prevents stale charters
- **Re-evaluate priority** every sprint — risks change
- **Archive completed charters** with results summary — reuse patterns
- **Split oversized charters** (>90 min) into multiple sessions

## Charter Effectiveness Metrics

| Metric | How to Measure | Target |
|--------|---------------|--------|
| Bug Find Rate | Bugs found / charter hour | > 0.5 bugs/hr |
| Scope Accuracy | % of charter completed within timebox | > 80% |
| Charter Usefulness | % of charters that found at least one notable issue | > 70% |
| Variation Coverage | Unique test variations per charter | > 15 variations |
| Rework Rate | % of charters needing re-scope during session | < 20% |

## Sample Complete Charter

```markdown
## Charter: C-2026-05-24-001

### Mission
Explore the invoice PDF generation with international address formats
and special characters to find rendering, encoding, or truncation issues

### Scope
In Scope:
- PDF generation for addresses with Unicode characters (Japanese, Arabic, Cyrillic)
- Long address lines (>50 characters)
- Addresses with diacritics and special symbols
- Multi-line address rendering in PDF

Out of Scope:
- E-mail delivery of invoices (separate charter)
- Invoice payment processing
- PDF download performance

### Resources
- Test account with international customer profiles
- Address test data (20+ international formats)
- PDF viewer and comparison tool
- Invoice generation admin panel access

### Timebox
75 minutes

### Expected Outputs
- Defects in PDF rendering for international addresses
- Coverage gaps in address field validation
- Test ideas for localization testing
```
