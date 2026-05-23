# Brief Examples

Real-world product brief examples for different product types.

## Example 1: B2B SaaS — Team Task Manager

```markdown
# Product Brief: TaskFlow

## Problem Statement
Distributed teams struggle to coordinate work across time zones.
Email threads lose context, chat messages get buried, and project
management tools require extensive setup. Teams waste 4+ hours per
week in status meetings because there is no single source of truth
for task progress. Existing solutions (Asana, Monday.com) are
over-engineered for simple teams and require dedicated admins.

## Target Users
Technical team leads at startups (10-50 people) who want lightweight
task tracking without configuration. They are comfortable with
command-line tools and prefer keyboard-driven workflows. They value
speed over features and can adapt processes around tool limitations.

## Core Value Proposition
A keyboard-first task manager that helps distributed engineering teams
coordinate work by offering real-time sync, markdown-native task
descriptions, and zero-configuration project setup.

## Key Features (MVP)
- Real-time task sync across team members via WebSockets
- Markdown-based task creation and editing
- Keyboard shortcuts for all common operations
- List and board views with drag-and-drop
- CLI tool for task management from the terminal

## Out of Scope
- Gantt charts and timeline views
- Time tracking and billing
- CRM or customer management features
- Native mobile apps (responsive web only)
- Third-party integrations (API available for custom builds)

## Success Metrics
| Metric | Target | Measurement Method |
|--------|--------|--------------------|
| Daily Active Users | 60% of signed-up teams | Product analytics |
| Tasks created per user/day | 3+ | Product analytics |
| Time to first task | <2 minutes from signup | Funnel analytics |
| Team retention (30-day) | >80% | Cohort analysis |

## Technical Constraints
Web-based application (no desktop install). Responsive design for
mobile browsers. Real-time sync with offline support. Markdown
rendering engine. Keyboard shortcut system. CLI tool in npm.

## Timeline
| Milestone | Date |
|-----------|------|
| MVP Launch | Q2 2025 |
| Public API | Q3 2025 |
| Team Dashboard | Q4 2025 |
```

## Example 2: Consumer Mobile App — Recipe Sharing

```markdown
# Product Brief: CookShare

## Problem Statement
Home cooks discover recipes on social media (TikTok, Instagram,
YouTube) but have no way to organize, save, and share them with
friends. Saved posts get lost in platform algorithms. Meal planning
requires switching between 5+ apps. Cooks want a single place to
collect, tag, and share recipes with their social circle. Existing
recipe apps (Paprika, Yummly) focus on individual use and lack
social features.

## Target Users
Millennial and Gen Z home cooks (25-40) who follow food content
creators on social media. They cook 3-5 times per week, share food
photos on Instagram, and want to discover recipes through friends
rather than algorithms.

## Core Value Proposition
A social recipe box that helps home cooks save, organize, and share
recipes by combining bookmarking from any URL, visual meal planning,
and friend-based recipe discovery.

## Key Features (MVP)
- Save any recipe from the web (URL import with auto-parsing)
- Personal collections and tags for organization
- Visual meal planning calendar (weekly view)
- Friend feed showing what friends are cooking
- Share recipes via link, image, or PDF

## Out of Scope
- Grocery delivery integration
- Original recipe publishing platform
- AI meal planning or recommendations
- Nutritional tracking or diet plans
- E-commerce or marketplace

## Success Metrics
| Metric | Target | Measurement Method |
|--------|--------|--------------------|
| Recipes saved per user | 10 in first week | Product analytics |
| Weekly active users | 40% of registered | Product analytics |
| Recipes shared per user/week | 2+ | Product analytics |
| Meal plan creation rate | 20% of weekly actives | Product analytics |

## Technical Constraints
iOS and Android native apps. URL scraping and recipe parsing service.
Image hosting and optimization. Social graph and feed infrastructure.
Push notifications for shared recipes.

## Timeline
| Milestone | Date |
|-----------|------|
| MVP Launch | Q3 2025 |
| Android launch | Q4 2025 |
| Meal planning v2 | Q1 2026 |
```

## Example 3: Developer Tool — API Testing

```markdown
# Product Brief: APITest

## Problem Statement
Backend developers rely on tools like Postman and Insomnia for API
testing, but these tools are GUI-heavy, store collections in
proprietary formats, and cannot be integrated into CI/CD pipelines.
Developers want to define API tests as code, run them from the
terminal, and include them in automated test suites. Existing
solutions (hurl, httpie) lack collection management and team
collaboration features.

## Target Users
Backend engineers and API developers at teams of 5-50 engineers. They
use VS Code or Neovim, prefer YAML/JSON configurations over GUI
tools, and need API tests that integrate with their existing CI
pipeline (GitHub Actions, GitLab CI).

## Core Value Proposition
An API testing tool that helps backend developers create, manage, and
run API tests by defining them as YAML files in their repository,
executing them from the CLI, and integrating with CI/CD pipelines.

## Key Features (MVP)
- YAML-based test definition format
- CLI test runner with verbose and JSON output modes
- Environment variable management (dev/staging/prod)
- Response validation (status, headers, body, JSONPath)
- Collection management with folder/group structure

## Out of Scope
- GUI client for manual testing
- Auto-generated tests from OpenAPI specs
- Mock server generation
- API monitoring and alerting
- Team collaboration features (friends in future)

## Success Metrics
| Metric | Target | Measurement Method |
|--------|--------|--------------------|
| Tests created per user/week | 15+ | Product analytics |
| CI integration rate | 50% of users | Usage telemetry |
| Test run time (100 tests) | <10 seconds | Performance monitoring |
| NPS score | 40+ | Survey |

## Technical Constraints
Node.js CLI tool (npm package). YAML parsing and validation. HTTP
client library. JSONPath and XPath support. CI output formats (JUnit,
GitHub annotations).

## Timeline
| Milestone | Date |
|-----------|------|
| MVP Launch | Q1 2025 |
| OpenAPI import | Q2 2025 |
| Plugin system | Q3 2025 |
```
