# Pulumi Testing Strategies

## Unit Testing
Pulumi programming model tests: validate infrastructure logic. Mocks: pulumi.runtime.Mocks for mocking resource calls. Test inputs: validate inputs are passed correctly to resources. Test transformations: validate resource transformation logic. Go testing with testing.T, Node with jest/mocha.

## Integration Testing
pulumi up --test: use ProgramTest framework. Create resources, validate state, then destroy. Validate outputs: check stack outputs for expected values. Validate resource properties: check specific resource properties. Skip create: use pulumi.Provider for existing infrastructure.

## Policy as Code
CrossGuard: Pulumi policy as code with OPA-like rules. ValidateResource: check resource type, name, properties before creation. Enforce tags: every resource must have CostCenter tag. Enforce region: restrict to allowed regions. Enforce encryption: require encryption for all storage resources.

## Stack Validation
Preview validation: analyze preview output for planned changes. Drift detection: detect manual changes outside Pulumi. Compliance validation: check infrastructure against security policy. Cost estimation: estimate cost changes before deployment. Output validation: verify outputs contain expected values.

## CI/CD for Pulumi
GitHub Actions: pulumi up with preview on PR. Review stack: comment on PR with detailed deployment diff. Auto-merge: merge and deploy after approval. Stack tagging: link stack to environment (dev/staging/prod). Policy enforcement: run CrossGuard policies in CI pipeline.

## Test Fixtures
Test stacks: isolated stacks for testing. Ephemeral infrastructure: create and destroy in test run. Parallelism: isolated project names for parallel test runs. Resource naming: include test run ID in resource names. Cleanup: always destroy test resources (defer in code).

## References
- pulumi-fundamentals.md -- Fundamentals
- programming-models.md -- Programming Models
- state-backends.md -- State Management
- aws-resources.md -- AWS Resources
- kubernetes-provider.md -- Kubernetes Provider
