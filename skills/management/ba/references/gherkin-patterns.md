# Gherkin Patterns

## Common Patterns

### Authentication
```gherkin
Scenario: User logs in with valid credentials
  Given the user is on the login page
  When they enter a valid email and password
  And they click "Sign In"
  Then they are redirected to the dashboard
  And a success message is displayed

Scenario: User logs in with invalid password
  Given the user is on the login page
  When they enter a valid email and incorrect password
  And they click "Sign In"
  Then an error message "Invalid email or password" is displayed
  And they remain on the login page
```

### CRUD
```gherkin
Scenario: User creates a new order
  Given the user is logged in
  When they fill in the order form with valid data
  And they click "Submit Order"
  Then the order is created with status "Pending"
  And a confirmation email is sent

Scenario: User views empty order list
  Given the user is logged in
  And they have no orders
  When they navigate to "My Orders"
  Then an empty state message "No orders yet" is displayed
  And a "Browse Products" button is shown
```

### Data-driven
```gherkin
Scenario Outline: Search with various inputs
  Given the user is on the search page
  When they search for "<query>"
  Then "<count>" results are displayed

  Examples:
    | query     | count |
    | laptop    | 42    |
    | shoes     | 156   |
    | xyzzy     | 0     |
```

## Anti-patterns
- Implementation details in Gherkin ("click the blue button") — use business language ("click Submit")
- Multiple conditions in one scenario — split into separate scenarios
- Vague expectations ("should work") — specific assertions ("status is 200")
- Testing the system, not the behavior — Gherkin describes user-facing behavior, not internal state
