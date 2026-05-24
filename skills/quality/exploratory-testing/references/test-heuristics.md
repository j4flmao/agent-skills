# Test Heuristics

## Overview

Test heuristics are cognitive shortcuts — rules of thumb, mnemonics, and questioning guides — that help testers design tests on the fly during exploratory testing. They are not algorithms; they are prompts to think about overlooked dimensions.

## Mnemonic-Based Heuristics

### HICCUPPS (FEW HICCUPS)

A comprehensive heuristic for feature testing, also known as **FEW HICCUPS**:

| Letter | Stands For | What to Test |
|--------|-----------|--------------|
| **F** | Features | Test each listed feature; test feature interactions |
| **E** | Environment | Different OS, browsers, devices, network conditions |
| **W** | What-If | Hypothetical scenarios: what if the network drops? what if the DB is down? |
| **H** | History | Past bugs, previous releases, known failure patterns |
| **I** | Image | Compare against expected appearance, screenshots, mockups |
| **C** | Compare | Compare with competitors, previous versions, similar features |
| **C** | Config | Different configuration options, toggles, feature flags |
| **U** | Unknown | Uncharted areas, undocumented behavior, implicit assumptions |
| **P** | Position | Element position, layout, z-index, scroll position, page location |
| **S** | Sequence | Order of operations, race conditions, back/forward navigation |

**Usage**: Pick 2-3 letters per testing session. Example: "Today I'll focus on Config, Sequence, and Unknown for the checkout flow."

### SFDIPOT

A risk-based heuristic for exploring any object or feature:

| Letter | Stands For | Questions |
|--------|-----------|-----------|
| **S** | Structure | What is it made of? What are its parts? Data structures? |
| **F** | Function | What does it do? What is its purpose? |
| **D** | Data | What data does it consume/produce? What are valid/invalid inputs? |
| **I** | Interfaces | What other systems does it interact with? APIs, UI, events? |
| **P** | Platform | What platform dependencies exist? OS, browser, hardware? |
| **O** | Operations | How is it used? What are common user workflows? |
| **T** | Time | Timing dependencies, timeouts, scheduling, performance over time |

**Usage**: Walk through each dimension systematically for any feature.

### Heuristic Test Strategy Model (HTSM)

James Bach's comprehensive model organized into categories:

**Product Elements:**
- Structure, Function, Data, Platform, Operations, Time, Interfaces

**Quality Criteria:**
- Capability, Reliability, Usability, Performance, Security, Compatibility, Installability

**Project Environment:**
- Customers, Developers, Standards, Tests, Users, Stakeholders, Facilities, Documentation

## Domain-Specific Heuristics

### Input Heuristics (for any input field)

| Heuristic | Examples |
|-----------|----------|
| Empty | Empty string, null, undefined |
| Extreme | Max length, min length, very large numbers |
| Invalid | Wrong type, wrong format, special characters |
| Boundary | Character limits, numeric ranges, date boundaries |
| Unicode | Emoji, RTL text, accented characters, CJK |
| Injection | SQL injection, XSS, command injection |
| White-space | Leading/trailing spaces, tabs, newlines |
| Repeated | Same input submitted multiple times |
| Interrupted | Submit during processing, partial input |

### State Transition Heuristics

| Heuristic | Questions |
|-----------|----------|
| Valid transitions | Does the state machine follow the spec? |
| Invalid transitions | What happens on an illegal state change? |
| Initial state | Is the default state correct? |
| Terminal states | Can the user get stuck? Can they recover? |
| Concurrent states | What happens when two states change simultaneously? |
| State persistence | Is state preserved across page reload, session timeout? |

### Error Handling Heuristics

| Heuristic | Questions |
|-----------|----------|
| Error messages | Are messages helpful, specific, and actionable? |
| Error recovery | Can the user recover and continue? |
| Logging | Are errors logged with sufficient context? |
| User impact | Does a partial failure corrupt data? |
| Graceful degradation | Does the feature degrade acceptably? |
| Exception safety | Does the system handle unexpected exceptions? |

## Real-World Application

### Example: Testing a Search Feature with HICCUPPS

```markdown
Feature: Product Search

F — Features: Basic search, autocomplete, filters, sort, pagination
E — Environment: Chrome, Firefox, Safari, mobile, tablet, slow 3G
W — What-If: Search while offline, search during index rebuild
H — History: Past bugs: XSS in search results, empty results crash
I — Image: Search results layout matches design mockup
C — Compare: Results match Elasticsearch query behavior
C — Config: Case sensitivity, stemming, stop words, language settings
U — Unknown: Try undocumented operators, boolean search
P — Position: Search bar placement, result position on mobile
S — Sequence: Search → refine → paginate → back → search again
```

### Example: Using SFDIPOT on a Checkout Feature

```markdown
S — Structure: Cart, pricing, tax calculation, payment gateway, order service
F — Function: Calculate total, apply discounts, collect payment, create order
D — Data: Cart items, coupon codes, shipping address, payment details
I — Interfaces: Payment API, shipping API, tax service, inventory service
P — Platform: Web (React), Mobile (iOS/Android), API Gateway
O — Operations: Standard purchase, guest checkout, subscription, refund
T — Time: Session timeout during checkout, payment timeout, stock reservation expiry
```

## Heuristic Combinations

Combine multiple heuristics for deeper exploration:

| Combination | Example |
|-------------|---------|
| Position + Sequence | "What happens when I scroll down, then interact with a fixed button?" |
| Config + Environment | "How does the feature behave on mobile with dark mode enabled?" |
| Data + Time | "What happens when I enter a date that's 100 years in the future?" |
| Unknown + What-If | "What if I open two browser tabs and submit the form simultaneously?" |
| History + Compare | "Does this year's version fix the bug we saw last year?" |

## Building Your Heuristic Toolbox

1. **Start with 2-3 mnemonics**: Master HICCUPPS and SFDIPOT first
2. **Create project-specific heuristics**: Common failure patterns in your domain
3. **Pair-test heuristics**: Two testers applying different heuristics to the same feature
4. **Rotate heuristics**: Don't default to the same 2-3 every session
5. **Document what works**: Maintain a team heuristic catalog of effective patterns

## Heuristic Cheatsheet

Print-friendly summary:

```
FEW HICCUPS: Features, Environment, What-If, History, Image, Compare, Config, Unknown, Position, Sequence
SFDIPOT: Structure, Function, Data, Interfaces, Platform, Operations, Time
Input: Empty, Extreme, Invalid, Boundary, Unicode, Injection, Whitespace, Repeated, Interrupted
State: Valid transitions, Invalid, Initial, Terminal, Concurrent, Persistence
Error: Messages, Recovery, Logging, Impact, Degradation, Exception safety
```
