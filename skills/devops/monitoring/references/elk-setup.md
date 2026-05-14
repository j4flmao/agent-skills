# ELK Setup Reference

## Filebeat to Logstash Pipeline

```yaml
# filebeat.yml
filebeat.inputs:
  - type: container
    paths:
      - /var/log/containers/*.log
output.logstash:
  hosts: ["logstash:5044"]
```

```ruby
# logstash/conf.d/01-inputs.conf
input { beats { port => 5044 } }

filter {
  grok {
    match => { "message" => "%{TIMESTAMP_ISO8601:timestamp} %{LOGLEVEL:level} %{GREEDYDATA:message}" }
  }
  date { match => ["timestamp", "ISO8601"] }
}

output {
  elasticsearch {
    hosts => ["http://elasticsearch:9200"]
    index => "logs-%{+yyyy.MM.dd}"
  }
}
```

## Index Lifecycle
- Hot: 50GB max, 1 day rollover.
- Warm: 7 days, shrink to 1 shard.
- Cold: 30 days, freeze.
- Delete: 90 days.
