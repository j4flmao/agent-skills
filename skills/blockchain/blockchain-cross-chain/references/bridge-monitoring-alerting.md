# Bridge Monitoring & Alerting

## Overview

Cross-chain bridges are among the most security-critical and failure-prone components in blockchain infrastructure. Historical bridge hacks (Wormhole $326M, Ronin $620M, BNB Bridge $566M) demonstrate that bridges require comprehensive monitoring, alerting, and incident response capabilities. This reference covers bridge-specific monitoring metrics, anomaly detection patterns, alerting strategies for message delivery failures, economic security monitoring (bridge TVL, flow imbalances), validator/guardian set monitoring, and integration with on-chain and off-chain observability stacks.

## Core Architecture Concepts

### Bridge Risk Taxonomy

| Risk Category | Examples | Detection Method | Response Time |
|---|---|---|---|
| Validator/guardian compromise | Malicious signature, double-sign | On-chain verification, quorum deviation | Seconds-minutes |
| Smart contract exploit | Reentrancy, logic flaw | Transaction simulation, anomaly detection | Block-level |
| Oracle manipulation | Price feed attack | TWAP deviation, cross-reference | Minutes |
| Message delivery failure | Relayer down, gas insufficient | Liveness check, queue depth | Minutes-hours |
| Economic attack | Bridge drain via flash loan | TVL & flow monitoring | Block-level |
| Governance attack | Malicious upgrade | Contract code diff monitoring | Hours |
| Relayer economic failure | Relayer stops due to cost | Balance monitoring, gas price checks | Hours-days |

### Bridge Monitoring Layers

```
Layer 4: Business Metrics
  ├─ TVL, daily volume, active users, fee revenue
  └─ Alert: >20% TVL drop in 1 hour

Layer 3: Economic Security
  ├─ Flow imbalance (deposits vs withdrawals)
  ├─ Liquidity pool depth
  └─ Alert: >2σ flow deviation from 7-day average

Layer 2: Message Delivery
  ├─ Delivery rate (delivered / sent)
  ├─ Delivery latency (p50, p95, p99)
  ├─ Queue depth per destination chain
  └─ Alert: delivery rate < 95% for 5 minutes

Layer 1: Infrastructure
  ├─ Relayer node health (sync status, peer count)
  ├─ Oracle/guardian node health
  ├─ RPC endpoint availability
  └─ Alert: node unreachable for > 1 minute
```

### Key Bridge Metrics

| Metric | Description | Healthy Range | Calculation |
|---|---|---|---|
| Message delivery rate | % of sent messages delivered | > 99% over 1 hour | delivered / sent |
| Delivery latency (p50) | Median time from send to delivery | < 5 min | `delivered_at - sent_at` |
| Delivery latency (p95) | 95th percentile delivery time | < 30 min | `delivered_at - sent_at` |
| Queue depth | Pending messages per destination | < 100 | count(pending) |
| Flow imbalance | Net flow in/out of bridge | < 10% of TVL | |inflow - outflow| / TVL |
| Guardian set health | % of guardians signing | 100% | active_guardians / total |
| Failed messages | Messages that cannot be delivered | 0 | count(failed) |
| Reorg-protected depth | Blocks since message origin | > chain-specific finality | current_block - origin_block |

## Architecture Decision Trees

### Alert Severity Classification

```
Incident detected?
├── Fund loss in progress?
│   ├── Yes → CRITICAL: Pause bridge, notify all channels
│   └── No → Continue assessment
├── Message delivery failure?
│   ├── Single message → WARNING: No action needed (automatic retry)
│   ├── Multiple messages (> 5%) → CRITICAL: Investigate relayer/contract
│   └── All messages stalled → CRITICAL: Relayer cluster down
├── Validator/guardian anomaly?
│   ├── Single guardian offline → WARNING: Check node, rotate if needed
│   ├── Quorum not reached (> 1/3 offline) → CRITICAL: Bridge inoperable
│   └── Suspicious signature from guardian → CRITICAL: Potential compromise
└── Economic anomaly?
    ├── TVL sudden drop → WARNING: Check for large withdrawals
    ├── Flow imbalance → INFO: Monitor, check arb opportunities
    └── Unusual transaction pattern → WARNING: Manual review
```

### Monitoring Tool Selection

```
Bridge monitoring requirements?
├── On-chain event monitoring
│   ├── Real-time needed → Tenderly, Forta, custom event indexer
│   ├── Near-real-time OK → The Graph subgraph, Dune dashboard
│   └── Historical analysis only → Dune, Nansen, Google BigQuery
├── Off-chain relayer monitoring
│   ├── Kubernetes-based → Prometheus + Grafana + PagerDuty
│   ├── VM-based → Node exporter + Datadog / New Relic
│   └── Serverless → CloudWatch / Cloud Monitoring
├── Anomaly detection
│   ├── Statistical → Moving average + standard deviation alerts
│   ├── ML-based → Forta ML models, custom anomaly detection
│   └── Rule-based → Fixed thresholds (e.g., delivery rate < 99%)
└── Incident response
    ├── Auto-pause capability → Emergency multisig with monitoring integration
    ├── On-call rotation → PagerDuty / Opsgenie
    └── Post-mortem → Linear / Jira integration
```

## Implementation Strategies

### On-Chain Bridge Event Monitoring

```typescript
// Monitor bridge contract events across source and destination chains
class BridgeEventMonitor {
  private eventStore: EventStore
  private alertManager: AlertManager

  async monitorBridgeEvents(
    sourceClient: PublicClient,
    destClient: PublicClient,
    bridgeAddress: Address,
    abi: Abi
  ) {
    // Poll for MessageSent events on source chain
    const unwatchSource = sourceClient.watchContractEvent({
      address: bridgeAddress,
      abi,
      eventName: 'MessageSent',
      onLogs: async (logs) => {
        for (const log of logs) {
          await this.trackMessageDelivery(log, destClient)
        }
      }
    })

    // Poll for MessageReceived events on destination chain
    const unwatchDest = destClient.watchContractEvent({
      address: bridgeAddress,
      abi,
      eventName: 'MessageReceived',
      onLogs: async (logs) => {
        for (const log of logs) {
          await this.confirmDelivery(log)
        }
      }
    })

    return () => {
      unwatchSource()
      unwatchDest()
    }
  }

  private async trackMessageDelivery(
    sentLog: Log,
    destClient: PublicClient
  ) {
    const messageId = sentLog.args.messageId
    const destinationChain = sentLog.args.destinationChain

    // Check delivery timeout
    const sentAt = await this.getBlockTimestamp(sentLog.blockNumber, sentLog.chainId)
    const delivered = await this.checkDelivery(messageId, destinationChain)

    if (!delivered) {
      this.alertManager.sendWarning({
        type: 'MESSAGE_PENDING',
        messageId,
        sourceChain: sentLog.chainId,
        destinationChain,
        sentAt,
        elapsedMinutes: (Date.now() / 1000 - sentAt) / 60
      })
    }
  }

  private async confirmDelivery(receivedLog: Log) {
    const messageId = receivedLog.args.messageId
    await this.eventStore.markDelivered(messageId, {
      txHash: receivedLog.transactionHash,
      blockNumber: receivedLog.blockNumber,
      chainId: receivedLog.chainId,
      blockTimestamp: await this.getBlockTimestamp(
        receivedLog.blockNumber,
        receivedLog.chainId
      )
    })
  }

  private async getBlockTimestamp(blockNumber: bigint, chainId: number): Promise<number> {
    const client = multiChainProvider.getClient(chainId)
    const block = await client.getBlock({ blockNumber })
    return Number(block.timestamp)
  }
}
```

### Relayer Cluster Monitoring

```yaml
# prometheus-relayer-metrics.yaml
# Exposed by each relayer instance

# Relayer metrics
- name: relayer_messages_sent_total
  help: Total messages sent by this relayer
  type: counter

- name: relayer_messages_delivered_total
  help: Total messages delivered by this relayer
  type: counter

- name: relayer_balance
  help: Current relayer balance on source chain
  type: gauge

- name: relayer_gas_price
  help: Current gas price on source chain
  type: gauge

- name: relayer_errors_total
  help: Total errors encountered by relayer
  type: counter
  labels:
    - error_type  # rpc_error, gas_estimation, revert, timeout

- name: relayer_queue_depth
  help: Number of pending messages in relayer queue
  type: gauge

- name: relayer_last_processed_block
  help: Last block processed by relayer
  type: gauge
  labels:
    - chain_id
```

### Guardian/Validator Set Health Check

```typescript
// Monitor guardian set health for Wormhole-style bridges
class GuardianSetMonitor {
  private readonly quorumThreshold = 2/3 // 2/3 majority

  async monitorGuardianSet(
    guardianContract: Contract,
    guardianRpcEndpoints: Map<string, string>
  ) {
    const currentSet = await guardianContract.getCurrentGuardianSet()
    const guardianCount = currentSet.addresses.length
    const quorumSize = Math.ceil(guardianCount * this.quorumThreshold)

    // Check each guardian's liveness
    const statuses = await Promise.allSettled(
      currentSet.addresses.map(async (address: string, index: number) => {
        const endpoint = guardianRpcEndpoints.get(address.toLowerCase())
        if (!endpoint) return { address, status: 'UNKNOWN' }

        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            body: JSON.stringify({ jsonrpc: '2.0', method: 'health', id: 1 }),
            signal: AbortSignal.timeout(5000)
          })
          const data = await response.json()
          return {
            address,
            status: data.result?.healthy ? 'HEALTHY' : 'UNHEALTHY',
            latency: response.duration
          }
        } catch {
          return { address, status: 'UNREACHABLE' }
        }
      })
    )

    const healthy = statuses.filter(s => s.status === 'HEALTHY').length
    const reachable = statuses.filter(s => s.status !== 'UNREACHABLE').length

    // Alert conditions
    if (healthy < quorumSize) {
      this.alertManager.sendCritical({
        type: 'GUARDIAN_QUORUM_LOST',
        healthy,
        quorumSize,
        total: guardianCount,
        message: `Bridge guardian quorum lost: ${healthy}/${quorumSize} healthy`
      })
    }

    if (reachable < guardianCount) {
      this.alertManager.sendWarning({
        type: 'GUARDIAN_OFFLINE',
        unreachable: guardianCount - reachable,
        total: guardianCount,
        guardianAddresses: statuses
          .filter(s => s.status === 'UNREACHABLE')
          .map(s => s.address)
      })
    }
  }
}
```

### Flow Imbalance Detection

```typescript
// Monitor bridge TVL and flow imbalance
class BridgeEconomicMonitor {
  private history: Map<string, number[]> = new Map() // windowed history per chain pair

  async checkFlowImbalance(
    sourceChain: string,
    destChain: string,
    periodMs: number = 3600000 // 1 hour window
  ) {
    const inflows = await this.getRecentInflows(sourceChain, destChain, periodMs)
    const outflows = await this.getRecentOutflows(sourceChain, destChain, periodMs)
    const tvl = await this.getTVL(sourceChain, destChain)

    const netFlow = inflows - outflows
    const imbalanceRatio = Math.abs(netFlow) / tvl

    const key = `${sourceChain}->${destChain}`
    if (!this.history.has(key)) this.history.set(key, [])
    this.history.get(key)!.push(imbalanceRatio)

    // Keep 7 days of history
    const history = this.history.get(key)!
    if (history.length > 168) history.shift()

    // Calculate mean and std deviation from history
    const mean = history.reduce((a, b) => a + b, 0) / history.length
    const stdDev = Math.sqrt(
      history.reduce((sq, v) => sq + Math.pow(v - mean, 2), 0) / history.length
    )

    // Alert if imbalance > 2σ from historical mean
    if (imbalanceRatio > mean + 2 * stdDev && imbalanceRatio > 0.05) {
      this.alertManager.sendWarning({
        type: 'FLOW_IMBALANCE',
        sourceChain,
        destChain,
        imbalanceRatio,
        netFlow,
        tvl,
        historicalMean: mean,
        stdDev
      })
    }

    return { imbalanceRatio, netFlow, tvl }
  }
}
```

## Integration Patterns

### Multi-Layer Alert Routing

```yaml
# alert-routing.yaml

alert_routing:
  critical:
    channels:
      - pagerduty: "bridge-critical"
      - slack: "#bridge-alerts-critical"
      - sms: "+1-555-0100"
    auto_actions:
      - pause_bridge_multisig
    cooldown: 5m

  warning:
    channels:
      - slack: "#bridge-alerts-warning"
      - email: "bridge-team@company.com"
    auto_actions: []
    cooldown: 15m

  info:
    channels:
      - slack: "#bridge-metrics"
    auto_actions: []
    cooldown: 1h
```

### Bridge Dashboard (Grafana)

```json
{
  "dashboard": {
    "title": "Bridge Operations",
    "panels": [
      {
        "title": "Message Delivery Rate",
        "type": "graph",
        "targets": [{
          "expr": "sum(rate(bridge_messages_delivered_total[5m])) / sum(rate(bridge_messages_sent_total[5m])) * 100",
          "legendFormat": "Delivery Rate %"
        }],
        "thresholds": [
          { "value": 95, "color": "red" },
          { "value": 99, "color": "yellow" },
          { "value": 100, "color": "green" }
        ]
      },
      {
        "title": "Delivery Latency P95",
        "type": "graph",
        "targets": [{
          "expr": "histogram_quantile(0.95, sum(rate(bridge_delivery_latency_seconds_bucket[5m])) by (le))",
          "legendFormat": "P95 Latency"
        }],
        "thresholds": [
          { "value": 300, "color": "green" },
          { "value": 600, "color": "yellow" },
          { "value": 1800, "color": "red" }
        ]
      },
      {
        "title": "Bridge TVL",
        "type": "stat",
        "targets": [{
          "expr": "bridge_tvl_total"
        }]
      },
      {
        "title": "Guardian Set Health",
        "type": "stat",
        "targets": [{
          "expr": "bridge_guardians_healthy / bridge_guardians_total * 100"
        }]
      }
    ]
  }
}
```

## Performance Optimization

### Alert Throttling and Deduplication

```typescript
class AlertManager {
  private alertHistory: Map<string, number> = new Map()
  private cooldowns: Map<string, number> = new Map()

  sendWarning(alert: BridgeAlert) {
    const key = `${alert.type}:${alert.sourceChain}:${alert.destinationChain || 'none'}`
    const now = Date.now()
    const lastSent = this.alertHistory.get(key) || 0
    const cooldown = this.cooldowns.get(alert.type) || 60000 // default 1 min

    if (now - lastSent < cooldown) {
      return // Suppress duplicate alert within cooldown
    }

    this.alertHistory.set(key, now)
    this.routeAlert(alert, 'warning')
  }

  // Configurable cooldowns per alert type
  configureCooldowns() {
    this.cooldowns.set('MESSAGE_PENDING', 300_000) // 5 min
    this.cooldowns.set('GUARDIAN_OFFLINE', 600_000) // 10 min
    this.cooldowns.set('FLOW_IMBALANCE', 900_000) // 15 min
  }
}
```

## Security Considerations

- **Alert fatigue**: Too many false positives desensitize the on-call team. Tune thresholds carefully and implement cooldowns per alert type.
- **Monitoring infrastructure isolation**: The monitoring stack must not share infrastructure with the bridge itself. A bridge infrastructure outage should not take down monitoring.
- **Secure alerting channels**: Alert channels (Slack, PagerDuty) should be isolated from general communication. An attacker who compromises a Slack workspace should not be able to suppress bridge alerts.
- **Pause mechanism integrity**: The bridge pause multisig should be monitored for any pause/unpause actions. Alert on any governance action affecting bridge contracts.
- **On-chain monitoring as source of truth**: Off-chain monitoring can be manipulated if the monitoring infrastructure is compromised. Always verify critical alerts against on-chain state.

## Operational Excellence

### Incident Response Playbook

```markdown
## Bridge Incident: Message Delivery Stalled

**Severity**: Critical
**Detected by**: `bridge_delivery_rate < 95%` alert

### Immediate (first 5 minutes)
1. Confirm incident: check Grafana dashboard for delivery rate graph
2. Check relayer cluster health: `kubectl get pods -n bridge-relayer`
3. Check source chain RPC health: is the node syncing?
4. Check destination chain RPC health: is the node syncing?
5. Check relayer wallet balances: `kubectl exec relayer-0 -- check-balance`

### Investigation (5-15 minutes)
6. If relayer pods are crashing → check logs: `kubectl logs -n bridge-relayer`
7. If relayer balance low → fund relayer wallet
8. If RPC issues → failover to backup RPC endpoint
9. If contract issue → check if bridge contract is paused

### Resolution (15-60 minutes)
10. Fix identified issue (restart relayer, fund wallet, switch RPC)
11. Manually replay pending messages if needed
12. Verify delivery rate returning to normal
13. Create post-mortem ticket

### Post-mortem (within 24 hours)
- Root cause analysis
- Monitoring gap identification
- Runbook updates
```

### Bridge Upgrade Monitoring

```typescript
// Monitor bridge contract upgrades
async function monitorBridgeUpgrades(
  proxyAdmin: Address,
  bridgeProxy: Address,
  client: PublicClient
) {
  // Watch for AdminChanged events on the proxy
  const unwatch = client.watchContractEvent({
    address: bridgeProxy,
    abi: proxyAbi,
    eventName: 'AdminChanged',
    onLogs: async (logs) => {
      for (const log of logs) {
        // CRITICAL ALERT: Bridge admin changed
        alertManager.sendCritical({
          type: 'BRIDGE_ADMIN_CHANGED',
          newAdmin: log.args.newAdmin,
          previousAdmin: log.args.previousAdmin,
          txHash: log.transactionHash,
          timestamp: await getBlockTimestamp(log.blockNumber, client)
        })
      }
    }
  })

  // Watch for Upgraded events
  const unwatch2 = client.watchContractEvent({
    address: bridgeProxy,
    abi: proxyAbi,
    eventName: 'Upgraded',
    onLogs: async (logs) => {
      for (const log of logs) {
        // Verify new implementation against known hash
        const newImpl = log.args.implementation
        const code = await client.getBytecode({ address: newImpl })
        const codeHash = keccak256(code)

        if (!KNOWN_IMPLEMENTATION_HASHES.includes(codeHash)) {
          alertManager.sendCritical({
            type: 'BRIDGE_UNKNOWN_UPGRADE',
            newImplementation: newImpl,
            codeHash,
            txHash: log.transactionHash
          })
        }
      }
    }
  })

  return () => { unwatch(); unwatch2() }
}
```

## Testing Strategy

### Bridge Monitoring Test Suite

```typescript
describe('Bridge Monitoring', () => {
  it('should detect message delivery failure', async () => {
    const monitor = new BridgeEventMonitor(eventStore, alertManager)
    const spy = vi.spyOn(alertManager, 'sendWarning')

    // Simulate sending a message that never arrives
    await monitor.trackMessageDelivery(
      createSentLog('msg-1', sourceChain),
      destClient
    )

    // Should have sent a warning about pending message
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'MESSAGE_PENDING',
        messageId: 'msg-1',
        elapsedMinutes: expect.any(Number)
      })
    )
  })

  it('should detect flow imbalance beyond threshold', async () => {
    const monitor = new BridgeEconomicMonitor()
    const spy = vi.spyOn(alertManager, 'sendWarning')

    // Inject history with low variance
    for (let i = 0; i < 100; i++) {
      monitor.history.set('eth->arb', [0.01, 0.02, 0.015])
    }

    // Simulate large imbalance
    await monitor.checkFlowImbalance('eth', 'arb')
    // ... assert alert triggered
  })

  it('should throttle duplicate alerts', async () => {
    // Send same alert twice rapidly
    alertManager.sendWarning(alert1)
    alertManager.sendWarning(alert1) // Should be suppressed

    // ... assert only one alert routed
  })
})
```

## Common Pitfalls

| Pitfall | Consequence | Prevention |
|---|---|---|
| Alerting on every failed message | Alert fatigue, ignored critical alerts | Cooldown periods, aggregate alerting (rate-based) |
| Monitoring only one chain | Miss destination-side failures | Monitor source AND destination chains |
| No guardian/validator health monitoring | Miss loss of bridge security | Guardian set health check every minute |
| Ignoring economic flow anomalies | Late detection of bridge drain | Statistical flow imbalance detection |
| Single monitoring provider | Blind spot during provider outage | Multi-provider event monitoring (on-chain + indexer) |
| No monitoring for monitoring | Unknown monitoring failure | Heartbeat check: synthetic message every 5 min |
| Only monitoring happy path | Miss partial failure scenarios | Test: pause single guardian, stall single relayer |
| Alerts to a single channel | Missed alert during off-hours | Route to at least 2 independent channels |

## Key Takeaways

1. **Monitor message delivery rate as the primary bridge health metric** — a sustained rate below 99% indicates an issue requiring investigation.
2. **Layer your monitoring** — infrastructure → message delivery → economics → business metrics. Each layer provides context for the next.
3. **Alert on rate, not individual failures** — a single failed message is normal (automatic retries). A 5% failure rate is a critical incident.
4. **Monitor both source and destination chains independently** — a failure on either side breaks the bridge. Verify delivery from both perspectives.
5. **Economic flow monitoring catches attacks that contract monitoring misses** — unusual TVL changes or flow imbalances can indicate ongoing exploits.
6. **Guardian/validator set health is a security metric** — losing quorum means the bridge is inoperable and may be attacked.
7. **Test your monitoring with chaos experiments** — intentionally fail a relayer, pause a guardian, block a chain connection. Verify alerts fire correctly.
8. **Send synthetic heartbeat messages** — the best way to know monitoring is working is to continuously bridge a zero-value message and verify its end-to-end delivery.