# Jenkins Best Practices

## Pipeline Structure
- All pipelines declarative, not scripted.
- Shared library for reusable pipeline code.
- Environment variables for config, not hardcoded values.
- `post { always { cleanWs() } }` to clean workspace.

## Secret Management
- Credentials via `withCredentials([string(credentialsId: '...', variable: 'VAR')])`.
- Never use `env.VAR = 'secret'` — exposes in logs.
- Credential IDs stored in Jenkins, not in Jenkinsfile.
