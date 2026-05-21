# Apache APISIX Gateway Configuration

## Admin API — Create Route

```yaml
# Create route via Admin API
curl http://127.0.0.1:9180/apisix/admin/routes/1 -X PUT -d '
{
  "name": "user-route",
  "uri": "/api/users/*",
  "methods": ["GET", "POST", "PUT", "DELETE"],
  "hosts": ["api.example.com"],
  "plugins": {
    "jwt-auth": {
      "header": "Authorization"
    },
    "limit-count": {
      "count": 100,
      "time_window": 60,
      "key": "consumer_name",
      "rejected_code": 429,
      "policy": "redis",
      "redis_host": "redis.internal",
      "redis_port": 6379
    },
    "cors": {
      "allow_origins": "https://app.example.com",
      "allow_methods": "GET,POST,PUT,DELETE",
      "allow_headers": "Authorization,Content-Type",
      "expose_headers": "X-RateLimit-Remaining",
      "allow_credential": true
    },
    "prometheus": {
      "prefer_name": true
    },
    "proxy-cache": {
      "cache_ttl": 30,
      "cache_methods": ["GET"],
      "cache_http_status": [200]
    }
  },
  "upstream": {
    "type": "roundrobin",
    "nodes": {
      "users.internal:8080": 1
    },
    "checks": {
      "active": {
        "type": "http",
        "http_path": "/health",
        "healthy": {
          "interval": 10,
          "successes": 3
        },
        "unhealthy": {
          "interval": 5,
          "http_failures": 3,
          "tcp_failures": 2
        }
      },
      "passive": {
        "type": "http",
        "healthy": {
          "http_statuses": [200, 201]
        },
        "unhealthy": {
          "http_statuses": [429, 503],
          "http_failures": 3,
          "tcp_failures": 3
        }
      }
    },
    "retries": 2,
    "timeout": {
      "connect": 5,
      "send": 10,
      "read": 10
    }
  }
}'
```

## Declarative Config (APISIX >= 3.0)

```yaml
# config.yaml
apisix:
  admin_key: edd1c9f034335f136f87ad84b625c8f1
  enable_admin: true

plugins:
  - jwt-auth
  - limit-count
  - limit-req
  - cors
  - prometheus
  - proxy-cache
  - key-auth
  - basic-auth
  - oidc
  - oauth2
  - ip-restriction
  - uri-blocker
  - serverless
  - openwhisk
  - aws-lambda
  - grpc-transcode
  - kafka-logger
  - syslog
  - udp-logger
  - http-logger
  - skywalking
  - opentelemetry
  - request-id
  - response-rewrite
  - proxy-rewrite
  - fault-injection
  - traffic-split
  - batch-requests
  - redirect
  - api-breaker

plugin_attr:
  prometheus:
    export_addr:
      ip: 0.0.0.0
      port: 9091

deployment:
  admin:
    admin_listen:
      ip: 0.0.0.0
      port: 9180
  role: traditional
  role_traditional:
    config_provider: yaml
  etcd:
    host:
      - "http://etcd:2379"
    prefix: "/apisix"
    timeout: 30
```

## Route with Multiple Upstreams (Weighted)

```json
{
  "name": "canary-route",
  "uri": "/api/orders/*",
  "upstream": {
    "type": "chash",
    "hash_on": "header",
    "key": "x-user-id",
    "nodes": {
      "orders-v1.internal:8080": 90,
      "orders-v2.internal:8080": 10
    }
  }
}
```

## Traffic Split Plugin (Canary)

```json
{
  "name": "traffic-split-route",
  "uri": "/api/orders/*",
  "plugins": {
    "traffic-split": {
      "rules": [
        {
          "match": [
            {
              "vars": [
                ["arg_user_id", "~~", "^user_.*"]
              ]
            }
          ],
          "weighted_upstreams": [
            {
              "upstream": {
                "name": "canary_upstream",
                "type": "roundrobin",
                "nodes": {
                  "orders-v2.internal:8080": 1
                }
              },
              "weight": 10
            },
            {
              "weight": 90
            }
          ]
        }
      ]
    }
  },
  "upstream": {
    "type": "roundrobin",
    "nodes": {
      "orders-v1.internal:8080": 1
    }
  }
}
```

## Authentication Plugins

### JWT Auth
```json
{
  "plugins": {
    "jwt-auth": {
      "header": "Authorization",
      "query": "jwt",
      "cookie": "jwt",
      "alg": "HS256",
      "secret": "my-jwt-secret",
      "base64_secret": false,
      "exp": 86400,
      "nbf": true,
      "clock_skew": 60
    }
  }
}
```

### Key Auth
```json
{
  "plugins": {
    "key-auth": {
      "key": "api-key-value",
      "header": "X-API-Key",
      "hide_credentials": true
    }
  }
}
```

### OIDC
```json
{
  "plugins": {
    "oidc": {
      "client_id": "my-client",
      "client_secret": "my-secret",
      "discovery": "https://auth.example.com/.well-known/openid-configuration",
      "scope": "openid profile email",
      "bearer_only": false,
      "introspection_endpoint_auth_method": "client_secret_post",
      "redirect_uri": "https://api.example.com/callback",
      "logout_path": "/logout"
    }
  }
}
```

## Rate Limiting Plugins

### limit-count (Fixed Window)
```json
{
  "plugins": {
    "limit-count": {
      "count": 100,
      "time_window": 60,
      "key": "consumer_name",
      "policy": "redis",
      "redis_host": "redis.internal",
      "redis_port": 6379,
      "redis_database": 0,
      "redis_timeout": 1000,
      "rejected_code": 429,
      "show_limit_headers": true
    }
  }
}
```

### limit-req (Token Bucket)
```json
{
  "plugins": {
    "limit-req": {
      "rate": 100,
      "burst": 200,
      "key": "remote_addr",
      "rejected_code": 429,
      "nodelay": true
    }
  }
}
```

## API Breaker (Circuit Breaker)

```json
{
  "plugins": {
    "api-breaker": {
      "break_response_code": 503,
      "max_breaker_sec": 60,
      "unhealthy": {
        "http_statuses": [500, 502, 503],
        "failures": 5
      },
      "healthy": {
        "http_statuses": [200],
        "successes": 3
      }
    }
  }
}
```

## gRPC Transcoding

```json
{
  "name": "grpc-route",
  "uri": "/api/users/*",
  "plugins": {
    "grpc-transcode": {
      "proto_dir": "/etc/apisix/proto",
      "proto_file": "user.proto",
      "service": "user.UserService",
      "method": "CreateUser",
      "content_type": "application/json"
    }
  },
  "upstream": {
    "type": "roundrobin",
    "nodes": {
      "users-grpc.internal:50051": 1
    }
  },
  "service_protocol": "grpc"
}
```

## Observability Plugins

### OpenTelemetry
```json
{
  "plugins": {
    "opentelemetry": {
      "collector": {
        "address": "otel-collector:4318",
        "request_timeout": 3,
        "request_headers": {
          "X-Auth-Token": "my-token"
        }
      },
      "sampler": {
        "name": "always_on"
      },
      "additional_attributes": ["route_name", "service_name"]
    }
  }
}
```

### Kafka Logger
```json
{
  "plugins": {
    "kafka-logger": {
      "broker_list": {
        "brokers": [
          {
            "host": "kafka.internal",
            "port": 9092
          }
        ]
      },
      "kafka_topic": "api-logs",
      "batch_max_size": 100,
      "inactive_timeout": 5
    }
  }
}
```

### Prometheus Metrics
```json
{
  "plugins": {
    "prometheus": {
      "prefer_name": true
    }
  }
}
```

## Fault Injection (Testing)

```json
{
  "plugins": {
    "fault-injection": {
      "abort": {
        "http_status": 503,
        "body": "{\"error\":\"service temporarily unavailable\"}",
        "percentage": 10,
        "vars": [
          ["arg_force_fail", "==", "true"]
        ]
      },
      "delay": {
        "duration": 2000,
        "percentage": 5
      }
    }
  }
}
```

## Consumer Configuration

```json
// Create consumer
curl http://127.0.0.1:9180/apisix/admin/consumers -X PUT -d '
{
  "username": "john_doe",
  "plugins": {
    "jwt-auth": {
      "key": "user-key",
      "secret": "my-secret"
    },
    "limit-count": {
      "count": 1000,
      "time_window": 60
    }
  }
}'
```

## K8s Ingress Controller

```yaml
apiVersion: apisix.apache.org/v2
kind: ApisixRoute
metadata:
  name: user-route
spec:
  http:
    - name: user-http
      match:
        hosts:
          - api.example.com
        paths:
          - /api/users/*
      backends:
        - serviceName: user-service
          servicePort: 8080
      plugins:
        - name: jwt-auth
          enable: true
        - name: limit-count
          enable: true
          config:
            count: 100
            time_window: 60
            key: remote_addr
---
apiVersion: apisix.apache.org/v2
kind: ApisixPluginConfig
metadata:
  name: global-rate-limit
spec:
  plugins:
    - name: limit-count
      enable: true
      config:
        count: 5000
        time_window: 60
        key: remote_addr
---
apiVersion: apisix.apache.org/v2
kind: ApisixTls
metadata:
  name: api-tls
spec:
  hosts:
    - api.example.com
  secret:
    name: api-tls-secret
```
