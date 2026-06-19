# Contexts, Environments, and CLI

## CircleCI Contexts
Contexts store environment variables shared across projects. Create in CircleCI web UI → Organization Settings → Contexts. Restrict contexts to specific security groups. Use contexts for: cloud credentials, API keys, deployment targets. Context variable precedence: Project vars < Context vars. Vars are encrypted at rest and masked in builds.

## Environment Variables
Project-level: set in Project Settings → Environment Variables. Organization-level: shared contexts for org-wide vars. Per-job vars defined in config.yml with environment key. Avoid hardcoding secrets in config.yml. Use contexts for cross-project variable sharing. Masked vars: CircleCI auto-masks known secret values.

## CircleCI CLI
circleci local execute Run job locally. circleci config validate Validate YAML config. circleci config process Process config (include resolution). circleci orb list List orbs. circleci orb publish Publish orb. circleci orb validate Validate orb. circleci runner --help Runner management. circleci diagnostic System diagnostic.

## API Usage
Trigger pipeline: POST /api/v2/project/{slug}/pipeline. Get pipeline: GET /api/v2/project/{slug}/pipeline/{id}. Cancel workflow: POST /api/v2/workflow/{id}/cancel. Approve job: POST /api/v2/workflow/{id}/approve/{approval_request_id}. API token scoped to specific operations. Rate limiting: 2000 requests/hour for free plan.

## SSH Debugging
Re-run failed job with SSH enabled. SSH keys added to project settings for access. Connect: ssh -p 64654 <hostname> provided in job output. Debug: inspect filesystem, test commands, verify config. Rerun triggers rebuild with SSH server running. Container remains for 1 hour after job completes.

## Caching Strategies
Cache keys with granularity: {{ .Branch }}-{{ checksum "package-lock.json" }}. Fallback cache keys for partial cache hits. Save cache at end of job. Restore cache in dependency installation step. Multiple cache entries per job.

## References
- circleci-fundamentals.md -- Fundamentals
- config-structure.md -- Config Structure
- performance-optimization.md -- Performance
