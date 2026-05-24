# Log Source Ingestion

## Ingestion Architecture

```
Log Sources → Forwarders → Collectors → Ingestion Pipeline → Normalization → Index → Search
                                          │                                        │
                                          ↓                                        ↓
                                    Load Balancer                           Retention Tiers
                                          │
                                          ↓
                                    Queue (Kafka/RabbitMQ)
                                          │
                                          ↓
                                    Processing/Parsing
```

### Key Components
| Component | Role | Examples |
|-----------|------|----------|
| Log Forwarder | Collect and forward logs from source | Splunk UF, Winlogbeat, Filebeat, syslog-ng |
| Message Queue | Buffer and decouple ingestion | Kafka, RabbitMQ, Azure Event Hubs |
| Collector/Load Balancer | Distribute load across workers | Nginx, HAProxy, custom load balancer |
| Parser/Normalizer | Parse and transform raw logs | Logstash, Cribl, custom parsers |
| Indexer | Store and index parsed logs | Elasticsearch, Splunk indexer, Sentinel |

## Syslog Ingestion

### Syslog Types
| Type | Transport | Port | Reliability | Use Case |
|------|-----------|------|-------------|----------|
| RFC 3164 | UDP | 514 | Low | Legacy, network devices |
| RFC 5424 | TCP | 514/601 | Medium | Structured syslog |
| RFC 6587 | TCP with octet counting | 601 | Medium | Reliable syslog |
| RELP | TCP with application ACK | 601 | High | Critical log transport |
| TLS Syslog | TCP/TLS | 6514 | High | Encrypted log transport |

### Syslog Configuration Examples

**Linux rsyslog forwarding:**
```
# /etc/rsyslog.conf
*.* @@siem-collector.company.com:514  # TCP
*.* @siem-collector.company.com:514   # UDP
$ActionSendStreamDriver gtls
$ActionSendStreamDriverMode 1
$ActionSendStreamDriverAuthMode x509/certvalid
```

**Network device (Cisco):**
```
logging host 10.0.1.100 transport udp port 514
logging trap informational
logging source-interface GigabitEthernet0/1
```

**syslog-ng forwarding:**
```
destination d_siem {
    syslog("siem-collector.company.com" port(6514)
        transport("tls")
        tls(ca_dir("/etc/syslog-ng/ca.d"))
    );
};
log { source(s_network); destination(d_siem); };
```

## Windows Event Forwarding (WEF)

### WEF Architecture
```
Windows Event Sources → WinRM → Windows Event Collector → Forwarder → SIEM
```

| Component | Description | Setup |
|-----------|-------------|-------|
| Source Computers | Generate events to forward | Group Policy: Configure target Subscription Manager |
| Collector Server | Windows Server with WEC role | `wecutil qc` to configure collector |
| Subscriptions | Define which events to collect | Event Viewer → Subscriptions or `wecutil` CLI |

### Subscription Configuration
```xml
<!-- Subscription query for security-relevant events -->
<QueryList>
  <Query Id="0" Path="Security">
    <Select Path="Security">
      *[System[(EventID=4624 or EventID=4625 or EventID=4634 or
                 EventID=4648 or EventID=4672 or EventID=4688 or
                 EventID=4698 or EventID=4702 or EventID=4720 or
                 EventID=4732 or EventID=4756 or EventID=4740)]]
    </Select>
  </Query>
  <Query Id="1" Path="System">
    <Select Path="System">
      *[System[(EventID=7045 or EventID=7036 or EventID=104)]]
    </Select>
  </Query>
  <Query Id="2" Path="Microsoft-Windows-Sysmon/Operational">
    <Select Path="Microsoft-Windows-Sysmon/Operational">
      *[System[(EventID=1 or EventID=3 or EventID=6 or EventID=7 or
                 EventID=8 or EventID=10 or EventID=11 or EventID=12 or
                 EventID=13 or EventID=15)]]
    </Select>
  </Query>
</QueryList>
```

### Group Policy for WEF
- Configure WinRM: `Computer Configuration → Admin Templates → Windows Components → Windows Remote Management`
- Set Subscription Manager: `Configure forwarder resource usage` → Set to `Server=http://wec-server.company.com:5985/wsman/SubscriptionManager/WEC,Refresh=60`
- Configure event log size: Events to forward must be available locally

## Cloud Ingestion

### AWS CloudTrail (S3)
```yaml
log_ingestion:
  source: aws_s3
  bucket: my-company-cloudtrail-logs
  prefix: "AWSLogs/ACCOUNT-ID/CloudTrail/"
  file_pattern: "*.json.gz"
  format: json
  integration:
    - method: s3_sqs_notification  # real-time via SQS
      queue_url: "https://sqs.region.amazonaws.com/ACCOUNT/QUEUE-NAME"
    - method: scheduled_s3_polling  # batch every 5 min
      interval_minutes: 5
  parsing:
    - field_mapping:
        eventSource: "aws_service"
        eventName: "aws_api_call"
        sourceIPAddress: "src_ip"
        userIdentity.arn: "user_arn"
        requestParameters: "request_params"
```

### Azure Event Hubs
```python
import os
from azure.eventhub import EventHubConsumerClient

connection_str = os.environ["EVENT_HUB_CONNECTION_STRING"]
eventhub_name = "security-events"
consumer_group = "$Default"

client = EventHubConsumerClient.from_connection_string(
    conn_str=connection_str,
    consumer_group=consumer_group,
    eventhub_name=eventhub_name
)

def on_event(partition_context, event):
    # Parse event body
    payload = event.body_as_json()
    normalized = normalize_azure_event(payload)
    send_to_siem(normalized)
    partition_context.update_checkpoint()

with client:
    client.receive(on_event=on_event, starting_position="-1")
```

### GCP Pub/Sub
```yaml
ingestion_source:
  type: pubsub
  project: my-project
  subscription: security-log-subscription
  format: json
  log_types:
    - compute.googleapis.com/vm_flow
    - iam.googleapis.com/activity
    - audit.googleapis.com/data_access
  parsing:
    flow_logs:
      src_ip: jsonPayload.connection.src_ip
      dst_ip: jsonPayload.connection.dest_ip
      src_port: jsonPayload.connection.src_port
      dst_port: jsonPayload.connection.dest_port
      protocol: jsonPayload.connection.protocol
```

## Custom Parsers

### Parser Development Process
1. **Sample collection**: Get 100+ log samples covering all event types
2. **Field identification**: Map relevant fields (timestamp, source, event, user, IP)
3. **Pattern development**: Write regex/grok patterns to extract fields
4. **Validation**: Test parser against known good and edge-case logs
5. **Performance**: Optimize regex complexity for throughput
6. **CIM mapping**: Map extracted fields to Common Information Model

### Parser Examples

**Grok pattern (Logstash):**
```
%{TIMESTAMP_ISO8601:timestamp}
%{SYSLOGPROG:process}\[%{NUMBER:pid}\]:
%{WORD:event_type}:
src=%{IPORHOST:src_ip}
dst=%{IPORHOST:dst_ip}
user=%{USERNAME:user}
```

**Custom Python parser:**
```python
import re
import json

def parse_custom_firewall_log(raw_log):
    pattern = (
        r"(?P<timestamp>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}) "
        r"(?P<action>ALLOW|DENY) "
        r"SRC=(?P<src_ip>\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}) "
        r"DST=(?P<dst_ip>\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}) "
        r"SPT=(?P<src_port>\d+) DPT=(?P<dst_port>\d+) "
        r"PROTO=(?P<protocol>\w+)"
    )
    match = re.match(pattern, raw_log)
    if match:
        return match.groupdict()
    return None
```

## CIM (Common Information Model) Normalization

### CIM Field Mapping
| SIEM Field | Description | Examples |
|------------|-------------|----------|
| `src_ip` | Source IP address | 10.0.1.5, 203.0.113.50 |
| `dest_ip` | Destination IP address | 10.0.2.10, 198.51.100.20 |
| `user` | Username | jdoe, NT AUTHORITY\SYSTEM |
| `host` | Hostname | FIN-PC-001 |
| `action` | Result of event | allow, deny, block, success, failure |
| `event_id` | Event type identifier | 4625, 1 (Sysmon), FW-001 |
| `signature` | Rule/signature name | ETERNALBLUE, BRUTE_FORCE |
| `severity` | Event importance | low, medium, high, critical |
| `process` | Process path | C:\Windows\System32\cmd.exe |
| `file_hash` | File hash | SHA256 of file |
| `url` | URL/URI | https://evil.com/payload.exe |
| `user_agent` | HTTP user agent | Mozilla/5.0 ... |

### Normalization Best Practices
- Standardize timestamp format to ISO 8601 UTC
- Normalize IP addresses to single format (no leading zeros)
- Standardize usernames to DOMAIN\username format
- Map severity levels consistently across sources
- Preserve raw log alongside normalized fields
- Tag source metadata (original source, collector, parser version)

## Ingestion Troubleshooting

| Problem | Symptom | Resolution |
|---------|---------|------------|
| Missing logs | Source shows sent, SIEM doesn't receive | Check firewall ports, verify collector status |
| Parse errors | Many events show as "unparsed" | Review parser regex, collect sample of failed logs |
| High latency | Delay between event and availability | Check queue depth, add workers, optimize parsing |
| Duplicate events | Identical timestamps and content | Enable idempotency, dedup by hash |
| Volume spike | 10x normal ingestion rate | Implement rate limiting, add queue capacity |
| Corrupted data | Binary/unreadable logs in pipeline | Check character encoding, verify transport settings |
