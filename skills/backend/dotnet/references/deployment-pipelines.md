# Deployment Pipelines for ASP.NET Core Services

CI/CD for .NET services: build and test in CI, produce container images (Dockerfile or SDK container publishing), run database migrations safely, and deploy to Kubernetes or Azure App Service. Examples target .NET 10 and GitHub Actions; the same steps apply in Azure DevOps or GitLab CI.

## Pipeline Stages

```text
restore -> build -> test (unit + integration) -> publish image -> scan -> deploy dev
        -> migrations (dev) -> smoke tests -> promote same image -> staging -> approval -> prod
```

Build once and promote the same image digest; environment differences come from configuration.

## GitHub Actions CI

```yaml
name: ci
on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read
  packages: write
  id-token: write          # OIDC to cloud providers, no stored credentials

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-dotnet@v4
        with:
          global-json-file: global.json
      - uses: actions/cache@v4
        with:
          path: ~/.nuget/packages
          key: nuget-${{ hashFiles('**/packages.lock.json', '**/Directory.Packages.props') }}
      - run: dotnet restore --locked-mode
      - run: dotnet build --no-restore -c Release
      - run: dotnet test --no-build -c Release --logger trx --collect:"XPlat Code Coverage"
      - name: Publish image
        if: github.ref == 'refs/heads/main'
        run: |
          echo "${{ secrets.GITHUB_TOKEN }}" | docker login ghcr.io -u ${{ github.actor }} --password-stdin
          docker build -t ghcr.io/${{ github.repository }}/orders-api:${{ github.sha }} .
          docker push ghcr.io/${{ github.repository }}/orders-api:${{ github.sha }}
```

`--locked-mode` requires `packages.lock.json` files (`<RestorePackagesWithLockFile>true</RestorePackagesWithLockFile>`), making restores reproducible. Integration tests using Testcontainers work on GitHub-hosted Ubuntu runners because Docker is available.

## Dockerfile

```dockerfile
# syntax=docker/dockerfile:1
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY Directory.Build.props Directory.Packages.props global.json ./
COPY src/Orders.Api/Orders.Api.csproj src/Orders.Api/
RUN dotnet restore src/Orders.Api/Orders.Api.csproj
COPY src/ src/
RUN dotnet publish src/Orders.Api/Orders.Api.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app .
USER $APP_UID
ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "Orders.Api.dll"]
```

- Official images since .NET 8 include a non-root `app` user (`APP_UID`) and listen on port 8080 by default.
- Smaller images: `-alpine`, `-noble-chiseled` (Ubuntu chiseled, no shell or package manager) variants; chiseled images suit production but make interactive debugging harder.
- Pin to a specific patch tag or digest in production pipelines and update deliberately (Dependabot/Renovate).

### SDK container publishing (no Dockerfile)

```bash
dotnet publish src/Orders.Api -c Release /t:PublishContainer \
  -p ContainerRepository=orders-api \
  -p ContainerImageTag=1.4.0 \
  -p ContainerRegistry=ghcr.io/example
```

Useful when no custom OS packages are needed; base image and user are configured through MSBuild properties.

## Native AOT

```xml
<PublishAot>true</PublishAot>
```

Native AOT reduces startup time and memory, which helps serverless and scale-to-zero. Limitations: no runtime code generation, limited reflection, and not all libraries are compatible (EF Core has partial support with compiled models). Minimal APIs support AOT with the request delegate generator; MVC controllers do not. Evaluate with the trimming/AOT analyzers before committing.

## Database Migrations (EF Core)

Do not call `Database.Migrate()` at application startup in multi-instance deployments: instances race and the app needs DDL permissions.

Options:
- **Migration bundles**: `dotnet ef migrations bundle --self-contained -r linux-x64 -o efbundle` produces an executable run once per deploy (pipeline step or Kubernetes Job) with a dedicated migration identity.
- **Idempotent SQL scripts**: `dotnet ef migrations script --idempotent -o migrate.sql`, reviewed and applied by a DBA tool or pipeline.

```bash
./efbundle --connection "$MIGRATION_CONNECTION_STRING"
```

Use expand/contract migrations so old and new application versions can run during a rolling update: add columns as nullable, deploy code that writes both, backfill, then remove old columns in a later release.

## Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: orders-api
spec:
  replicas: 3
  strategy:
    rollingUpdate: {maxUnavailable: 0, maxSurge: 1}
  selector: {matchLabels: {app: orders-api}}
  template:
    metadata: {labels: {app: orders-api}}
    spec:
      containers:
        - name: api
          image: ghcr.io/example/orders-api@sha256:<digest>
          ports: [{containerPort: 8080}]
          env:
            - name: ASPNETCORE_ENVIRONMENT
              value: Production
            - name: ConnectionStrings__Orders
              valueFrom: {secretKeyRef: {name: orders-db, key: connection-string}}
          readinessProbe:
            httpGet: {path: /health/ready, port: 8080}
          livenessProbe:
            httpGet: {path: /health/live, port: 8080}
          resources:
            requests: {cpu: 250m, memory: 256Mi}
            limits: {memory: 512Mi}
```

```csharp
builder.Services.AddHealthChecks()
    .AddDbContextCheck<OrdersDbContext>(tags: ["ready"]);

app.MapHealthChecks("/health/live", new() { Predicate = _ => false });
app.MapHealthChecks("/health/ready", new() { Predicate = c => c.Tags.Contains("ready") });
```

Liveness must not depend on external systems; otherwise a database outage restarts every pod. Configuration keys use `__` for nesting in environment variables.

## Azure App Service

- Deploy containers or zip packages; use deployment slots (`staging`) and swap for zero-downtime releases with warm-up.
- Use managed identity for Key Vault, SQL and Storage instead of connection string secrets.
- Mark slot-specific settings as "deployment slot settings" so they do not move during swaps.

## .NET Aspire

.NET Aspire provides an app host for local orchestration of services and dependencies, service defaults (OpenTelemetry, health checks, resilience), and deployment manifests consumed by `azd` or other tools. It is optional; adopt it for multi-service solutions where local orchestration and consistent defaults are valuable.

## Release Safety

| Technique | Purpose |
|-----------|---------|
| Rolling update with readiness probes | No traffic to unready pods |
| Canary or blue-green (Argo Rollouts, Flagger, App Service slots) | Limit blast radius |
| Feature flags (`Microsoft.FeatureManagement`) | Decouple deploy from release |
| Automated smoke tests after deploy | Catch config errors immediately |
| Fast rollback to previous digest | Recovery in minutes |

## Checklist

- [ ] SDK pinned; locked restore in CI
- [ ] Tests (unit + integration) gate image publishing
- [ ] Image runs as non-root, pinned base, scanned
- [ ] Same image digest promoted across environments
- [ ] Migrations run once per deploy via bundle or script, expand/contract style
- [ ] Separate liveness and readiness endpoints
- [ ] Secrets from a secret store or managed identity; OIDC for pipeline cloud access
