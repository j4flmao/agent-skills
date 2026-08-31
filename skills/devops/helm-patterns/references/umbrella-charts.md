# Helm Patterns: Umbrella Charts

## 1. Complex Microservice Deployments
Deploying a single microservice with Helm is simple. But deploying a full ecosystem (e.g., Frontend, Backend, Redis, Postgres, Kafka) requires managing multiple charts and their interdependencies.

## 2. The Umbrella Chart Pattern
An Umbrella Chart is a Helm chart that contains no templates of its own. Instead, it declares all the microservices as **Dependencies** in its `Chart.yaml`.

### Directory Structure
```text
my-product-umbrella/
├── Chart.yaml
├── values.yaml
├── charts/          # Downloaded dependencies go here
└── templates/       # Usually empty
```

### Chart.yaml Declaration
```yaml
apiVersion: v2
name: my-product
version: 1.0.0
dependencies:
  - name: frontend-ui
    version: 1.2.0
    repository: "https://my-org.github.io/helm-charts"
  - name: backend-api
    version: 2.0.1
    repository: "https://my-org.github.io/helm-charts"
  - name: postgresql
    version: 12.1.0
    repository: "https://charts.bitnami.com/bitnami"
```

## 3. Global Values Overriding
The power of the Umbrella chart is the ability to override configurations for all sub-charts from a single `values.yaml` file.

```yaml
# values.yaml in the Umbrella Chart
global:
  environment: production
  imagePullSecrets:
    - name: ecr-registry-cred

# Overriding specific sub-chart values
backend-api:
  replicaCount: 5
  databaseUrl: "jdbc:postgresql://postgresql-primary:5432/mydb"

postgresql:
  auth:
    postgresPassword: "supersecret"
```
