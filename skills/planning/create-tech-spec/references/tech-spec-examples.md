# Tech Spec Examples

Real-world technical specification examples for different feature types.

## Example 1: REST API — Payment Processing

```markdown
# Technical Specification: Payment Processing API

## System Context
```
[Mobile App] --POST /payments--> [API Gateway] --> [Payment Service]
                                                       |
                                            [Stripe API] --charge--> [Card Network]
                                                       |
                                            [PostgreSQL] <--save payment record
```

## Data Model

### Payment
| Field | Type | Constraints | Default | Notes |
|-------|------|-------------|---------|-------|
| id | UUID | PK, v7 sortable | gen_random_uuid() | |
| order_id | UUID | FK → orders.id, NOT NULL | — | |
| amount | integer | > 0, NOT NULL | — | Amount in cents |
| currency | varchar(3) | NOT NULL, uppercase | 'USD' | ISO 4217 |
| status | enum | see PaymentStatus | 'pending' | |
| stripe_payment_intent_id | varchar(255) | unique, nullable | null | Set after Stripe confirmation |
| error_message | text | nullable | null | Human-readable error |
| metadata | jsonb | nullable | null | Flexible key-value pairs |
| created_at | timestamptz | NOT NULL | now() | |
| updated_at | timestamptz | NOT NULL | now() | Auto-update trigger |

### Enum: PaymentStatus
| Value | Description |
|-------|-------------|
| pending | Created but not sent to Stripe |
| processing | Stripe payment intent created, awaiting confirmation |
| succeeded | Payment confirmed by Stripe |
| failed | Payment declined or errored |
| refunded | Payment fully refunded |
| partially_refunded | Payment partially refunded |

### Indexes
| Name | Columns | Type | Purpose |
|------|---------|------|---------|
| idx_payments_order | (order_id) | B-tree | Lookup by order |
| idx_payments_status | (status, created_at DESC) | B-tree | Filter by status |
| idx_payments_stripe | (stripe_payment_intent_id) | UNIQUE | Idempotency key |

### Migration
```sql
CREATE TYPE payment_status AS ENUM (
    'pending', 'processing', 'succeeded', 'failed',
    'refunded', 'partially_refunded'
);

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id),
    amount INTEGER NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    status payment_status NOT NULL DEFAULT 'pending',
    stripe_payment_intent_id VARCHAR(255) UNIQUE,
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_status ON payments(status, created_at DESC);
```

### Rollback
```sql
DROP TABLE IF EXISTS payments;
DROP TYPE IF EXISTS payment_status;
```

## API Contract

### POST /api/v1/payments
Create a payment intent and process payment.

**Auth:** Required. JWT with customer role.

**Request:**
```json
{
    "order_id": "uuid — the order to pay for",
    "amount": 2999,
    "currency": "USD",
    "payment_method_id": "pm_123 — Stripe payment method ID"
}
```

**Response 201:**
```json
{
    "data": {
        "id": "uuid",
        "amount": 2999,
        "currency": "USD",
        "status": "processing",
        "client_secret": "pi_xxx_secret_yyy — for frontend confirmation"
    },
    "meta": { "requestId": "uuid" }
}
```

**Error Responses:**
| Status | Condition | Error Code |
|--------|-----------|------------|
| 400 | Invalid amount or currency | VALIDATION_ERROR |
| 401 | Missing/invalid token | UNAUTHORIZED |
| 404 | Order not found | ORDER_NOT_FOUND |
| 409 | Order already paid | ORDER_ALREADY_PAID |
| 402 | Payment declined by card network | PAYMENT_DECLINED |
| 500 | Stripe API failure | PAYMENT_SERVICE_ERROR |

### GET /api/v1/payments/{id}
Retrieve payment status.

**Response 200:**
```json
{
    "data": {
        "id": "uuid",
        "amount": 2999,
        "status": "succeeded",
        "created_at": "2025-01-15T10:30:00Z"
    },
    "meta": { "requestId": "uuid" }
}
```

### POST /api/v1/payments/{id}/refund
Refund a successful payment (partial or full).

**Request:**
```json
{
    "amount": 2999
}
```

**Response 200:**
```json
{
    "data": {
        "id": "uuid",
        "status": "refunded",
        "refunded_amount": 2999
    },
    "meta": { "requestId": "uuid" }
}
```

## Error Handling
| Error Type | HTTP Status | Error Code | Description |
|------------|-------------|------------|-------------|
| Validation | 400 | VALIDATION_ERROR | Request body fails schema validation |
| Auth | 401 | UNAUTHORIZED | JWT missing, expired, or invalid |
| Not Found | 404 | NOT_FOUND | Resource does not exist |
| Conflict | 409 | ORDER_ALREADY_PAID | Idempotency check failed |
| Payment declined | 402 | PAYMENT_DECLINED | Card declined by issuer |
| Insufficient funds | 402 | INSUFFICIENT_FUNDS | Account balance too low |
| Rate limit | 429 | RATE_LIMITED | Too many requests |
| Internal | 500 | INTERNAL_ERROR | Unexpected server failure |

All errors return:
```json
{
    "error": {
        "code": "ERROR_CODE",
        "message": "Human-readable description",
        "details": { "field": { "issue": "description" } }
    },
    "meta": { "requestId": "uuid", "timestamp": "iso8601" }
}
```

## Validation Rules
| Field | Rule | Error Message |
|-------|------|---------------|
| amount | integer, min 1, max 999999 | "Amount must be between $0.01 and $9,999.99" |
| currency | ISO 4217, exactly 3 uppercase | "Currency must be a valid ISO 4217 code" |
| payment_method_id | string, starts with "pm_" | "Invalid payment method ID format" |

## Performance Targets
| Metric | Target | Measurement | Load Test |
|--------|--------|-------------|-----------|
| P95 latency | <500ms | Datadog APM | 50 req/s for 5 min |
| P99 latency | <1500ms | Datadog APM | 50 req/s for 5 min |
| Throughput | 200 req/s | Load testing | Peak traffic + 50% |
| Availability | 99.95% | Uptime monitoring | 30-day rolling |

## Testing Plan
| Layer | Scope | Framework | Environment |
|-------|-------|-----------|-------------|
| Unit | Payment service logic, status transitions, validation | Vitest | CI |
| Integration | Stripe API mock, database operations, idempotency | Vitest + TestContainers | CI |
| E2E | Full payment flow: create → confirm → refund | Playwright | Staging |

## Migration Plan
1. Create payments table and enum type (no downtime)
2. Deploy payment service with new endpoints (traffic at 0% initially)
3. Run integration tests against staging
4. Gradually route traffic: 1% → 10% → 50% → 100% over 2 days
5. Monitor error rates, latency, and Stripe API failures
6. Enable automated refund flow after 1 week of stable operation

**Rollback:**
- Remove payment service from API gateway routing
- Delete payments table (after confirming no pending payments)
- Revert to previous payment method if applicable
```

## Example 2: Frontend Feature — Document Editor

```markdown
# Technical Specification: Rich Text Document Editor

## System Context
```
[Editor Component] --autosave--> [API Client] --PATCH--> [Document Service]
        |                                                        |
  [TipTap Editor]                                          [PostgreSQL]
  [Prosemirror JSON]                                     [S3 (images)]
```

## Component Architecture

```
DocumentEditor
  ├── EditorToolbar
  │   ├── FormatButtons (bold, italic, underline, strikethrough)
  │   ├── HeadingSelector (h1, h2, h3, paragraph)
  │   ├── ListButtons (ordered, unordered, checkbox)
  │   ├── InsertMenu (image, table, code block, divider)
  │   └── UndoRedoButtons
  ├── EditorContent (TipTap instance)
  │   └── CollaborationPlugin (Yjs + WebSocket provider)
  ├── DocumentSidebar
  │   ├── OutlinePanel (auto-generated from headings)
  │   └── CommentsPanel
  └── StatusBar
      ├── WordCount
      ├── LastSaved
      └── ConnectionIndicator
```

## Component Props (DocumentEditor)

```typescript
interface DocumentEditorProps {
    documentId: string;
    initialContent: ProsemirrorJSON;
    readOnly?: boolean;
    userId: string;
    onSave?: (content: ProsemirrorJSON) => Promise<void>;
    onError?: (error: EditorError) => void;
}

interface EditorError {
    code: 'SAVE_FAILED' | 'LOAD_FAILED' | 'COLLAB_ERROR';
    message: string;
    retryable: boolean;
}
```

## State Management

```typescript
interface EditorState {
    content: ProsemirrorJSON;
    saving: boolean;
    lastSaved: Date | null;
    hasUnsavedChanges: boolean;
    collaborativeUsers: CollaborativeUser[];
    comments: Comment[];
    selectionState: SelectionInfo | null;
}
```

## Autosave Strategy

| Trigger | Action | Debounce |
|---------|--------|----------|
| Content change | Queue autosave | 2 seconds after last change |
| Window close | Synchronous save | Immediate |
| Tab hidden | Save via navigator.sendBeacon | Immediate |
| Network offline | Queue to IndexedDB | Until online |

## API Contract

### PATCH /api/v1/documents/:id
Save document content.

**Request:**
```json
{
    "content": { "type": "doc", "content": [] },
    "version": 42
}
```

**Response 200:**
```json
{
    "data": {
        "version": 43,
        "saved_at": "2025-01-15T10:30:00Z"
    }
}
```

**Error Responses:**
| Status | Condition | Error Code |
|--------|-----------|------------|
| 409 | Version conflict (concurrent edit) | VERSION_CONFLICT |
| 413 | Content exceeds 5MB limit | CONTENT_TOO_LARGE |
| 429 | Too many save requests | RATE_LIMITED |

## Performance Targets
| Metric | Target | Measurement |
|--------|--------|-------------|
| Initial load | < 2s to editable state | LCP + TBT |
| Typing latency | < 50ms keypress to character appear | requestAnimationFrame |
| Autosave P95 | < 1s from trigger to server ack | Browser dev tools |
| Collaboration latency | < 200ms remote edit appears | Yjs sync timing |

## Testing Plan
| Layer | Scope | Tool |
|-------|-------|------|
| Unit | TipTap extension behavior, keybindings, state transitions | Vitest |
| Component | Each editor component renders correctly, toolbar actions | React Testing Library |
| Integration | Autosave flow, collaboration sync, offline queue | Playwright |
| Visual | Editor renders consistently across browsers | Chromatic |
| Performance | Typing latency, memory usage with 100KB document | Lighthouse CI |
```
