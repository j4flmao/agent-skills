# Story Examples

Real-world user story examples across different feature types.

## Example 1: User Authentication

```markdown
# STORY-001: User Registration with Email and Password

## Status
Ready

## Epic
User Authentication

## User Story
As a new visitor, I want to create an account with my email and
password so that I can access the application.

## Acceptance Criteria
Happy path:
- Given I am on the registration page When I enter a valid email and
  a password with 8+ characters Then my account is created and I am
  logged in automatically
- Given I have completed registration When the system processes my
  request Then a confirmation email is sent to my address

Edge cases:
- Given I enter an email that is already registered When I submit
  the form Then I see "An account with this email already exists"
- Given I enter a password with fewer than 8 characters When I submit
  Then I see "Password must be at least 8 characters"

Error cases:
- Given the email service is unavailable When I complete registration
  Then my account is still created but I see "Confirmation email
  could not be sent. You can resend from your profile."
- Given I enter an improperly formatted email When I submit Then I
  see "Please enter a valid email address"

## Technical Notes
- Create `POST /api/v1/auth/register` endpoint
- Create `users` table with columns: id (UUID), email (unique),
  password_hash, email_verified (bool), created_at, updated_at
- Hash password with bcrypt (cost factor 12)
- Send verification email via SendGrid template "email-verification"
- Rate limit: max 3 registration attempts per email per hour
- Relevant ADR: ADR-007 (Auth0), ADR-012 (Password Hashing)

## Dependencies
- STORY-003: Email service integration (for verification email)
- ADR-007: Authentication strategy using Auth0

## Complexity
M
```

## Example 2: API Feature — Search with Filtering

```markdown
# STORY-015: Search Invoices with Filters

## Status
Ready

## Epic
Invoice Management

## User Story
As an accounts payable manager, I want to search invoices by vendor
name, date range, and status so that I can quickly find specific
invoices.

## Acceptance Criteria
Happy path:
- Given I am on the invoices page When I type a vendor name in the
  search bar and press Enter Then I see invoices matching that vendor
- Given I select a date range of "Last 30 days" and status "Pending"
  When I click Search Then I see only pending invoices from the last
  30 days, sorted by date descending

Edge cases:
- Given no invoices match my search When I execute the search Then
  I see "No invoices found" with a suggestion to adjust filters
- Given I clear all search filters When I click "Clear filters"
  Then I see the full invoice list again

Error cases:
- Given the search service is down When I attempt to search Then
  I see "Search temporarily unavailable" and the last known results

## Technical Notes
- Add query parameters to GET /api/v1/invoices: ?search=, &status=,
  &startDate=, &endDate=, &page=, &limit=
- Implement full-text search on vendor_name and invoice_number
  using PostgreSQL tsvector
- Add composite index on (vendor_name, status, due_date)
- Paginate results: 20 per page default, max 100
- Debounce search input by 300ms on the frontend
- Cache search results for 60 seconds

## Dependencies
- STORY-010: Invoice list view with pagination
- ADR-001: PostgreSQL as primary database

## Complexity
M
```

## Example 3: Frontend UI — Dashboard Widget

```markdown
# STORY-023: Dashboard Revenue Chart

## Status
Ready

## Epic
Analytics and Reporting

## User Story
As a business owner, I want to see a revenue chart on my dashboard
so that I can track monthly revenue trends at a glance.

## Acceptance Criteria
Happy path:
- Given I have revenue data for the past 12 months When I view the
  dashboard Then a line chart shows monthly revenue with a line
  connecting each month's data point
- Given I hover over a data point on the chart When I pause for 1
  second Then a tooltip appears showing the exact month and revenue
  amount

Edge cases:
- Given I have no revenue data for the current month When the chart
  loads Then it shows data up to the last complete month
- Given I have exactly one month of data When the chart renders
  Then it shows a single data point without a connecting line

Error cases:
- Given the analytics service returns an error When the chart
  component loads Then it shows "Unable to load revenue data" with
  a retry button
- Given the data includes a missing month When the chart renders
  Then that month is shown as a gap in the line

## Technical Notes
- Use Recharts library for React chart rendering
- Call GET /api/v1/analytics/revenue?period=monthly&months=12
- Format currency values in user's locale
- Chart dimensions: responsive, full width of the dashboard card
- Color: primary brand color (#4F46E5) for line
- Accessibility: include aria-labels and keyboard navigation
- Add loading skeleton while data is being fetched

## Dependencies
- STORY-020: Analytics API endpoint for revenue data
- ADR-005: Next.js 14 with App Router

## Complexity
S
```

## Example 4: Background Job — Email Notification

```markdown
# STORY-031: Send Invoice Due Reminder Emails

## Status
Ready

## Epic
Notifications and Communication

## User Story
As a finance manager, I want the system to automatically send
reminder emails for invoices due in 7 days so that I reduce late
payments.

## Acceptance Criteria
Happy path:
- Given it is 8:00 AM daily When the cron job runs Then invoices due
  in exactly 7 days are identified and a reminder email is sent to
  the assigned approver
- Given an approver has 3 invoices due in 7 days When the reminder
  is sent Then all 3 invoices are listed in a single email digest

Edge cases:
- Given an invoice due in 7 days was already paid When the cron job
  runs Then the invoice is skipped and no reminder is sent
- Given an approver has unsubscribed from email notifications When
  the cron job runs Then the reminder email is not sent to that
  approver

Error cases:
- Given the email service is unavailable When the cron job runs Then
  the failed emails are queued for retry (max 3 retries, 1 hour apart)

## Technical Notes
- Implement as a Node.js cron job running daily at 8:00 AM UTC
- Query: SELECT * FROM invoices WHERE due_date = CURRENT_DATE + 7
  AND status = 'approved'
- Group by approver_id for digest format
- Use SendGrid template "invoice-reminder-digest"
- Add email preference check before sending
- Log all sent reminders in email_logs table
- Monitor: alert if > 10% of emails fail in a single run

## Dependencies
- STORY-003: Email service integration
- STORY-012: Invoice approval workflow

## Complexity
M
```

## Example 5: Database Migration — Schema Change

```markdown
# STORY-040: Add Soft Delete to Invoices Table

## Status
Ready

## Epic
Data Management and Administration

## User Story
As an admin, I want to delete invoices without permanently removing
them so that I can recover accidentally deleted data.

## Acceptance Criteria
Happy path:
- Given I am viewing an invoice When I click "Delete" Then the
  invoice's deleted_at column is set to the current timestamp
- Given an invoice is soft-deleted When I view the invoice list
  Then it is not shown by default

Edge cases:
- Given an invoice is soft-deleted When I use the "Include deleted"
  filter Then I can see and restore it
- Given an invoice that has been soft-deleted for 90 days When the
  cleanup job runs Then it is permanently deleted

Error cases:
- Given I attempt to delete an invoice that is already deleted
  When I click "Delete" Then I see "Invoice is already deleted"

## Technical Notes
- Add column: deleted_at TIMESTAMPTZ DEFAULT NULL
- Update all SELECT queries to include WHERE deleted_at IS NULL
- Add filtered index: CREATE INDEX idx_invoices_active ON invoices
  (id) WHERE deleted_at IS NULL
- Update Prisma schema with @deleted decorator or middleware
- Create API endpoint: PATCH /api/v1/invoices/:id/restore
- Export/import scripts must exclude soft-deleted records by default
- Permanent deletion: weekly cron for records deleted > 90 days
- Rollback: DROP COLUMN deleted_at, remove index

## Dependencies
- ADR-001: PostgreSQL as primary database

## Complexity
S
```
