# Running Ethereum Nodes in Production

Operating execution + consensus client pairs for RPC infrastructure or staking: deployment layout, Docker Compose example, security hardening, monitoring, upgrades and client diversity.

## Reference Layout

```
                 +---------------------- host / VM / k8s pod -----------------------+
 internet <----> | EL client (reth/geth/Nethermind/Erigon/Besu)  :30303 tcp/udp p2p   |
   p2p           |   JSON-RPC :8545 (private)   Engine :8551 (localhost only, JWT)   |
                 |                ^                                                  |
                 |                |  Engine API                                      |
 internet <----> | CL client (Lighthouse/Prysm/Teku/Nimbus/Lodestar/Grandine) :9000 |
   p2p           |   Beacon API :5052 (private)                                     |
                 |   [optional] validator client -> MEV-Boost -> relays              |
                 +-------------------------------------------------------------------+
 private network: RPC gateway (auth, rate limits) -> :8545 ; Prometheus -> metrics ports
```
One EL per CL; do not share an EL between several CLs. Validator clients connect to the CL Beacon API.

## Docker Compose Example (reth + Lighthouse)

```yaml
services:
  reth:
    image: ghcr.io/paradigmxyz/reth:<pinned-version>
    command:
      - node
      - --chain=mainnet
      - --datadir=/data
      - --http
      - --http.addr=0.0.0.0
      - --http.api=eth,net,web3
      - --authrpc.addr=0.0.0.0
      - --authrpc.port=8551
      - --authrpc.jwtsecret=/secrets/jwt.hex
      - --metrics=0.0.0.0:9001
    ports:
      - "30303:30303/tcp"
      - "30303:30303/udp"
    volumes:
      - reth-data:/data
      - ./secrets:/secrets:ro
    networks: [eth]
    restart: unless-stopped
    stop_grace_period: 3m

  lighthouse:
    image: sigp/lighthouse:<pinned-version>
    command:
      - lighthouse
      - bn
      - --network=mainnet
      - --datadir=/data
      - --execution-endpoint=http://reth:8551
      - --execution-jwt=/secrets/jwt.hex
      - --checkpoint-sync-url=https://<trusted-checkpoint-endpoint>
      - --http
      - --http-address=0.0.0.0
      - --metrics
      - --metrics-address=0.0.0.0
    ports:
      - "9000:9000/tcp"
      - "9000:9000/udp"
      - "9001:9001/udp"
    volumes:
      - lighthouse-data:/data
      - ./secrets:/secrets:ro
    networks: [eth]
    restart: unless-stopped
    stop_grace_period: 3m

networks:
  eth: {}
volumes:
  reth-data: {}
  lighthouse-data: {}
```
- RPC (8545), Beacon API (5052) and metrics are not published to the host; expose them only through a private network or authenticated gateway.
- Generous stop grace periods prevent database corruption on shutdown.
- Pin image versions; read release notes before upgrading.

## Hardening
| Area | Practice |
|---|---|
| Network | Firewall: allow inbound P2P only; RPC/Beacon/metrics on private interfaces |
| JWT | 32-byte random secret, file permissions 0400, never in images or git |
| RPC gateway | Auth (API keys/mTLS), per-key rate limits, method allow-list, payload size limits, block `debug_*`/`admin_*` |
| OS | Dedicated user, automatic security updates, SSH keys only |
| Time | chrony/NTP; alert on drift |
| Validator keys | Separate host or remote signer (Web3Signer), slashing-protection database, never run the same keys in two places |
| Backups | Keys and slashing protection DB backed up offline; chain data can be resynced (snapshots speed recovery) |

## Monitoring

| Signal | Source |
|---|---|
| Head slot vs. wall clock, sync status | CL `/eth/v1/node/syncing`, metrics |
| EL head block, `eth_syncing` | EL metrics/RPC |
| Peer counts (in/out) | Both clients |
| Engine API errors / payload validation latency | CL logs/metrics |
| Disk usage and growth rate, IOPS latency | node_exporter |
| RPC latency, error rate per method | Gateway metrics |
| Validator: attestation effectiveness, missed proposals, balance | Validator client metrics, beaconcha.in-style dashboards |

All major clients expose Prometheus metrics; client teams publish Grafana dashboards. Alert on: head lag > 2 epochs, peers below threshold, disk > 80%, missed attestations in consecutive epochs, EL/CL disconnected.

## Upgrades
1. Subscribe to client release channels and the Ethereum Foundation blog for fork announcements.
2. Upgrade on a canary node first; check logs for database migrations.
3. Upgrade EL and CL within the same maintenance window before any fork.
4. For validators, short downtime costs only missed rewards (penalties roughly equal missed rewards); double signing causes slashing, so never run two instances of the same keys during migration.

## Client Diversity
- A bug in a client with more than 1/3 of stake can prevent finality; above 2/3 it could finalize an invalid chain for its users. Prefer minority clients for both EL and CL.
- RPC providers benefit from mixing clients behind the gateway and comparing block hashes.
- Track distribution at community dashboards (e.g. clientdiversity.org) before choosing.

## Scaling RPC Infrastructure
- Horizontal pools of full nodes behind a load balancer with sticky routing for `eth_subscribe` and filter methods.
- Dedicated archive/trace nodes for heavy methods; separate queues and timeouts.
- Caching layer for immutable data (finalized blocks, receipts, code) keyed by block hash.
- Health checks that compare each node's head with the pool median and drain lagging nodes.

## Kubernetes Notes
- StatefulSets with local NVMe persistent volumes; avoid network storage with high latency.
- `hostNetwork` or NodePort/LoadBalancer for P2P ports with correct external IP advertised.
- PodDisruptionBudgets so upgrades do not take down all nodes at once.

## Checklist
- [ ] EL/CL pair with JWT on localhost/private network
- [ ] RPC behind an authenticated, rate-limited gateway
- [ ] Prometheus metrics and alerting in place
- [ ] Validator keys isolated with slashing protection
- [ ] Image versions pinned; upgrade runbook tested on a canary
- [ ] Minority clients chosen where practical
