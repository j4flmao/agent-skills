# Nomad Integrations

## Consul Connect (Service Mesh)

```hcl
group "web" {
  network {
    mode = "bridge"
  }

  service {
    name = "web"
    port = "http"
    connect {
      sidecar_service {
        proxy {
          upstreams {
            destination_name = "api"
            local_bind_port  = 8080
          }
        }
      }
    }
  }

  task "web" {
    driver = "docker"
    config {
      image = "org/web:latest"
      args  = ["8080"] # Local proxy port
    }
  }
}
```

| Feature | Benefit |
|---------|---------|
| mTLS | Automatic encryption between services |
| Service discovery | Consul DNS or API for locating upstreams |
| L7 routing | Traffic split, header routing |
| Observability | Envoy metrics, access logs |
| Intentions | Service-level access control |

## Vault Integration

```hcl
task "app" {
  vault {
    policies = ["app-read"]
    env = true  # Inject Vault secrets as env vars
  }

  template {
    data = <<EOH
    {{ with secret "database/creds/app" }}
    DB_USERNAME = {{ .Data.username }}
    DB_PASSWORD = {{ .Data.password }}
    {{ end }}
    EOH
    destination = "local/secrets.env"
    env = true
  }
}
```

| Pattern | Use Case |
|---------|----------|
| Vault agent sidecar | Dynamic secrets, auto-renewal |
| Template + Vault | Render secrets from Vault in template |
| Vault env inject | Secrets as environment variables |
| Vault PKI | Dynamic certificate generation |

## CSI Volumes

```hcl
volume "db-data" {
  type      = "csi"
  plugin_id = "aws-ebs"
  capacity_min = "50GiB"
  capacity_max = "100GiB"

  capability {
    access_mode     = "single-node-writer"
    attachment_mode = "file-system"
  }
}

group "database" {
  volume "db-data" {
    type      = "csi"
    source    = "db-data"
    access_mode = "single-node-writer"
  }

  task "postgres" {
    driver = "docker"
    volume_mount {
      volume      = "db-data"
      destination = "/var/lib/postgresql/data"
    }
  }
}
```

## Multi-Region Deployment

```hcl
job "multi-region-app" {
  datacenters = ["us-east", "eu-west", "ap-southeast"]

  # Region-specific config via variable
  task "app" {
    driver = "docker"
    env {
      REGION = "${meta.region}"
    }
  }
}
```

| Strategy | When |
|----------|------|
| Multi-region single job | Global service with local data |
| Per-region jobs | Independent regional deployments |
| Active-passive | Primary region + DR region |
| Active-active | Traffic split across regions |
