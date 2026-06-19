# OPA Policy Testing

## Running OPA Tests
```bash
# Run all policy tests
opa test ./policies/

# Run with coverage
opa test ./policies/ --coverage

# Run specific test file
opa test ./policies/authz_test.rego

# CI integration
opa test ./policies/ --format json --fail
```

## Test Structure
```rego
package authz_test

import data.authz

# Positive test
test_admin_can_delete {
    authz.allow with input as {
        "subject": {"role": "admin"},
        "resource": {"classification": "restricted"},
        "action": {"type": "delete"},
        "environment": {"time": 14},
    }
}

# Negative test
test_user_cannot_delete {
    not authz.allow with input as {
        "subject": {"role": "user"},
        "resource": {"classification": "internal"},
        "action": {"type": "delete"},
        "environment": {"time": 14},
    }
}
```

## Mocking External Data
```rego
# Mock data for testing
allow {
    data.users[input.subject.id].department == "engineering"
    data.resources[input.resource.id].classification == "internal"
}

# Test with mock data
test_engineering_user {
    result := allow with input as {"subject": {"id": "user1"}, "resource": {"id": "doc1"}}
         with data.users as {"user1": {"department": "engineering"}}
         with data.resources as {"doc1": {"classification": "internal"}}
    result == true
}
```

## Key Points
- OPA has built-in test framework (no external tools needed)
- Test both positive (should allow) and negative (should deny) cases
- Use `with` keyword to mock input and external data
- Run tests in CI as part of policy deployment pipeline
- Use coverage reports to identify untested policy paths
