# PRD Examples

Real-world PRD examples showing different product types.

## Example 1: B2B SaaS — Invoice Management

```markdown
# Product Requirements Document: InvoiceFlow

## Overview
InvoiceFlow is a B2B invoice management platform that automates
invoice receipt, approval routing, and payment scheduling for
mid-market companies (50-500 employees). This PRD covers the MVP.

## Goals & Success Metrics
| Goal | Metric | Target |
|------|--------|--------|
| Reduce invoice processing time | Days from receipt to approval | < 3 days |
| Improve approval compliance | % of invoices with complete audit trail | 100% |
| Reduce late payment fees | % of invoices paid before due date | > 95% |

## Epics & Stories

### Epic 1: Invoice Ingestion
**Description:** Users can submit invoices via email, file upload,
and API. System extracts key fields using OCR and creates an
invoice record.

#### Story 1.1: Email Invoice Submission
*As a vendor, I want to send invoices to a dedicated email address
so that they are automatically captured in the system.*

**Acceptance Criteria:**
- Given a vendor sends an invoice PDF to the dedicated email address
  When the system processes the email Then an invoice record is created
  with status "Pending Review"
- Given the email contains an image attachment instead of a PDF
  When the system processes the email Then the attachment is converted
  and an invoice record is created
- Given the email attachment is corrupt or unreadable
  When the system processes the email Then a failure notification is
  sent to the sender and no invoice record is created

**Complexity:** M

#### Story 1.2: Manual Invoice Upload
*As an accounts payable clerk, I want to upload invoice PDFs via
the web interface so that I can process paper invoices received by
mail.*

**Acceptance Criteria:**
- Given I am on the upload page When I select a PDF file and click
  Upload Then the file is uploaded and OCR extraction begins
- Given OCR extraction is complete When I view the invoice Then
  fields (vendor name, date, amount, invoice number) are pre-filled
- Given the file exceeds 20MB When I attempt to upload Then I see
  an error message "File too large. Maximum size is 20MB."

**Complexity:** S

### Epic 2: Approval Workflow
**Description:** Invoices route through configurable approval chains
based on amount, department, and vendor. Approvers receive
notifications and can approve, reject, or request changes.

#### Story 2.1: Define Approval Rules
*As an admin, I want to configure approval rules so that invoices
automatically route to the correct approvers.*

**Acceptance Criteria:**
- Given I am an admin When I create a rule with condition "Amount >
  $5,000" and action "Route to Finance Director" Then the rule is
  saved and active
- Given an invoice matches multiple rules When the system evaluates
  Then the highest-priority rule is applied
- Given an invoice does not match any rule When the system evaluates
  Then the invoice is assigned to the default approver

**Complexity:** L

#### Story 2.2: Approve or Reject Invoice
*As an approver, I want to review invoice details and approve or
reject with a comment so that the invoice processing continues or
is flagged for correction.*

**Acceptance Criteria:**
- Given I am viewing an invoice When I click "Approve" and add an
  optional comment Then the invoice status changes to "Approved"
  and the next approver is notified
- Given I am viewing an invoice When I click "Reject" and enter a
  required reason Then the invoice status changes to "Rejected"
  and the submitter is notified
- Given I have not reviewed the invoice within 48 hours When the
  deadline passes Then a reminder notification is sent

**Complexity:** M

### Epic 3: Payment Scheduling
**Description:** Approved invoices are queued for payment based on
due dates and cash availability. Users can schedule individual or
batch payments.

#### Story 3.1: Payment Queue
*As a finance manager, I want to see all approved invoices in a
payment queue sorted by due date so that I can prioritize payments.*

**Acceptance Criteria:**
- Given there are approved invoices When I open the payment queue
  Then invoices are sorted by due date (earliest first)
- Given an invoice is due within 7 days When it appears in the queue
  Then it is highlighted with a warning indicator
- Given I select multiple invoices When I click "Schedule Payments"
  Then a batch payment is created

**Complexity:** S

### Epic 4: Vendor Management
**Description:** Vendor records are automatically created from
invoice data and can be manually curated.

#### Story 4.1: Vendor Auto-Creation
*As an AP clerk, I want new vendors to be auto-created from invoice
data so that I don't need to manually enter vendor records.*

**Acceptance Criteria:**
- Given an invoice arrives from a new vendor When the system
  processes it Then a vendor record is auto-created with name,
  address, and tax ID
- Given a vendor record already exists When a new invoice arrives
  from the same vendor Then the invoice is linked to the existing
  vendor record
- Given the vendor name differs by 1-2 characters from an existing
  record When the invoice is processed Then the system suggests a
  match and allows merging

**Complexity:** M

## Non-Functional Requirements

| Category | Requirement | Target | Verification |
|----------|-------------|--------|--------------|
| Performance | OCR processing time | < 30 seconds per page | Load testing |
| Performance | Page load time (invoice list) | < 2 seconds | Lighthouse |
| Security | Data encryption | AES-256 at rest, TLS 1.3 | Audit |
| Security | Access control | RBAC with 4 roles | Penetration test |
| Availability | System uptime | 99.9% (excluding planned) | Monitoring |
| Scalability | Concurrent users | 500 | Load testing |
| Compliance | Audit trail | Every action logged with timestamp | Automated test |
| Integration | Email processing | IMAP + SendGrid | Integration test |

## Definition of Done
- [ ] Code complete with unit tests (>80% coverage on new code)
- [ ] Integration tests for email processing, OCR, and approval flow
- [ ] All acceptance criteria met and verified by QA
- [ ] Accessibility compliance (WCAG 2.1 AA)
- [ ] API documentation updated (OpenAPI 3.0)
- [ ] Migration script tested with 10K invoice dataset
- [ ] Rollback plan documented for DB migrations
- [ ] Error monitoring and alerting configured
- [ ] Deployed to staging and smoke tests pass
```

## Example 2: Mobile App — Habit Tracker

```markdown
# Product Requirements Document: HabitLoop

## Overview
HabitLoop is a mobile habit tracking app that uses gentle reminders,
streak tracking, and social accountability to help users build
consistent routines. This PRD covers the iOS MVP.

## Goals & Success Metrics
| Goal | Metric | Target |
|------|--------|--------|
| User retention | D30 retention | > 35% |
| Habit completion rate | % of daily habits completed | > 70% |
| Engagement | Daily sessions per user | > 2 |

## Epics & Stories

### Epic 1: Habit Management
**Description:** Users can create, edit, and manage their habits
with customizable schedules and reminders.

#### Story 1.1: Create a Habit
*As a user, I want to create a new habit with a name, frequency,
and reminder time so that I can start tracking it immediately.*

**Acceptance Criteria:**
- Given I am on the home screen When I tap the "+" button Then a
  habit creation form appears with fields: Name, Frequency (Daily/
  Weekly/Weekly), Reminder Time (optional)
- Given I fill in the required fields When I tap "Save" Then the
  habit appears in my habit list and the first reminder is scheduled
- Given I try to save without entering a name When I tap "Save"
  Then I see a validation error "Habit name is required"

**Complexity:** M

#### Story 1.2: Complete a Habit
*As a user, I want to mark a habit as complete for today so that
my streak counter increases.*

**Acceptance Criteria:**
- Given I have a habit with today's checkbox unchecked When I tap
  the checkbox Then it shows as checked and the streak counter
  increments
- Given I tap a checkbox by mistake When I tap it again Then it
  unchecks and the streak counter decreases
- Given the habit is weekly and I completed it 3 times this week
  When I view the habit Then all 3 checkboxes show as completed

**Complexity:** S

### Epic 2: Streaks & Motivation
**Description:** Visual streak tracking and achievement badges
keep users motivated.

#### Story 2.1: Streak Display
*As a user, I want to see my current streak for each habit so
that I feel motivated to maintain it.*

**Acceptance Criteria:**
- Given I have completed a habit for 5 consecutive days When I
  view the habit Then the streak shows "5 days" with a flame icon
- Given I miss a day When I view the habit Then the streak resets
  to 0 and shows "Start a new streak"
- Given I have a 30+ day streak When I view the habit Then it
  shows a special "legendary" badge

**Complexity:** S
```

## Example 3: API Platform — SMS Service

```markdown
# Product Requirements Document: TextAPI

## Overview
TextAPI is a developer-focused SMS API that provides reliable message
delivery with global carrier connectivity, delivery tracking, and
programmable webhooks. This PRD covers the public API MVP.

## Goals & Success Metrics
| Goal | Metric | Target |
|------|--------|--------|
| API reliability | Uptime | 99.95% |
| Developer adoption | Active API keys in first 3 months | 500 |
| Delivery speed | P95 delivery time | < 5 seconds |

## Epics & Stories

### Epic 1: REST API
**Description:** Core REST API for sending SMS messages, checking
delivery status, and managing account resources.

#### Story 1.1: Send SMS
*As a developer, I want to send an SMS message via REST API so
that I can integrate SMS into my application.*

**Acceptance Criteria:**
- Given I have valid API credentials When I POST /messages with
  {to, from, body} Then the API returns 201 with a message ID and
  status "queued"
- Given I send a message to an invalid phone number When I POST
  /messages Then the API returns 400 with error code INVALID_NUMBER
- Given my account has insufficient balance When I POST /messages
  Then the API returns 402 with error code INSUFFICIENT_FUNDS

**Complexity:** M
```

