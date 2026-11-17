# Online Feature Serving Reference

## Feast Online Store

Feast provides low-latency feature retrieval for online inference through its online store.

### Online Store Types

```yaml
online_store_types:
  redis:
    description: "In-memory with persistence"
    latency_p99: "< 5ms for 100 features"
    throughput: "100,000+ QPS"
    scaling: "Redis Cluster for horizontal"
    cost: "Memory cost per GB"
    best_for: "Production serving, sub-10ms latency"

  dynamodb:
    description: "AWS managed, auto-scaling"
    latency_p99: "< 10ms for 100 features"
    throughput: "Auto-scaling"
    scaling: "DAX for lower latency"
    cost: "Pay per read/write capacity"
    best_for: "AWS-native, serverless inference"

  firestore:
    description: "GCP managed document store"
    latency_p99: "< 20ms for 100 features"
    throughput: "Auto-scaling"
    scaling: "Automatic sharding"
    cost: "Pay per read/GB"
    best_for: "GCP-native, small-medium scale"

  sqlite:
    description: "Local file-based store"
    latency_p99: "< 1ms (local)"
    throughput: "Limited to single process"
    scaling: "None (local)"
    cost: "Free"
    best_for: "Development, single-node testing"
```

### Redis Online Store Configuration

```yaml
# feature_store.yaml
project: ml_features
provider: aws
registry:
  path: s3://ml-registry/registry.db
  cache_ttl_seconds: 3600

online_store:
  type: redis
  connection_string: redis://redis-cluster:6379
  key_ttl_seconds: 86400  # 24 hour TTL on features
  password_encrypted: ${FEAST_REDIS_PASSWORD}
  
  # For Redis Cluster
  redis_type: redis_cluster
  
  # For Redis Sentinel (HA)
  # redis_type: redis_sentinel
  # sentinel_master: feast-master
  # sentinel_set:
  #   - host: sentinel-0:26379
  #   - host: sentinel-1:26379

offline_store:
  type: snowflake
  snowflake:
    warehouse: warehouse_name
    database: feature_store_db
    schema: offline
```

## Low-Latency Retrieval

### Feature Server API

```python
from feast import FeatureStore
import time

store = FeatureStore(repo_path="./feature_repo")

def get_features_batch(entity_ids: list[str], feature_refs: list[str]) -> dict:
    """Batch feature retrieval with latency tracking."""
    start = time.perf_counter()

    features = store.get_online_features(
        features=feature_refs,
        entity_rows=[{"user_id": eid} for eid in entity_ids],
    ).to_dict()

    elapsed_ms = (time.perf_counter() - start) * 1000

    return {
        "features": features,
        "latency_ms": round(elapsed_ms, 2),
        "entity_count": len(entity_ids),
        "feature_count": len(feature_refs),
    }

# Usage: retrieve features for a batch of users
result = get_features_batch(
    entity_ids=["user_1001", "user_1002", "user_1003"],
    feature_refs=[
        "user_features:total_orders_30d",
        "user_features:avg_order_value_30d",
        "user_features:days_since_last_order",
    ]
)
```

### gRPC Feature Server

```python
# Feast gRPC feature server (Java/Go recommended for production)
# Python-based for development/testing

from feast import FeatureStore
from concurrent import futures
import grpc
from feast.protos.feast.serving import FeatureService_pb2_grpc
from feast.protos.feast.serving import FeatureService_pb2

class OnlineServingServicer(FeatureService_pb2_grpc.FeatureServiceServicer):
    def __init__(self, repo_path: str):
        self.store = FeatureStore(repo_path=repo_path)

    def GetOnlineFeatures(self, request, context):
        """gRPC endpoint for online feature retrieval."""
        entity_rows = [
            {kv.key: kv.value for kv in row.fields}
            for row in request.entity_rows
        ]
        feature_refs = list(request.features.val)

        features = self.store.get_online_features(
            features=feature_refs,
            entity_rows=entity_rows,
        ).to_dict()

        # Convert to protobuf response
        response = FeatureService_pb2.GetOnlineFeaturesResponse()
        for feature_name, values in features.items():
            proto_field = response.features.add()
            proto_field.name = feature_name
            proto_field.values.extend(values)
        return response

def serve_grpc(port: int = 6566):
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    FeatureService_pb2_grpc.add_FeatureServiceServicer_to_server(
        OnlineServingServicer("./feature_repo"), server
    )
    server.add_insecure_port(f"[::]:{port}")
    server.start()
    server.wait_for_termination()
```

### REST Feature Server

```python
from flask import Flask, request, jsonify
from feast import FeatureStore
import time

app = Flask(__name__)
store = FeatureStore(repo_path="./feature_repo")

@app.route("/get-features", methods=["POST"])
def get_features():
    """REST endpoint for online feature retrieval."""
    data = request.json
    entity_ids = data.get("entity_ids", [])
    feature_refs = data.get("features", [])

    start = time.perf_counter()
    features = store.get_online_features(
        features=feature_refs,
        entity_rows=[{"user_id": eid} for eid in entity_ids],
    ).to_dict()
    elapsed_ms = (time.perf_counter() - start) * 1000

    return jsonify({
        "features": features,
        "latency_ms": round(elapsed_ms, 2),
        "entity_count": len(entity_ids),
    })

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=6566)
```

## Feature Server

### Production Feature Server

```yaml
# docker-compose.feature-server.yml
version: "3.8"
services:
  feature-server:
    image: feastdev/feature-server:0.38
    ports:
      - "6566:6566"
    environment:
      FEAST_FEATURE_STORE: /etc/feast/feature_store.yaml
      FEAST_REDIS_HOST: redis-cluster
      FEAST_REDIS_PORT: 6379
    volumes:
      - ./feature_repo:/etc/feast
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:6566/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    resources:
      limits:
        cpus: "2"
        memory: "4G"
    logging:
      driver: awslogs
      options:
        awslogs-group: feast-feature-server
        awslogs-region: us-east-1

  redis-cluster:
    image: redis:7-alpine
    command: redis-server --appendonly yes --cluster-enabled yes
    ports:
      - "6379:6379"
      - "16379:16379"
    volumes:
      - redis-data:/data

volumes:
  redis-data:
```

### Performance Tuning

```yaml
# Feature server performance tuning
performance:
  redis:
    - maxmemory: 10gb
    - maxmemory-policy: allkeys-lru
    - timeout: 300
    - tcp-keepalive: 60
    - io-threads: 4
    - io-threads-do-reads: yes

  feast:
    - cache_ttl_seconds: 3600  # Registry cache
    - online_store_key_ttl: 86400  # Feature key TTL
    - grpc_max_workers: 10
    - grpc_max_message_length: 100MB
    - batch_size: 100  # Max entities per batch request

  network:
    - "Feast server co-located with inference server"
    - "Redis in same AZ as Feast server"
    - "Use AWS PrivateLink / VPC peering for cross-VPC"
```

## Batch vs Real-Time Serving

### Comparison

| Aspect | Batch Serving | Real-Time Serving |
|--------|--------------|-------------------|
| Latency | Minutes to hours | Milliseconds |
| Compute | Offline jobs (Spark, dbt) | Online store (Redis) |
| Freshness | Stale (last batch run) | Latest available |
| Cost | Lower (scheduled) | Higher (always on) |
| Use case | Training datasets, reports | Model inference, dashboards |
| Feast component | Offline store | Online store |
| Feature materialization | batch materialize | Stream materialization |

### Materialization Pipeline

```python
from feast import FeatureStore
from datetime import datetime, timedelta

store = FeatureStore(repo_path="./feature_repo")

# Batch materialization
def materialize_features():
    """Materialize features from offline to online store."""
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(hours=1)

    store.materialize_incremental(
        start_date=start_date,
        end_date=end_date,
        feature_views=["user_features", "order_features"]
    )

# Streaming materialization
# In production, use Feast's stream processor integration
# Kafka → Flink → Feast online store
```

## Rules
- Redis online store for sub-10ms p99 latency; DynamoDB for serverless AWS
- Batch feature retrieval for training, real-time for inference
- Materialize features from offline store to online store on schedule
- gRPC for production serving (lower latency than REST)
- Co-locate feature server with inference server to reduce network latency
- Set TTL on online store keys to prevent serving stale features
- Monitor online store latency and feature retrieval error rates
- Use Redis Cluster for horizontal scaling beyond single node
- Batch entity requests (up to 100 per request) for throughput
- Warm online store before production traffic (pre-load features)
