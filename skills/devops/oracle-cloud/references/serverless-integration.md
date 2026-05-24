# Serverless and Integration

## Functions (Fn Project)

```hcl
# OCI Functions application
resource "oci_functions_application" "app" {
  compartment_id = var.compartment_ocid
  display_name   = "serverless-app"
  subnet_ids     = [oci_core_subnet.private.id]
  shape          = "GENERIC_ARM"
  config = {
    "LOG_LEVEL" = "INFO"
    "DB_CONNECTION_STRING" = oci_database_autonomous_database.atp.connection_strings["high"]
  }
  syslog_url = "tcp://logs.svc:514"
  trace_config {
    is_enabled = true
  }
}
```

### Function Code Examples

```python
# Python function (func.py)
import io
import json
import logging
import oci
from fdk import response

def handler(ctx, data: io.BytesIO = None):
    name = "World"
    try:
        body = json.loads(data.getvalue())
        name = body.get("name", "World")
    except Exception:
        logging.getLogger().error("Invalid JSON payload")

    # Use OCI SDK with resource principal
    signer = oci.auth.signers.get_resource_principals_signer()
    object_storage = oci.object_storage.ObjectStorageClient(
        config={}, signer=signer
    )

    return response.Response(
        ctx,
        response_data=json.dumps({"message": f"Hello {name}", "method": "Python"}),
        headers={"Content-Type": "application/json"}
    )
```

```javascript
// Node.js function (func.js)
const { parseBody } = require('@fnproject/fdk');
const os = require('oci-sdk');

module.exports.handler = async function (ctx, input) {
  const body = input ? JSON.parse(Buffer.from(input).toString()) : {};
  const name = body.name || 'World';

  const provider = new os.common.ResourcePrincipalAuthenticationDetailsProvider();
  const client = new os.objectstorage.ObjectStorageClient({ authenticationDetailsProvider: provider });

  const bucket = process.env.BUCKET_NAME;
  return {
    statusCode: 200,
    body: JSON.stringify({ message: `Hello ${name}`, bucket }),
  };
};
```

### Deploying Functions

```bash
# Create application
fn create app serverless-app --annotation oracle.com/oci/subnetIds='["ocid1.subnet.oc1..example"]'

# Initialize function
fn init --runtime python hello-func
cd hello-func

# Deploy
fn deploy --app serverless-app

# Invoke
fn invoke serverless-app hello-func
echo '{"name":"OCI"}' | fn invoke serverless-app hello-func

# List functions
fn list functions serverless-app

# Update function config
fn update config serverless-app hello-func LOG_LEVEL DEBUG
```

## API Gateway

```hcl
resource "oci_apigateway_gateway" "gw" {
  compartment_id = var.compartment_ocid
  display_name   = "api-gateway"
  endpoint_type  = "PUBLIC"
  subnet_id      = oci_core_subnet.public.id
  certificate_authority_id = oci_certificates_authority.ca.id

  response_cache_details {
    type              = "EXTERNAL_RESP_CACHE"
    authentication_secret_id   = oci_kms_key.cache.id
    authentication_secret_version_number = 1
    server {
      hostname = "cache.example.com"
      port     = 6379
    }
  }
}

resource "oci_apigateway_deployment" "api" {
  compartment_id = var.compartment_ocid
  gateway_id     = oci_apigateway_gateway.gw.id
  display_name   = "v1-api"
  path_prefix    = "/v1"

  specification {
    logging_policy {
      access_log {
        is_enabled = true
      }
      execution_log {
        is_enabled = true
        log_level  = "INFO"
      }
    }

    routes {
      path    = "/users"
      methods = ["GET"]
      backend {
        type = "ORACLE_FUNCTIONS_BACKEND"
        function_id = oci_functions_application.app.id
      }
    }

    routes {
      path    = "/orders"
      methods = ["POST"]
      backend {
        type = "HTTP_BACKEND"
        url  = "http://10.0.1.100:3000/orders"
      }
    }

    request_policies {
      authentication {
        type           = "CUSTOM_AUTHENTICATION"
        function_id    = oci_functions_application.app.id
        token_header   = "Authorization"
        is_functions_based = true
      }
      rate_limiting {
        rate_in_requests_per_second = 100
      }
      cors {
        allowed_origins = ["https://app.example.com"]
        allowed_methods = ["GET", "POST", "PUT", "DELETE"]
        allowed_headers = ["Authorization", "Content-Type"]
        is_cors_enabled = true
      }
    }
  }
}
```

## Events and Notifications

```hcl
# Events service
resource "oci_events_rule" "object_events" {
  compartment_id = var.compartment_ocid
  display_name   = "object-create-events"
  description    = "Trigger when objects are created"
  is_enabled     = true

  condition = <<-EOF
  {
    "eventType": ["com.oraclecloud.objectstorage.createobject"],
    "data": {
      "compartmentName": "Production"
    }
  }
  EOF

  actions {
    actions {
      action_type = "OSS"
      is_enabled  = true
      function_id = oci_functions_application.app.id
    }
    actions {
      action_type = "ONS"
      is_enabled  = true
      topic_id    = oci_ons_notification_topic.ops.id
    }
  }
}

# Notifications (ONS)
resource "oci_ons_notification_topic" "ops" {
  compartment_id = var.compartment_ocid
  name           = "ops-alerts"
  description    = "Operational alerts"
}

resource "oci_ons_subscription" "email" {
  compartment_id = var.compartment_ocid
  topic_id       = oci_ons_notification_topic.ops.id
  protocol       = "EMAIL"
  endpoint       = "ops-team@example.com"
}

resource "oci_ons_subscription" "pagerduty" {
  compartment_id = var.compartment_ocid
  topic_id       = oci_ons_notification_topic.ops.id
  protocol       = "PAGERDUTY"
  endpoint       = "https://events.pagerduty.com/integration/abc123"
}
```

## Streaming

```hcl
resource "oci_streaming_stream_pool" "main" {
  compartment_id = var.compartment_ocid
  name           = "app-stream-pool"

  custom_encryption_key {
    kms_key_id = oci_kms_key.app.id
  }

  private_endpoint_settings {
    subnet_id = oci_core_subnet.private.id
    nsg_ids   = [oci_core_network_security_group.stream.id]
  }
}

resource "oci_streaming_stream" "events" {
  compartment_id = var.compartment_ocid
  name           = "app-events"
  partitions     = 3
  stream_pool_id = oci_streaming_stream_pool.main.id
  retention_in_hours = 24
}
```

### Streaming Producer/Consumer

```python
# Producer
import oci

config = oci.config.from_file()
client = oci.streaming.StreamClient(config)
stream_id = "ocid1.stream.oc1..example"

messages = [
    {"key": "user-1", "value": '{"event": "login", "user": "alice"}'},
    {"key": "user-2", "value": '{"event": "purchase", "user": "bob"}'},
]

put_result = client.put_messages(
    stream_id,
    oci.streaming.models.PutMessagesDetails(messages=messages)
)
```

```bash
# CLI: produce messages
oci streaming stream put-messages \
  --stream-id ocid1.stream.oc1..example \
  --messages '[{"key":"user-1","value":"{\"event\":\"login\"}"}]'

# CLI: consume messages
oci streaming stream get-messages \
  --stream-id ocid1.stream.oc1..example \
  --cursor <cursor>
```

## Service Connector Hub (SCH)

```hcl
resource "oci_sch_service_connector" "logs_pipeline" {
  compartment_id = var.compartment_ocid
  display_name   = "logs-to-object-storage"
  description    = "Forward all VCN flow logs to Object Storage"

  source {
    kind = "logging"
    log_sources {
      compartment_id = var.compartment_ocid
      log_group_id   = oci_logging_log_group.all_logs.id
    }
  }

  target {
    kind      = "objectStorage"
    bucket    = oci_objectstorage_bucket.logs.name
    namespace = data.oci_objectstorage_namespace.ns.namespace
    object_name_prefix = "vcn-flow-logs"
    batch_size_in_kbs  = 1024
    batch_size_in_num  = 100
    batch_time_in_sec  = 30
  }

  tasks {
    kind = "filter"
    filter_kind = "log"
    # Filter only error-level logs
    condition = "logLevel >= 'WARN'"
  }
}
```

## Integration Cloud (OIC)

```hcl
resource "oci_integration_integration_instance" "oic" {
  compartment_id        = var.compartment_ocid
  display_name          = "production-oic"
  integration_instance_type = "ENTERPRISE"
  message_packs         = 10
  is_byol               = false
  shape_name            = "OIC_E2"
  network_endpoint_details {
    network_endpoint_type = "PRIVATE"
    subnet_id            = oci_core_subnet.private.id
    nsg_ids              = [oci_core_network_security_group.oic.id]
  }

  alternative_custom_endpoint {
    hostname = "oic.app.example.com"
    certificate_authority_id = oci_certificates_authority.ca.id
  }
}
```

## Architecture Patterns

| Pattern | Services | Use Case |
|---------|----------|----------|
| Event-driven processing | Events → Functions → Streaming → Object Storage | File processing, ETL |
| API-first serverless | API Gateway → Functions → ATP | REST APIs, microservices |
| Log aggregation | SCH → Object Storage | Centralized logging |
| Stream processing | Streaming → Functions → Streaming | Real-time analytics |
| Integration backbone | OIC + Functions | SaaS integration, EDI |
| Notification pipeline | Events → Notifications | Alerts, workflows |

## Best Practices

- Use resource principal authentication in Functions (no API keys)
- Keep Functions stateless and idempotent
- Set function timeouts appropriately (default 30s, max 300s)
- Use API Gateway rate limiting and authentication for public APIs
- Enable CORS only for known origins in API Gateway
- Use SCH for log aggregation rather than custom agents
- Partition Streams based on throughput (1 partition ≈ 1 MB/s write, 2 MB/s read)
- Enable encryption at rest for Stream pools with Vault keys
- Use private endpoints for Streams and API Gateway where possible
- Use Events for automated responses to infrastructure changes
- Set up ONS subscriptions for human + automated alerts (email + PagerDuty)
