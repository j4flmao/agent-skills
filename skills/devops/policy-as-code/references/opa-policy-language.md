# OPA/Rego Deep Dive

Rego is a declarative policy language designed for OPA (Open Policy Agent). It enables fine-grained, context-aware policy decisions.

## Rego Syntax Basics

### Rules

```rego
# Boolean rule (true/false)
allow {
    input.role == "admin"
}

# Complete rule with value
max_replicas := 10 {
    input.environment == "production"
}

# Default value (avoid undefined)
default allow := false
default max_replicas := 3
```

### Comprehensions

```rego
# Array comprehension
valid_names := [name | name := input.users[_].name]

# Set comprehension (deduplicated)
unique_roles := {role | role := input.users[_].role}

# Object comprehension
user_roles := {user: role |
    user := input.users[_]
    role := user.role
}
```

### Iteration

```rego
# Iterate over array
violation[msg] {
    container := input.containers[_]
    container.securityContext.readOnlyRootFilesystem != true
    msg := sprintf("container %v must have read-only rootfs", [container.name])
}

# Iterate over object
violation[msg] {
    label := input.labels[_]
    not startswith(label, "app.kubernetes.io/")
    msg := sprintf("label %v must start with app.kubernetes.io/", [label])
}
```

## Schema Validation

```rego
# Validate against a JSON schema
package kubernetes.admission

import future.keywords.if
import future.keywords.in

deny contains msg if {
    input.request.kind.kind == "Pod"
    some container in input.request.object.spec.containers
    not container.resources.limits
    msg := sprintf("container %v has no resource limits", [container.name])
}

# With schema reference
# OPA can validate Rego against type schemas:
# opa eval --schema schemas/kubernetes.json -d policy.rego
```

## Built-in Functions

### String Functions

```rego
contains(input.host, "example.com")
startswith(input.name, "prod-")
endswith(input.name, "-service")
regex.match("^v[0-9]+\\.[0-9]+\\.[0-9]+$", input.version)
sprintf("hello %v", [input.name])
lower(input.name)
upper(input.name)
trim(input.name, "-")
```

### Aggregate Functions

```rego
count(input.containers) > 1
sum([1, 2, 3]) == 6
max([1, 5, 3]) == 5
min([1, 5, 3]) == 1
any([true, false, false])  # true
all([true, true])           # true
```

### Array/Object Functions

```rego
array.concat(array1, array2)
object.get(obj, "key", "default")
object.keys(obj)
object.union(obj1, obj2)
json.marshal(input)
json.unmarshal(input_str)
```

### Time Functions

```rego
time.now_ns()
time.parse_rfc3339("2026-05-24T10:00:00Z")
time.add_date(time.now_ns(), 0, 0, 7)  # +7 days
```

## Coverage

Generate and view policy coverage:

```bash
# Run tests with coverage
opa test -c policy.rego policy_test.rego --coverage

# Format output
opa test -c policy.rego policy_test.rego --coverage --format=json

# Coverage report
opa test -c policy.rego policy_test.rego --coverage \
  --format=html > coverage.html
```

## Advanced Patterns

### Data References

```rego
# Allow if user is in admin group
allow {
    data.roles.admins[_] == input.user
}

# Namespace-specific rules
deny[msg] {
    input.request.namespace in data.allowed_namespaces
    not input.request.object.metadata.namespace == input.request.namespace
}
```

### Rule Composition

```rego
allow {
    allow_by_owner
    not deny
}

allow_by_owner {
    input.request.userInfo.username == "admin"
}

deny {
    input.request.operation == "DELETE"
    input.request.kind.kind == "Namespace"
}
```

### Mocking for Tests

```rego
package test

import data.policy

test_allow_admin {
    policy.allow with input as {"user": "admin", "role": "admin"}
}

test_deny_user {
    not policy.allow with input as {"user": "bob", "role": "viewer"}
}
```

## Performance Optimization

```rego
# BAD - O(n) for each match
violation[msg] {
    c := input.containers[_]
    c.image == "latest"
}

# GOOD - use index
violation[msg] {
    c := input.containers[_]
    endswith(c.image, ":latest")
}

# Use negation carefully
# Prefer explicit allow rules over double negation
```

## CLI Usage

```bash
# Evaluate
opa eval -i input.json -d policy.rego "data.policy.allow"

# Test
opa test policy.rego policy_test.rego -v

# Format
opa fmt -w policy.rego

# Check syntax
opa check policy.rego

# Build bundle
opa build -b . -o bundle.tar.gz
```

Rego's declarative nature and powerful built-in functions make it ideal for expressing complex policy logic across diverse domains.
