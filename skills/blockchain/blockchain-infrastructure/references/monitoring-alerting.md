# Monitoring and Alerting

## Key Blockchain Metrics

| Metric                    | Source              | Alert Threshold              | Severity |
|---------------------------|---------------------|------------------------------|----------|
| Block height delta        | eth_syncing / ref   | > 5 blocks behind              | critical |
| Peer count                | net_peerCount       | < 5 peers                     | warning  |
| Mempool size              | txpool_status       | > 10000 pending               | info     |
| Base fee (gwei)           | eth_feeHistory      | > 500 gwei                    | info     |
| Gas used ratio            | eth_feeHistory      | > 0.95                        | warning  |
| P2P handshake failures    | node metrics        | > 1% rate                     | warning  |
| RPC latency (p99)         | HAProxy metrics     | > 500ms                       | critical |
| RPC error rate            | HAProxy metrics     | > 5%                          | critical |
| Disk usage                | node_exporter       | > 85%                         | warning  |
| Validator missed att.     | beacon API          | > 1 in last 100 epochs        | critical |
| Validator balance change  | beacon API          | Decreasing over 24h           | warning  |

## Prometheus Exporters

### Geth Metrics Endpoint
```yaml
# prometheus/geth-scrape.yml
scrape_configs:
  - job_name: "ethereum-geth"
    scrape_interval: 15s
    scrape_timeout: 10s
    static_configs:
      - targets:
          - "node-us1.internal:6060"
          - "node-eu1.internal:6060"
          - "node-ap1.internal:6060"
        labels:
          chain: ethereum
          network: mainnet
          node_type: full

  - job_name: "ethereum-consensus"
    scrape_interval: 15s
    static_configs:
      - targets:
          - "validator-us1.internal:8080"
        labels:
          chain: ethereum
          network: mainnet
          node_type: validator

  - job_name: "node-exporter"
    scrape_interval: 30s
    static_configs:
      - targets:
          - "node-us1.internal:9100"
          - "node-eu1.internal:9100"
          - "node-ap1.internal:9100"
          - "validator-us1.internal:9100"
```

### Custom Blockchain Exporter (Python)
```python
# blockchain_exporter.py
from prometheus_client import start_http_server, Gauge, Histogram
from web3 import Web3
import time
import os

# Metrics
block_height = Gauge(
    "eth_block_height", "Current block height", ["instance", "chain"]
)
peer_count = Gauge(
    "eth_peer_count", "Connected peer count", ["instance"]
)
mempool_size = Gauge(
    "eth_mempool_pending", "Pending transactions in mempool", ["instance"]
)
gas_base_fee = Gauge(
    "eth_gas_base_fee_gwei", "Current base fee in gwei", ["instance"]
)
rpc_latency = Histogram(
    "eth_rpc_latency_seconds", "RPC call latency", ["instance", "method"]
)

NODES = os.getenv("NODES", "http://127.0.0.1:8545").split(",")
REFERENCE_RPC = os.getenv("REFERENCE_RPC", "https://eth-mainnet.g.alchemy.com/v2/demo")

def collect_metrics():
    ref_w3 = Web3(Web3.HTTPProvider(REFERENCE_RPC))
    ref_block = ref_w3.eth.block_number

    for node_url in NODES:
        w3 = Web3(Web3.HTTPProvider(node_url))
        instance = node_url.split("//")[1].split(":")[0]

        try:
            with rpc_latency.labels(instance, "eth_blockNumber").time():
                current = w3.eth.block_number
            block_height.labels(instance, "ethereum").set(current)

            height_delta = ref_block - current
            if height_delta > 5:
                print(f"WARN: {instance} is {height_delta} blocks behind")

            peer_count.labels(instance).set(w3.net.peer_count)
            mempool_size.labels(instance).set(
                w3.txpool.content["pending"].__len__()
            )
            gas_base_fee.labels(instance).set(
                w3.eth.fee_history(1, "latest", [])["baseFeePerGas"][0] / 1e9
            )
        except Exception as e:
            print(f"ERROR: {instance} — {e}")

if __name__ == "__main__":
    start_http_server(8000)
    while True:
        collect_metrics()
        time.sleep(15)
```

## Alerting Rules

### Prometheus Alert Rules
```yaml
# prometheus/alerts/blockchain-alerts.yml
groups:
  - name: blockchain-node
    interval: 30s
    rules:
      - alert: NodeBlockHeightDelta
        expr: |
          abs(eth_block_height{chain="ethereum"}
            - on() group_left
            avg by() (eth_block_height{instance="reference"}))
          > 5
        for: 2m
        labels:
          severity: critical
          team: blockchain
        annotations:
          summary: "Node {{ $labels.instance }} is {{ $value }} blocks behind"
          runbook: "https://runbook.example.com/node-sync-issues"

      - alert: LowPeerCount
        expr: eth_peer_count < 5
        for: 5m
        labels:
          severity: warning
          team: blockchain
        annotations:
          summary: "Node {{ $labels.instance }} has only {{ $value }} peers"
          runbook: "https://runbook.example.com/low-peers"

      - alert: NodeDown
        expr: up{job="ethereum-geth"} == 0
        for: 1m
        labels:
          severity: critical
          team: blockchain
        annotations:
          summary: "Node {{ $labels.instance }} is unreachable"

      - alert: HighRPCLatency
        expr: |
          histogram_quantile(0.99,
            rate(eth_rpc_latency_seconds_bucket[5m]))
          > 0.5
        for: 5m
        labels:
          severity: critical
          team: blockchain
        annotations:
          summary: "P99 RPC latency on {{ $labels.instance }} is {{ $value }}s"

      - alert: DiskSpaceLow
        expr: |
          100 - (node_filesystem_avail_bytes{mountpoint="/data"}
            / node_filesystem_size_bytes{mountpoint="/data"}) * 100
          > 85
        for: 10m
        labels:
          severity: warning
          team: blockchain
        annotations:
          summary: "Disk on {{ $labels.instance }} is {{ $value }}% full"

  - name: blockchain-validator
    interval: 1m
    rules:
      - alert: MissedAttestations
        expr: increase(validator_missed_attestations_total[1h]) > 0
        for: 10m
        labels:
          severity: critical
          team: blockchain
        annotations:
          summary: "Validator {{ $labels.instance }} missed attestations in last hour"

      - alert: ValidatorBalanceDecrease
        expr: |
          avg_over_time(validator_balance[1h])
          - avg_over_time(validator_balance[24h])
          < 0
        for: 6h
        labels:
          severity: warning
          team: blockchain
        annotations:
          summary: "Validator {{ $labels.instance }} balance decreasing over 24h"

  - name: blockchain-rpc
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: |
          rate(haproxy_server_http_responses_total{code="5xx"}[5m])
          / rate(haproxy_server_http_responses_total[5m])
          > 0.05
        for: 5m
        labels:
          severity: critical
          team: blockchain
        annotations:
          summary: "RPC error rate on {{ $labels.server }} is {{ $value | humanizePercentage }}"

      - alert: RateLimitHit
        expr: rate(haproxy_sticky_overflow[5m]) > 0
        for: 1m
        labels:
          severity: warning
          team: blockchain
        annotations:
          summary: "Rate limit overflow on {{ $labels.instance }}"
```

## Grafana Dashboards

### Ethereum Node Overview (JSON Model)
```json
{
  "title": "Blockchain Node Overview",
  "panels": [
    {
      "title": "Block Height",
      "type": "stat",
      "datasource": "Prometheus",
      "targets": [
        {
          "expr": "eth_block_height{instance=~\"$node\"}",
          "legendFormat": "{{instance}}"
        }
      ],
      "description": "Current block height per node vs network reference"
    },
    {
      "title": "Block Height Delta",
      "type": "graph",
      "datasource": "Prometheus",
      "targets": [
        {
          "expr": "abs(eth_block_height{instance=~\"$node\"} - on() group_left avg by() (eth_block_height{instance=\"reference\"}))",
          "legendFormat": "{{instance}} delta"
        }
      ],
      "alert": {
        "alertRuleTags": { "severity": "critical" },
        "conditions": [
          {
            "evaluator": { "params": [5], "type": "gt" },
            "query": { "params": ["A", "5m", "now"] },
            "reducer": { "params": [], "type": "avg" },
            "type": "query"
          }
        ]
      }
    },
    {
      "title": "Peer Count",
      "type": "graph",
      "datasource": "Prometheus",
      "targets": [
        {
          "expr": "eth_peer_count{instance=~\"$node\"}",
          "legendFormat": "{{instance}}"
        }
      ]
    },
    {
      "title": "Mempool Size",
      "type": "graph",
      "datasource": "Prometheus",
      "targets": [
        {
          "expr": "eth_mempool_pending{instance=~\"$node\"}",
          "legendFormat": "{{instance}}"
        }
      ]
    },
    {
      "title": "Base Fee (Gwei)",
      "type": "gauge",
      "datasource": "Prometheus",
      "targets": [
        {
          "expr": "eth_gas_base_fee_gwei{instance=~\"$node\"}",
          "legendFormat": "{{instance}}"
        }
      ],
      "thresholds": [
        { "color": "green", "value": null },
        { "color": "yellow", "value": 100 },
        { "color": "red", "value": 500 }
      ]
    },
    {
      "title": "CPU / Memory / Disk",
      "type": "graph",
      "datasource": "Prometheus",
      "targets": [
        { "expr": "100 - (avg by (instance) (rate(node_cpu_seconds_total{mode=\"idle\",instance=~\"$node\"}[5m])) * 100)", "legendFormat": "CPU %" },
        { "expr": "100 * (1 - node_memory_MemAvailable_bytes{instance=~\"$node\"} / node_memory_MemTotal_bytes{instance=~\"$node\"})", "legendFormat": "Memory %" },
        { "expr": "100 - (node_filesystem_avail_bytes{mountpoint=\"/data\",instance=~\"$node\"} / node_filesystem_size_bytes{mountpoint=\"/data\",instance=~\"$node\"}) * 100", "legendFormat": "Disk %" }
      ]
    },
    {
      "title": "RPC Latency (P99)",
      "type": "heatmap",
      "datasource": "Prometheus",
      "targets": [
        {
          "expr": "histogram_quantile(0.99, rate(eth_rpc_latency_seconds_bucket{instance=~\"$node\"}[5m]))",
          "legendFormat": "{{method}}"
        }
      ]
    }
  ],
  "templating": {
    "list": [
      {
        "name": "node",
        "type": "query",
        "query": "label_values(eth_block_height, instance)"
      }
    ]
  }
}
```

## On-Chain Monitoring

### Forta Detection Bot Example
```typescript
// forta-bot/src/agent.ts
import {
  Finding,
  HandleTransaction,
  TransactionEvent,
  FindingSeverity,
  FindingType,
} from "forta-agent";

const SUSPICIOUS_CONTRACTS: Set<string> = new Set([
  "0x0000000000000000000000000000000000000001",
]);

const LARGE_TX_THRESHOLD = "1000000"; // $1M equivalent in ETH

export const provideHandleTransaction =
  (suspiciousContracts: Set<string>): HandleTransaction =>
  async (txEvent: TransactionEvent) => {
    const findings: Finding[] = [];

    // Check for interactions with suspicious contracts
    const toAddress = txEvent.to?.toLowerCase();
    if (toAddress && suspiciousContracts.has(toAddress)) {
      findings.push(
        Finding.fromObject({
          name: "Suspicious Contract Interaction",
          description: `Transaction ${txEvent.hash} interacts with flagged contract ${toAddress}`,
          alertId: "SUSPICIOUS-CONTRACT",
          severity: FindingSeverity.High,
          type: FindingType.Suspicious,
          metadata: {
            from: txEvent.from,
            to: toAddress,
            value: txEvent.transaction.value,
          },
        })
      );
    }

    // Check for large ETH transfers
    const value = BigInt(txEvent.transaction.value);
    if (value > BigInt(LARGE_TX_THRESHOLD) && txEvent.from) {
      findings.push(
        Finding.fromObject({
          name: "Large ETH Transfer",
          description: `Transfer of ${txEvent.transaction.value} wei from ${txEvent.from}`,
          alertId: "LARGE-TRANSFER",
          severity: FindingSeverity.Medium,
          type: FindingType.Info,
        })
      );
    }

    // Flash loan attack patterns
    const flashLoanEvents = txEvent.filterEvent(
      "event FlashLoan(address indexed, address indexed token, uint256 amount, uint256 premium)"
    );
    if (flashLoanEvents.length > 0) {
      const totalFlashLoaned = flashLoanEvents.reduce(
        (sum, ev) => sum + BigInt(ev.args.amount),
        0n
      );
      if (totalFlashLoaned > BigInt("1000000000000000000000")) {
        findings.push(
          Finding.fromObject({
            name: "Large Flash Loan",
            description: `Total flash loaned: ${totalFlashLoaned}`,
            alertId: "FLASH-LOAN",
            severity: FindingSeverity.Medium,
            type: FindingType.Suspicious,
          })
        );
      }
    }

    return findings;
  };

export default {
  handleTransaction: provideHandleTransaction(SUSPICIOUS_CONTRACTS),
};
```

### Tenderly Webhook Alert
```json
{
  "name": "High-Value Transaction Alert",
  "network": "ethereum-mainnet",
  "type": "transaction",
  "filter": {
    "value": {
      "gt": "1000000000000000000"
    },
    "to": {
      "in": ["0x7a250d5630b4cf539739df2c5dacb4c659f2488d"]
    }
  },
  "action": {
    "type": "webhook",
    "url": "https://hooks.slack.com/services/T00/B00/xxx",
    "headers": {
      "Content-Type": "application/json"
    },
    "body": {
      "text": "High-value tx detected: {{transaction.hash}} value: {{transaction.value}}"
    }
  }
}
```

## Runbook Template

### Node Sync Issue Runbook
```markdown
# Node Sync Issue Runbook

## Symptoms
- Alert: NodeBlockHeightDelta
- Block height delta > 5 for > 2 minutes

## Step 1 — Verify Sync Status
```bash
curl -s http://localhost:8545 -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_syncing","params":[],"id":1}' | jq
```

## Step 2 — Check Peer Connectivity
```bash
curl -s http://localhost:8545 -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"net_peerCount","params":[],"id":1}' | jq
```

## Step 3 — Check Disk Space
```bash
df -h /data
```

## Step 4 — Restart Node (if stuck)
```bash
sudo systemctl restart geth
journalctl -u geth -n 100 --no-pager
```

## Step 5 — If still behind, check logs
```bash
journalctl -u geth --since "1 hour ago" | grep -i error
```

## Escalation
- If node does not catch up in 30 minutes, restore from snapshot
- If P2P port is unreachable, check firewall / security group rules
```
