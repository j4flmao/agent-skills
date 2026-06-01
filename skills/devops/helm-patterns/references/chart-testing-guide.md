# Helm Chart Testing

## Chart Testing Framework
ct (chart-testing): validate charts before PR merge. Checks: YAML lint, template render, install, upgrade, lint. GitHub Actions workflow with ct install for integration testing. Kind (Kubernetes in Docker) for local cluster testing. Gap: ct does not validate chart logic beyond basic install.

## Unit Testing with unittest
helm-unittest: validate templates without cluster. Test structure: tests/ directory with YAML test files. Assertions: template renders correctly, specific values set. Snapshot testing: compare rendered output against baseline. Template rendering with different values files.

## Integration Testing
Kind cluster: ephemeral cluster for chart validation. Install chart in kind cluster with desired values. Verify chart works: pods running, service endpoints, ingress working. Test upgrades: install old version then upgrade to new. Test uninstall: verify cleanup of resources.

## Template Assertions
AssertTemplate: verify template renders without error. AssertValues: verify values are correctly passed. AssertOutput: verify specific YAML path contains expected value. AssertSnapshot: compare rendered output to stored snapshot. FailedTemplate assertions: verify error handling conditions.

## Chart Schema Validation
values.schema.json: JSON Schema for values validation. Schema types: string, number, object, array, enum. Required fields: ensure mandatory values provided. Pattern validation: regex for string values (e.g., image tag format). Schema testing: validate schema rejects invalid values.

## Golden File Testing
Render templates with known-good values file. Store rendered output as golden files. Compare PR render output against golden files. Detect unexpected changes in rendered YAML. Update golden files when intentional changes made.

## References
- helm-patterns-fundamentals.md -- Fundamentals
- chart-structure.md -- Chart Structure
- helm-best-practices.md -- Best Practices
- helm-security.md -- Security
- helmfile-deploy.md -- Helmfile
