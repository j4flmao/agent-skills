# Helm Best Practices

## Security

```yaml
# Pod Security Context
securityContext:
  runAsNonRoot: true
  runAsUser: 1001
  fsGroup: 1001
  seccompProfile:
    type: RuntimeDefault

# Container Security Context
containerSecurityContext:
  allowPrivilegeEscalation: false
  capabilities:
    drop: ["ALL"]
  readOnlyRootFilesystem: true
```

## Values Schema

```yaml
# values.schema.json — validate values at install/upgrade time
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["image", "service"],
  "properties": {
    "replicaCount": { "type": "integer", "minimum": 1 },
    "image": {
      "type": "object",
      "required": ["repository", "tag"],
      "properties": {
        "repository": { "type": "string" },
        "tag": { "type": "string", "pattern": "^v?[0-9]+\\.[0-9]+\\.[0-9]+$" }
      }
    }
  }
}
```

## Naming

- `_helpers.tpl` for all computed names. Never hardcode resource names.
- All names truncated to 63 characters (K8s limit).
- Use `app.kubernetes.io/name`, `app.kubernetes.io/instance` labels.
