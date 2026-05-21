# ELK Stack Setup Reference

## Architecture

```
Filebeat (K8s nodes) → Logstash (parsing/filter) → Elasticsearch (storage/search) → Kibana (visualization)
  ↑                          ↑                            ↑
  container logs             grok, mutate, date           index lifecycle, shards, replicas
```

## Filebeat Configuration

```yaml
# filebeat.yml
filebeat.inputs:
  - type: container
    enabled: true
    paths:
      - /var/log/containers/*.log
    processors:
      - add_kubernetes_metadata:
          host: ${NODE_NAME}
          matchers:
            - logs_path:
                logs_path: "/var/log/containers/"
      - add_cloud_metadata: ~
      - add_host_metadata: ~

output.logstash:
  hosts:
    - logstash:5044
  ssl.enabled: false
  worker: 4
  bulk_max_size: 2048
  compression_level: 6

logging.level: info
logging.to_files: true
logging.files:
  path: /var/log/filebeat
  name: filebeat.log
  keepfiles: 7
  permissions: 0644
```

## Logstash Pipeline

```ruby
# logstash/conf.d/01-inputs.conf
input {
  beats {
    port => 5044
    client_inactivity_timeout => 60
  }
}
```

```ruby
# logstash/conf.d/02-filters.conf
filter {
  # Parse CRI log format
  grok {
    match => {
      "message" => "^(?<timestamp>%{TIMESTAMP_ISO8601:time})\s+(?<stream>stdout|stderr)\s+(?<log_flags>[FPs])\s+(?<log_message>.*)$"
    }
    overwrite => ["message"]
  }

  # Parse JSON log messages
  json {
    source => "log_message"
    target => "json"
    skip_on_invalid_json => true
    remove_field => ["log_message"]
  }

  # Parse structured log if not JSON
  if "_grokparsefailure" in [tags] {
    grok {
      match => {
        "message" => "^%{TIMESTAMP_ISO8601:timestamp}\s+%{LOGLEVEL:level}\s+%{GREEDYDATA:message}"
      }
      overwrite => ["message"]
    }
    mutate {
      remove_tag => ["_grokparsefailure"]
    }
  }

  # Set @timestamp
  date {
    match => ["timestamp", "ISO8601"]
    target => "@timestamp"
    remove_field => ["timestamp"]
  }

  # Add log level from JSON
  if [json][level] {
    mutate {
      copy => { "[json][level]" => "level" }
    }
  }

  # Parse user-agent
  useragent {
    source => "[json][user_agent]"
    target => "user_agent"
    remove_field => ["[json][user_agent]"]
  }

  # GeoIP
  geoip {
    source => "[json][client_ip]"
    target => "geo"
    add_tag => ["geoip"]
  }

  # Remove internal fields
  mutate {
    remove_field => [
      "log_flags",
      "stream",
      "ecs",
      "agent",
      "host",
      "input_type",
      "tags",
      "@version"
    ]
  }
}
```

```ruby
# logstash/conf.d/03-outputs.conf
output {
  elasticsearch {
    hosts => ["http://elasticsearch:9200"]
    index => "logs-%{+yyyy.MM.dd}"
    user => "${ELASTICSEARCH_USER}"
    password => "${ELASTICSEARCH_PASS}"
    sniffing => false
    manage_template => false
    template_overwrite => false
    ilm_enabled => true
    ilm_rollover_alias => "logs"
    ilm_pattern => "logs-{now/d}-000001"
  }

  # Debug output (dev only)
  # stdout { codec => rubydebug }
}
```

## Elasticsearch Configuration

```yaml
# elasticsearch.yml
cluster.name: logs-cluster
node.name: ${HOSTNAME}
path.data: /data/elasticsearch
path.logs: /var/log/elasticsearch

network.host: 0.0.0.0
http.port: 9200
transport.port: 9300

discovery.type: single-node  # or zen for multi-node

# Memory
bootstrap.memory_lock: true
indices.memory.index_buffer_size: 10%

# Security (Basic)
xpack.security.enabled: true
xpack.security.authc.api_key.enabled: true

# Monitoring
xpack.monitoring.collection.enabled: true

# Circuit breakers
indices.breaker.total.limit: 40%
indices.breaker.fielddata.limit: 20%
indices.breaker.request.limit: 10%

# Thread pools
thread_pool.write.queue_size: 1000
thread_pool.search.queue_size: 1000
```

## Index Lifecycle Policy

```json
PUT _ilm/policy/logs-policy
{
  "policy": {
    "phases": {
      "hot": {
        "min_age": "0ms",
        "actions": {
          "rollover": {
            "max_size": "50GB",
            "max_age": "1d"
          },
          "set_priority": {
            "priority": 100
          }
        }
      },
      "warm": {
        "min_age": "7d",
        "actions": {
          "shrink": {
            "number_of_shards": 1
          },
          "forcemerge": {
            "max_num_segments": 1
          },
          "set_priority": {
            "priority": 50
          }
        }
      },
      "cold": {
        "min_age": "30d",
        "actions": {
          "freeze": {},
          "set_priority": {
            "priority": 0
          }
        }
      },
      "delete": {
        "min_age": "90d",
        "actions": {
          "delete": {}
        }
      }
    }
  }
}
```

## Index Template

```json
PUT _index_template/logs-template
{
  "index_patterns": ["logs-*"],
  "template": {
    "settings": {
      "number_of_shards": 3,
      "number_of_replicas": 1,
      "refresh_interval": "10s",
      "routing.allocation.total_shards_per_node": 5
    },
    "mappings": {
      "dynamic_templates": [
        {
          "strings_as_keyword": {
            "match_mapping_type": "string",
            "mapping": {
              "type": "keyword"
            }
          }
        },
        {
          "json_fields": {
            "path_match": "json.*",
            "mapping": {
              "type": "object",
              "enabled": false
            }
          }
        }
      ],
      "properties": {
        "@timestamp": {
          "type": "date"
        },
        "message": {
          "type": "text",
          "fields": {
            "keyword": {
              "type": "keyword",
              "ignore_above": 256
            }
          }
        },
        "level": {
          "type": "keyword"
        },
        "namespace": {
          "type": "keyword"
        },
        "pod": {
          "type": "keyword"
        },
        "container": {
          "type": "keyword"
        },
        "app": {
          "type": "keyword"
        }
      }
    }
  },
  "priority": 100
}
```

## Kibana Configuration

```yaml
# kibana.yml
server.host: "0.0.0.0"
server.port: 5601

elasticsearch.hosts: ["http://elasticsearch:9200"]
elasticsearch.username: "${KIBANA_USER}"
elasticsearch.password: "${KIBANA_PASS}"

kibana.index: ".kibana"

# Data views
kibana.defaultAppId: "discover"

# Saved objects
savedObjects.permission.enabled: true

# Reporting
xpack.reporting.enabled: true

# Alerting
xpack.alerting.enabled: true

# Monitoring
xpack.monitoring.ui.container.elasticsearch.enabled: true

# Spaces
xpack.spaces.enabled: true
```

## Common Queries (Kibana DSL)

```json
// Error rate by service
POST logs-*/_search
{
  "size": 0,
  "query": {
    "range": {
      "@timestamp": {
        "gte": "now-5m"
      }
    }
  },
  "aggs": {
    "by_service": {
      "terms": {
        "field": "app.keyword",
        "size": 20
      },
      "aggs": {
        "errors": {
          "filter": {
            "term": { "level.keyword": "ERROR" }
          }
        }
      }
    }
  }
}

// Latency outliers
POST logs-*/_search
{
  "query": {
    "bool": {
      "must": [
        { "exists": { "field": "json.duration_ms" } }
      ],
      "filter": [
        { "range": { "json.duration_ms": { "gte": 5000 } } }
      ]
    }
  },
  "sort": [
    { "@timestamp": "desc" }
  ],
  "size": 50
}

// Trace log aggregation
POST logs-*/_search
{
  "size": 100,
  "query": {
    "term": { "json.trace_id.keyword": "abc123" }
  },
  "sort": [
    { "@timestamp": "asc" }
  ]
}
```

## Performance Tuning

| Parameter | Recommendation |
|---|---|
| `refresh_interval` | 10-30s for logs (not 1s) |
| `translog.durability` | `async` for logs (not `request`) |
| `translog.sync_interval` | 5s |
| `index.number_of_shards` | 3 per node, max 20 per index |
| `index.number_of_replicas` | 1 (2 for critical) |
| `indices.fielddata.cache.size` | 20% of heap |
| `indices.breaker.fielddata.limit` | 40% of heap |
| `thread_pool.write.queue_size` | 1000 |
| Bulk index size | 5-15MB per bulk request |
| Heap | 50% of RAM, max 31GB |
