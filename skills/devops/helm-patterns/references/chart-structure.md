# Chart Structure Reference

## Full Structure

```
my-chart/
├── Chart.yaml          # apiVersion, name, version, description, dependencies
├── values.yaml         # Default configuration values
├── values.schema.json  # JSON schema for values validation
├── templates/
│   ├── _helpers.tpl    # Named templates (labels, names, selectors)
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   ├── configmap.yaml
│   ├── secret.yaml
│   ├── hpa.yaml
│   ├── pdb.yaml
│   └── tests/
│       └── test-connection.yaml
├── charts/             # Packed dependency charts (helm dependency build)
├── ci/                 # CI test values
└── README.md
```

## Chart.yaml

```yaml
apiVersion: v2
name: myapp
description: My application
type: application
version: 0.1.0
appVersion: "1.16.0"
dependencies:
  - name: postgresql
    version: "12.x"
    repository: https://charts.bitnami.com/bitnami
    condition: postgresql.enabled
```
