# Story Splitting Techniques

## Splitting Patterns

### 1. Workflow Steps
Split a multi-step workflow into individual stories per step.
```
BEFORE: User completes onboarding
AFTER:
  - User enters personal information
  - User verifies email address
  - User sets up MFA
  - User accepts terms of service
```

### 2. Business Rule Variations
Split by business rules or conditional logic.
```
BEFORE: System calculates shipping cost
AFTER:
  - Shipping cost for domestic orders (flat rate)
  - Shipping cost for international orders (weight-based)
  - Shipping cost for express delivery (time-based)
```

### 3. CRUD Operations
Split Create, Read, Update, Delete into separate stories.
```
BEFORE: User manages orders
AFTER:
  - User views order list
  - User views order details
  - User creates order (submit)
  - User cancels order
```

### 4. UI + API Separation
Split frontend and backend implementation.
```
BEFORE: User dashboard with spending chart
AFTER:
  - Backend: Spending data API with aggregation
  - Frontend: Dashboard page with spending chart component
```

### 5. Spike + Implementation
Spike for research, then implementation story.
```
BEFORE: Integrate with Stripe payment gateway
AFTER:
  - Spike: Evaluate Stripe API, determine integration approach
  - Implement: Stripe payment integration (backend)
  - Implement: Payment form UI (frontend)
```

## Vertical Slicing Precedence
Prefer vertical slices (end-to-end, thin) over horizontal layers.
- Vertical: "User searches orders by date range" (UI + API + DB)
- Horizontal: "Build order search API" + "Build order search UI" — avoid
