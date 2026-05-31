# SIEM Engineering: Data Pipeline Architecture

## Overview

This reference defines the architecture of a production-grade SIEM data pipeline — the system that ingests, processes, normalizes, indexes, and stores security telemetry from diverse sources. It covers pipeline component design, data flow optimization, schema-on-read vs schema-on-write trade-offs, and strategies for handling high-volume, high-velocity security data.

## Core Architecture Concepts

### Pipeline Stages

```
Source → Collector → Buffer → Processor → Indexer → Storage → Query
  │          │          │         │          │        │         │
  ▼          ▼          ▼         ▼          ▼        ▼         ▼
Logs/    Agent/   Kafka/   Normal-   Elastic/  Hot/Warm/ Search
Events   Syslog   Kinesis  ization   Splunk    Cold      Engine
Cloud     Forwarder    Parser    Indexer    Archive   Dashboard
APIs      Collector   Router    Enrich    S3/Glacier Reports
```

### Pipeline Component Architecture

| Component | Responsibility | Scaling Strategy | Reliability |
|-----------|---------------|-----------------|-------------|
| Collector | Receive raw logs from sources | Horizontal by source type | At-least-once delivery |
| Buffer | Absorb spikes, decouple stages | Partitioned topic | Durable, replicated |
| Processor | Parse, normalize, enrich, route | Stateless workers | Exactly-once processing |
| Indexer | Create searchable indexes | Sharded by time+source | Partial failure tolerant |
| Storage | Persist raw + indexed data | Tiered by age | Cross-region replication |
| Query Engine | Search and aggregate | Distributed query | Query routing, fallback |

### Data Flow Model

```
Raw Event → Collector → Buffer (Kafka topic: raw-events)
  ↓
Processor Stage 1: Parse → structured fields
  ↓  
Buffer (Kafka topic: parsed-events)
  ↓
Processor Stage 2: Normalize → common schema
  ↓
Buffer (Kafka topic: normalized-events)
  ↓
Processor Stage 3: Enrich → add context (geo, asset, threat intel)
  ↓
Buffer (Kafka topic: enriched-events)
  ↓
Indexer → Write to hot storage
  ↓
Retention Manager → Move to warm (after N days) → Cold archive (after M days)
```

## Architecture Decision Trees

### Decision 1: Schema-on-Write vs Schema-on-Read

```
Question: When to normalize data — at ingestion or query time?
├── Schema-on-Write (normalize at ingestion)
│   ├── Architecture: Parser extracts fields → stores in structured schema
│   ├── Pros:
│   │   ├── Fast queries (pre-parsed fields)
│   │   ├── Consistent field names across sources
│   │   ├── Efficient storage (compression-friendly)
│   │   └── Simple correlation (same field format)
│   ├── Cons:
│   │   ├── Data loss if schema doesn't cover all fields
│   │   ├── Schema changes require reprocessing
│   │   ├── Parser maintenance burden
│   │   └── Rigid, hard to add new sources
│   └── Best for: Mature SOC, stable log sources, consistent schema
│
├── Schema-on-Read (normalize at query time)
│   ├── Architecture: Store raw data → parse/extract at search time
│   ├── Pros:
│   │   ├── No data loss (raw preserved)
│   │   ├── Flexible schema evolution
│   │   ├── Easy to add new sources
│   │   └── Lower ingestion latency
│   ├── Cons:
│   │   ├── Slower queries (parse every time)
│   │   ├── Computationally expensive at scale
│   │   ├── Inconsistent field access patterns
│   │   └── Harder to correlate across sources
│   └── Best for: Dynamic environment, diverse sources, evolving schema
│
└── Hybrid (recommended)
    ├── Schema-on-write for critical fields (timestamp, source, severity, event_type)
    ├── Raw data preserved for all other fields
    ├── Schema-on-read for extraction-time field extraction
    └── Common in Splunk (KV_MODE) and Elastic (runtime fields)
```

### Decision 2: Ingestion Topology

```
Question: Centralized vs distributed ingestion?
├── Centralized Collector
│   ├── All sources send to single collector cluster
│   ├── Pros: Simple management, single configuration point
│   ├── Cons: Single point of failure, bandwidth bottleneck
│   └── Best for: Single-region, <10TB/day

├── Regional Collectors
│   ├── Collectors per region, forward to central pipeline
│   ├── Pros: Reduced bandwidth, regional resilience
│   ├── Cons: Higher complexity, cross-region latency
│   └── Best for: Multi-region cloud deployment

├── Edge Processing
│   ├── Process and filter at source before sending
│   ├── Pros: Reduced volume, lower latency for critical alerts
│   ├── Cons: Compute at edge, harder to manage
│   └── Best for: High-volume sources (10TB+/day), IoT/OT
└── Hybrid
    ├── Edge: Filter and sample high-volume sources
    ├── Regional: Aggregate and forward
    ├── Central: Full processing and storage
    └── Recommended for enterprise deployments
```

### Decision 3: Buffer Technology

```
Question: Message queue vs streaming platform?
├── Message Queue (RabbitMQ, SQS)
│   ├── Pros: Simple, low latency, exactly-once delivery
│   ├── Cons: Limited retention, no replay capability
│   └── Best for: <1TB/day, simple routing
├── Streaming Platform (Kafka, Kinesis)
│   ├── Pros: High throughput, long retention, replay, partitioning
│   ├── Cons: Operational complexity, higher latency
│   └── Best for: >1TB/day, reprocessing needs, multiple consumers
└── Hybrid
    ├── Kafka for primary pipeline
    ├── SQS for dead letter queue
    └── Recommended for production deployments
```

## Implementation Strategies

### Phase 1: Foundation Pipeline (Weeks 1-4)
- Deploy message bus (Kafka) with 3-node cluster
- Implement collector agents for top 5 sources (AD, firewall, EDR, DNS, cloud)
- Build basic parser/normalizer for each source
- Deploy single-node indexer
- Establish pipeline monitoring (consumer lag, throughput, error rate)

### Phase 2: Scale and Reliability (Weeks 5-10)
- Scale Kafka to production cluster (6+ nodes)
- Implement parser worker pool with auto-scaling
- Deploy multi-node indexer cluster with replication
- Add enrichment stage (geo-IP, asset lookup, threat intel)
- Implement dead letter queue and reprocessing pipeline
- Deploy pipeline health dashboard

### Phase 3: Advanced Processing (Weeks 11-16)
- Implement schema-on-write for critical fields
- Build data quality monitoring (missing fields, schema violations, malformed events)
- Deploy real-time enrichment pipeline
- Implement data routing (critical sources to hot index, bulk to warm)
- Build retention management with automated tiering
- Deploy cross-region replication for disaster recovery

### Phase 4: Optimization (Ongoing)
- Pipeline cost optimization (right-shoring, sampling strategies)
- Query performance tuning (index optimization, data modeling)
- Parser accuracy improvement (automated schema detection)
- Pipeline auto-scaling based on load patterns
- Capacity planning based on growth trends

## Integration Patterns

### Collector Deployment Pattern

```yaml
collector:
  type: "universal_forwarder"
  source_types:
    - name: "windows_security"
      path: "WinEventLog://Security"
      interval: 5s
      filter: "EventID IN (4624, 4625, 4634, 4648, 4672, 4688)"
      
    - name: "linux_syslog"
      path: "udp://0.0.0.0:514"
      protocol: "udp"
      max_buffer_size: "64KB"
      
    - name: "cloudtrail"
      type: "s3_poll"
      bucket: "prod-cloudtrail-logs"
      region: "us-east-1"
      interval: 60s
      prefix: "AWSLogs/123456789012/"
      
  output:
    type: "kafka"
    brokers: ["kafka-1:9092", "kafka-2:9092", "kafka-3:9092"]
    topic: "raw-events"
    compression: "snappy"
    batch_size: 1000
    batch_timeout: 5s
    
  buffer:
    type: "disk"
    path: "/opt/collector/buffer"
    max_size: "10GB"
    on_full: "block"
```

### Parser Pipeline Pattern

```python
class ParserPipeline:
    def __init__(self):
        self.parsers = {
            "windows_security": WindowsEventParser(),
            "linux_syslog": SyslogParser(),
            "cloudtrail": CloudTrailParser(),
            "vpc_flow": VPCFlowParser(),
            "dns_query": DNSParser(),
        }
        self.enrichers = [
            GeoIPEnricher(),
            AssetLookupEnricher(),
            ThreatIntelEnricher(),
        ]
        
    def process(self, raw_event):
        source_type = self._detect_source(raw_event)
        parser = self.parsers.get(source_type)
        
        if not parser:
            return self._handle_unknown(raw_event)
            
        parsed = parser.parse(raw_event)
        if not parsed.valid:
            return self._handle_parse_error(raw_event, parsed.errors)
            
        normalized = self._normalize(parsed, source_type)
        enriched = self._enrich(normalized)
        
        return enriched
        
    def _normalize(self, parsed, source_type):
        return {
            "timestamp": parsed.timestamp,
            "source": source_type,
            "source_address": parsed.src_ip,
            "destination_address": parsed.dst_ip,
            "user": parsed.user,
            "action": parsed.event_action,
            "status": parsed.event_status,
            "raw": parsed.raw,
            # Schema-on-read fields preserved in raw
        }
        
    def _enrich(self, event):
        for enricher in self.enrichers:
            enricher.enrich(event)
        return event
```

### Data Tiering Pattern

```
Hot Storage (7-14 days)
├── SSD-backed
├── Full indexes (all fields searchable)
├── 3x replication
├── Daily rolling index
└── Stored: All events

Warm Storage (30-90 days)
├── HDD/SSD hybrid
├── Partial indexes (only queried fields)
├── 2x replication
├── Weekly rolling index
└── Stored: Sampled high-volume, all low-volume

Cold Storage (90-365 days)
├── Object storage (S3)
├── Minimal indexes
├── Server-side encryption
├── Monthly archive
└── Stored: Raw events, reconstructed on query

Frozen Storage (>365 days)
├── Glacier/Deep Archive
├── No indexes
├── Restore on demand (1-12 hours)
└── Stored: Compressed raw events
```

## Performance Optimization

### Throughput Engineering

| Stage | Bottleneck | Strategy | Expected Throughput |
|-------|-----------|----------|-------------------|
| Collection | Network bandwidth, disk I/O | Compression (snappy/gzip), batching | 1-5 GB/s per node |
| Buffer | Kafka partition count | Partitions = max(consumers × 4, sources × 2) | 100K-1M msg/s per partition |
| Parsing | CPU per event | SIMD-optimized parsers, pre-compiled regex | 50K-500K events/s per core |
| Enrichment | External API latency, cache misses | Local cache, prefetch, batch enrichment | 10K-100K events/s per worker |
| Indexing | I/O operations per second | Bulk indexing, merge policy tuning | 10K-100K events/s per node |
| Storage | S3 PUT/GET operations | Multipart upload, concurrent requests | 5-25 Gbps per bucket prefix |

### Index Strategy

```
Hot index template:
{
  "settings": {
    "number_of_shards": 3,
    "number_of_replicas": 2,
    "refresh_interval": "30s",
    "translog.durability": "async",
    "translog.sync_interval": "5s"
  },
  "mappings": {
    "properties": {
      "timestamp": {"type": "date"},
      "source": {"type": "keyword"},
      "source_ip": {"type": "ip"},
      "destination_ip": {"type": "ip"},
      "user": {"type": "keyword"},
      "event_type": {"type": "keyword"},
      "action": {"type": "keyword"},
      "status": {"type": "keyword"},
      "message": {"type": "text", "index": true}
    },
    "dynamic_templates": [
      {
        "strings_as_keyword": {
          "match_mapping_type": "string",
          "mapping": {"type": "keyword", "ignore_above": 256}
        }
      }
    ]
  }
}
```

## Security Considerations

### Pipeline Security

```
Pipeline Security Controls:
├── In Transit: TLS 1.3 for all inter-component communication
├── At Rest: AES-256 encryption for all stored data
├── Authentication: mTLS between pipeline components
├── Authorization: RBAC for pipeline management
├── Data Isolation: Tenant-level topic/index separation
└── Audit: All pipeline configuration changes logged

Data Protection:
├── PII masking at ingestion (pattern-based detection)
├── Sensitive data redaction in search results
├── Field-level access control (user cannot see password fields)
└── Data retention enforcement at storage layer
```

### Pipeline Integrity
- Checksums on every event through pipeline
- Replay capability from Kafka for failed processing
- Data reconciliation: compare source counts vs indexed counts
- Schema validation: reject events that don't match expected format
- Anomaly detection: sudden volume drops or spikes

## Operational Excellence

### Pipeline Monitoring

| Metric | What It Measures | Target | Alert |
|--------|-----------------|--------|-------|
| Ingestion Rate | Events/second | Baseline ±20% | >±50% deviation |
| Consumer Lag | Kafka consumer delay | <1000 messages | >10000 for 5min |
| Parse Success Rate | % events successfully parsed | >99% | <95% |
| Index Latency | Event creation to searchable | <60s | >300s |
| Error Rate | Failed events / total | <0.1% | >1% |
| Storage Utilization | % disk used per tier | <70% | >85% |

### Capacity Planning Formula

```
Daily Volume = Σ(source_events_per_second × 86400 × compression_ratio × storage_factor)

Storage Requirement = daily_volume × retention_days × replication_factor

Index Storage = raw_storage × 1.5 (for inverted indexes)

Total Pipeline Cost = compute_cost + storage_cost + transfer_cost + licensing_cost

Growth Projection = current_volume × (1 + monthly_growth_rate)^months
```

## Testing Strategy

### Pipeline Testing
- **Unit tests**: Each parser with known inputs, verify correct output
- **Integration tests**: End-to-end source → index for each source type
- **Performance tests**: 10x normal volume for 1 hour, measure pipeline stability
- **Resilience tests**: Kafka broker failure, indexer node failure, collector failure
- **Data quality tests**: Insert known test events, verify they appear in search
- **Upgrade tests**: Rolling upgrade of all components, verify zero data loss

## Common Pitfalls

| Pitfall | Symptom | Root Cause | Prevention |
|---------|---------|------------|------------|
| Parser fragility | Events silently dropped | Parser exception not handled | Dead letter queue for all parse failures |
| Index bloat | Storage costs exceed budget | Too many indexed fields | Selective indexing, only index queried fields |
| Query timeouts | Searches fail after 30s | No data model optimization | Accelerated data models, summary indexing |
| Schema drift | New fields not parsed | Source format changes | Schema registry, CI/CD for parsers |
| Backpressure | Consumer lag grows unbounded | Ingestion > processing capacity | Auto-scaling workers, backpressure-aware |
| Data loss | Missing events in search | Collector buffer overflow | Monitor buffer utilization, right-size buffer |

## Key Takeaways

- Design the SIEM pipeline as decoupled stages with buffering between each
- Use hybrid schema approach: schema-on-write for critical fields, raw preserved for flexibility
- Deploy Kafka for high-throughput buffering with replay capability
- Implement multi-tier storage (hot/warm/cold/frozen) to optimize cost
- Monitor consumer lag as the primary health metric for pipeline throughput
- Plan capacity with growth projections and compression ratios
- Build data quality monitoring into the pipeline, not as an afterthought
- Design for schema evolution with schema registry and CI/CD for parsers
- Implement dead letter queues for all failure modes

## Related References
- references/siem-architecture.md — SIEM system architecture
- references/log-sources-ingestion.md — Log source onboarding
- references/detection-content.md — Detection rule creation
- references/correlation-rules.md — Correlation rule design
- references/siem-tuning.md — False positive reduction
- references/siem-engineering-fundamentals.md — Foundational concepts
