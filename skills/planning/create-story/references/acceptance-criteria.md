# Acceptance Criteria Guide

Writing effective acceptance criteria for user stories.

## Gherkin Format

```
Given {precondition}
When  {action}
Then  {expected result}
```

### Examples by Type

**Happy Path:**
```gherkin
Given I am logged in as a verified user
When I create a new project with name "Q4 Planning"
Then the project appears in my project list
And I am redirected to the project dashboard
```

**Edge Case:**
```gherkin
Given I have 100 projects already
When I create a new project
Then I see a warning "You have reached the project limit"
And the project is not created
```

**Error Case:**
```gherkin
Given the storage service is unavailable
When I upload a file
Then I see an error message "Upload failed. Please try again."
And the file is saved locally for later upload
```

## Acceptance Criteria Categories

Every story needs criteria from multiple categories.

| Category | What It Covers | Example |
|----------|---------------|---------|
| Happy path | Normal successful operation | Valid input, expected flow, success response |
| Edge case | Boundary conditions, empty states, unusual but valid inputs | Empty list, max values, special characters |
| Error case | Failure modes, invalid inputs, system failures | Network error, validation failure, auth failure |
| Security/Auth | Access control, permissions, data isolation | Unauthenticated user blocked, admin-only action |
| Performance | Response time, resource limits | Loads under 2 seconds, handles 100 items |
| State transitions | What happens from different states | Already deleted, already approved, paused subscription |
| UI/UX | Visual feedback, loading states, empty states | Loading spinner, confirmation dialog, empty state message |

### Minimum Criteria Per Story

| Story Complexity | Minimum Criteria | Suggested Split |
|------------------|-----------------|-----------------|
| XS | 2 (1 happy + 1 edge) | — |
| S | 3 (1 happy + 1 edge + 1 error) | — |
| M | 4 (1 happy + 2 edge + 1 error) | — |
| L | 5+ | Consider splitting |
| XL | — | Must split into smaller stories |

## Writing Guidelines

### DO

- Use concrete, verifiable values
  ```gherkin
  Given the file is larger than 20MB
  ```
  NOT:
  ```gherkin
  Given the file is too large
  ```

- Describe user-visible behavior, not internal state
  ```gherkin
  Then I see "Payment successful" with a green checkmark
  ```
  NOT:
  ```gherkin
  Then the payment.status field is set to 'completed'
  ```

- Include the "And" keyword for multiple conditions
  ```gherkin
  Then the invoice shows as "Paid"
  And the balance is reduced by the invoice amount
  ```

- Be specific about error messages
  ```gherkin
  Then I see "Email address is already registered"
  ```
  NOT:
  ```gherkin
  Then I see an error message
  ```

### DON'T

- Don't describe implementation
  ```gherkin
  DON'T: Given the SQL query returns 0 rows
  DO:    Given no invoices match the search criteria
  ```

- Don't use vague terms like "properly", "correctly", "successfully"
  ```gherkin
  DON'T: Then the data is saved correctly
  DO:    Then the project is visible in the list with all entered fields
  ```

- Don't combine multiple behaviors in one criterion
  ```gherkin
  DON'T: When I submit the form Then the data is saved and an email is sent
  DO:    When I submit the form Then I see a "Saved" confirmation
  AND:   When the form is saved Then a confirmation email is sent to the user
  ```

- Don't write criteria that are impossible to automate
  ```gherkin
  DON'T: Given the user feels frustrated
  DO:    Given the user has tried to submit 3 times with invalid data
  ```

## Template Patterns

### CRUD Operations

**Create:**
```gherkin
Given I am on the new {entity} page
When I fill in {required fields} and click Save
Then a new {entity} is created with the provided values
And I am redirected to the {entity} detail page
```

**Read:**
```gherkin
Given I am viewing the {entity} list
When I click on {entity} with name "{name}"
Then I see the full details of that {entity}
```

**Update:**
```gherkin
Given I am editing {entity} "{name}"
When I change the {field} to "{value}" and click Save
Then the {entity}'s {field} is updated to "{value}"
```

**Delete:**
```gherkin
Given I am viewing {entity} "{name}"
When I click Delete and confirm the dialog
Then the {entity} is removed from the list
And I see a confirmation message "{Entity} deleted"
```

### List/Index Operations

**Empty state:**
```gherkin
Given there are no {entities}
When I navigate to the {entity} list
Then I see "No {entities} yet. Create your first one."
And I see a "Create {entity}" button
```

**Pagination:**
```gherkin
Given there are 25 {entities}
When I navigate to the {entity} list
Then I see 20 {entities} on page 1
And I see pagination controls showing "Page 1 of 2"
```

**Sorting:**
```gherkin
Given I am viewing the {entity} list sorted by name ascending
When I click the "Date" column header
Then the list is sorted by date descending
And the "Date" header shows a descending arrow indicator
```

### Search/Filter

```gherkin
Given I am on the {entity} list
When I type "{term}" in the search box
Then I see only {entities} matching "{term}" in name or description
```

### Authentication/Authorization

```gherkin
Given I am not logged in
When I navigate to {protected route}
Then I am redirected to the login page
And I see "Please log in to access this page"
```

```gherkin
Given I am logged in as a user with role "{viewer_role}"
When I attempt to access the admin settings
Then I see "Access denied. Admin privileges required."
```

## Mapping to Test Cases

Each acceptance criterion maps to one or more automated test cases:

| Criterion Type | Test Level | Example Test |
|---------------|------------|--------------|
| Happy path | Integration + E2E | `test_create_project_with_valid_data` |
| Edge case | Unit + Integration | `test_create_project_with_max_characters` |
| Error case | Unit | `test_create_project_with_empty_name` |
| Security | Integration | `test_unauthenticated_user_cannot_create_project` |
| Performance | Load | `test_create_project_response_time_under_500ms` |

## Review Checklist

For each acceptance criterion:

- [ ] Is it written in Given/When/Then format?
- [ ] Is it objectively verifiable (pass/fail)?
- [ ] Does it avoid implementation details?
- [ ] Are values specific (numbers, messages, states)?
- [ ] Does it cover exactly one behavior?
- [ ] Is it independent of other criteria?
- [ ] Can it be automated in a test?
