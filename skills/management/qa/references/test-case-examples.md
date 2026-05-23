# Test Case Examples

## Test Case Template

```
ID: TC-{n}
Title: {what is being tested}
Feature: {feature name}
Priority: High / Medium / Low
Precondition: {required state or data}
Test Data: {specific values}
Steps:
  1. {action}
  2. {action}
Expected Result: {expected behavior}
Actual Result: (filled during execution)
Status: Pass / Fail / Blocked / Not Run
```

## Authentication Test Cases

```
TC-001: Login with valid credentials
Priority: High
Precondition: User account exists with email user@example.com / password Password123!
Steps:
  1. Navigate to /login
  2. Enter email: user@example.com
  3. Enter password: Password123!
  4. Click "Sign In"
Expected: Redirected to dashboard. User name displayed in header.

TC-002: Login with invalid password
Priority: High
Precondition: User account with email user@example.com exists
Steps:
  1. Navigate to /login
  2. Enter email: user@example.com
  3. Enter password: WrongPassword456
  4. Click "Sign In"
Expected: Error message "Invalid email or password". User stays on login page.

TC-003: Login with empty fields
Priority: Medium
Steps:
  1. Navigate to /login
  2. Leave email and password blank
  3. Click "Sign In"
Expected: Field validation errors shown. Form not submitted.

TC-004: Password reset flow
Priority: High
Precondition: User account exists
Steps:
  1. Navigate to /login
  2. Click "Forgot Password"
  3. Enter registered email
  4. Click "Send Reset Link"
Expected: Success message. Email sent to registered address with reset link.
```

## E-Commerce Test Cases

```
TC-101: Add item to cart
Priority: High
Precondition: User is logged in. Product with SKU PROD-001 is in stock.
Steps:
  1. Navigate to product page /products/PROD-001
  2. Click "Add to Cart"
Expected: Item added to cart. Cart badge shows quantity 1. Toast notification "Added to cart".

TC-102: Checkout with valid credit card
Priority: High
Precondition: User is logged in. Cart has items. Shipping address on file.
Test Data: Card: 4111 1111 1111 1111, Exp: 12/28, CVV: 123
Steps:
  1. Navigate to /checkout
  2. Review order summary
  3. Select saved shipping address
  4. Enter payment details: 4111 1111 1111 1111, 12/28, 123
  5. Click "Place Order"
Expected: Order confirmation page displayed. Order ID generated. Confirmation email sent.

TC-103: Checkout with expired credit card
Priority: Medium
Test Data: Card: 4111 1111 1111 1111, Exp: 01/23 (expired), CVV: 123
Steps:
  1. Navigate to /checkout
  2. Enter expired card details
  3. Click "Place Order"
Expected: Error message "Card has expired". Order not created. User can edit payment method.

TC-104: Empty cart checkout attempt
Priority: Medium
Precondition: User is logged in. Cart is empty.
Steps:
  1. Navigate to /checkout directly via URL
Expected: Redirected to /cart with message "Your cart is empty". Checkout blocked.
```

## API Test Cases

```
TC-201: GET /api/v2/orders returns paginated results
Priority: High
Precondition: Authenticated user. Database has 50 orders for this user.
Steps:
  1. Send GET /api/v2/orders?page=1&limit=10
  2. Verify response status 200
Expected:
  - Response body contains "data" array with 10 items
  - Response body contains "pagination" with total=50, page=1, limit=10, totalPages=5
  - Each item has: id, status, amount, createdAt

TC-202: GET /api/v2/orders returns 401 without auth
Priority: High
Steps:
  1. Send GET /api/v2/orders without Authorization header
Expected: Response status 401. Error message "Authentication required".

TC-203: POST /api/v2/orders with invalid body
Priority: Medium
Precondition: Authenticated user.
Test Data: {"items": [], "address": ""}
Steps:
  1. Send POST /api/v2/orders with empty items and address
Expected: Response status 422. Error response with validation details.
  - items: "must contain at least 1 item"
  - address: "cannot be empty"

TC-204: Concurrent order creation (race condition)
Priority: Low
Precondition: Authenticated user. Product with quantity=1 in stock.
Steps:
  1. Send 2 simultaneous POST /api/v2/orders requests for the same product
Expected: Exactly one order succeeds (status 201). One fails (status 409 "Insufficient stock").
```

## Test Case Coverage Checklist

- [ ] Happy path — standard user flow works
- [ ] Negative path — invalid inputs, incorrect credentials
- [ ] Edge cases — empty state, maximum values, boundary values
- [ ] Permission/authorization — different roles, unauthenticated access
- [ ] Error handling — network failure, timeout, server error
- [ ] Data validation — injection, XSS, malformed input
- [ ] Concurrent access — race conditions, duplicate submission
- [ ] State transitions — valid and invalid status changes
- [ ] Data persistence — data correctly saved and retrieved
- [ ] UI/UX — loading states, error messages, empty states
