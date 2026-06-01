---
name: blockchain-infrastructure
description: >
  Use this skill when asked about blockchain node deployment, RPC infrastructure, CI/CD for smart contracts, monitoring and alerting for blockchain networks, MEV infrastructure (Flashbots, builders, relays), key management (KMS, HSM), and environment management for devnet/testnet/staging/mainnet. Languages: Go, Rust, TypeScript, Python, Shell. Covers node deployment (archive, full, validator nodes on bare-metal/cloud/K8s), RPC infrastructure (load balancing, caching, WSS, rate limiting), MEV infrastructure (builder/relay setup, searcher infrastructure, block building optimization), key management (AWS KMS, Fireblocks, HSMs, MPC signing, validator key management), CI/CD pipelines for smart contract testing/deployment/verification, blockchain monitoring (Prometheus exporters, Grafana, Forta, Tenderly), and multi-environment configuration (devnet, testnet, staging, mainnet per chain). Integrates with shared devops skills. Do NOT use for: core protocol development (use blockchain-core), smart contract development (use blockchain-application), or general devops outside blockchain context.
version: "1.1.0"
author: "j4flmao"
license: "MIT"
tags: [blockchain, infrastructure, devops, deployment, phase-blockchain]
---

# Blockchain Infrastructure

## Purpose
Guide blockchain infrastructure operations: node deployment, RPC infrastructure, smart contract CI/CD, monitoring, MEV infrastructure, and key management. Covers production-grade deployment patterns for all major blockchain networks.

## Agent Protocol

### Trigger
"blockchain deploy", "node deployment", "archive node", "validator node", "RPC infrastructure", "blockchain RPC", "JSON-RPC load balancing", "smart contract CI/CD", "forge CI", "hardhat CI", "blockchain monitoring", "Prometheus blockchain", "Grafana blockchain", "Forta", "Tenderly", "devnet", "testnet", "blockchain environment", "mainnet deploy", "contract verification", "blockchain DevOps", "MEV infrastructure", "builder", "relay", "Flashbots", "MEV relay", "block building", "KMS", "HSM", "key management blockchain", "Fireblocks", "HSM blockchain", "validator key management", "searcher infrastructure"

### Input Context
- Blockchain networks to support
- Node types (archive/full/validator)
- Infrastructure provider (bare-metal/cloud/K8s)
- Scale requirements (RPC load, number of chains, validators)
- Security requirements (key management, access control, compliance)
- Budget constraints

### Output Artifact
Infrastructure architecture specification including: deployment topology, provisioning configuration, CI/CD pipeline, monitoring stack, and operations runbooks.

### Response Format
1. **Deployment topology**: node type, infrastructure sizing, network requirements, geographic distribution
2. **Provisioning**: Ansible/Terraform/K8s configuration, secrets management, upgrade strategy
3. **CI/CD pipeline**: test → build → verify → deploy → monitor flow with security gates
4. **Configuration**: environment-specific parameters, chain settings, multi-env strategy
5. **Monitoring & alerting**: metrics, dashboards, SLOs, runbooks, escalation

### Completion Criteria
- Node deployment topology includes: sizing, network, storage, and HA strategy
- Provisioning automation covers: initial setup, upgrades, backups, disaster recovery
- CI/CD pipeline includes: contract testing, static analysis, deployment, verification, monitoring
- Monitoring covers: node health, chain health, infrastructure health, security events
- Runbooks document: deploy, upgrade, rollback, incident response procedures

### Max Response Length
5000 tokens

## Decision Trees

### Node Deployment
```
Node requirement:
├── Archive node (full historical state)?
│   ├── Storage: 12TB+ (Ethereum), 500GB+ (Solana)
│   ├── RAM: 64GB+ (Erigon), 128GB+ (geth full archive)
│   ├── CPU: 16+ cores
│   └── Sync: weeks (snapshot sync recommended)
├── Full node (recent state only)?
│   ├── Storage: 2-4TB SSD
│   ├── RAM: 32GB+
│   ├── CPU: 8+ cores
│   └── Sync: days (snapshot sync available)
├── Validator node?
│   ├── Same as full node + low latency to other validators
│   ├── MEV-Boost integration for Ethereum validators
│   └── Redundant internet connection (2+ ISPs)
└── Light node?
    ├── Minimal storage (MBs)
    ├── Trust-minimized via state proofs
    └── Suitable for wallets, mobile, embedded
```

### RPC Infrastructure Pattern
```
RPC traffic:
├── Read-heavy (queries, data fetching)?
│   ├── Multi-region full nodes behind load balancer
│   ├── Cache layer (Redis for common queries)
│   ├── Read replicas for historical data
│   └── Rate limiting per API key/user/IP
├── Write-heavy (transaction submission)?
│   ├── Direct node connection (no LB for tx broadcast)
│   ├── Transaction replacement (Replace-by-fee)
│   ├── Private mempool integration (Flashbots Protect)
│   └── Gas estimation caching
└── Real-time (WebSocket)?
    ├── Dedicated WSS nodes (not behind HTTP LB)
    ├── Connection pooling (many concurrent subs)
    ├── Sticky sessions for subscription consistency
    └── Heartbeat/keepalive management
```

### MEV Infrastructure
```
Role in MEV supply chain:
├── Searcher?
│   ├── Private mempool access (Flashbots, BloxRoute)
│   ├── Backrun/arbitrage bot infrastructure
│   ├── Fast node (low latency to builders)
│   └── Simulation engine (eth_call bundle simulation)
├── Builder?
│   ├── High-performance block building
│   ├── Order flow integration (searcher bundles + public tx pool)
│   ├── Optimistic relaying for latency
│   └── Compliance: OFAC filtering, MEV-Boost relays
├── Relayer?
│   ├── MEV-Boost relay (Flashbots, bloXroute, Eden, RelayScan)
│   ├── Block validation before forwarding
│   ├── Bid privacy (encrypted until slot)
│   └── DoS protection and rate limiting
└── Validator (MEV-Boost)?
    ├── mev-boost binary installation
    ├── Relay configuration (trusted relays)
    ├── Fee recipient address
    └── Max profitable blocks (boost timeout)
```

## CI/CD for Smart Contracts

### Foundry CI Pipeline
```yaml
name: smart-contract-ci
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: foundry-rs/foundry-toolchain@v1
      - name: Run lint
        run: forge fmt --check
      - name: Run Slither
        run: slither src/ --solc-remaps @openzeppelin=lib/openzeppelin-contracts
      - name: Run tests
        run: forge test -vvv
      - name: Run fuzz tests
        run: forge test --fuzz-seed 0 --fuzz-runs 10000
      - name: Gas snapshot
        run: forge snapshot
      - name: Deploy to testnet
        if: github.ref == 'refs/heads/main'
        run: forge script script/Deploy.s.sol --rpc-url $TESTNET_RPC --broadcast
```

### Deployment Pipeline Security
```yaml
# Deployment stages with gates
stages:
  - test: forge test, slither, aderyn
    gate: all tests passing, zero high-severity findings
  - deploy-testnet: forge script, verify on explorer
    gate: test stage passed, manual approval
  - verify-testnet: run integration tests against deployed contracts
    gate: all integration tests passing
  - deploy-mainnet: forge script with mainnet RPC + private key from KMS
    gate: verify-testnet passed, multi-sig signing completed
  - verify-mainnet: etherscan verification, monitoring setup
    gate: contract verified, monitoring alerts active
```

## Monitoring Stack

### Key Metrics
| Category | Metric | Alert Threshold |
|---|---|---|
| Node sync | Block height lag | >10 blocks behind tip |
| Peer count | Connected peers | <5 peers |
| Mempool | Pending transactions | >10,000 pending |
| RPC | Request latency | >500ms p99 |
| RPC | Error rate | >1% of requests |
| Validator | Missed attestations | >5% over 100 epochs |
| Key management | Signing failures | Any failure |
| Disk | Storage utilization | >85% |

## Rules
1. Archive nodes for data availability, full nodes for RPC, validator nodes for consensus
2. Use Ansible for bare-metal, Terraform for cloud, Helm for K8s
3. Always run ≥2 geographically distributed RPC nodes behind load balancer for HA
4. CI/CD: Foundry forge tests + Slither static analysis + contract verification in one pipeline
5. Monitor: sync status (block height lag), peer count, mempool size, RPC latency, validator status
6. Environment configs must specify: chain ID, RPC endpoints, block explorer, faucet, registry addresses
7. Never commit private keys — use KMS, HSM, or hardware wallets for signing
8. For validators, never expose validator keys to the execution client — use separate signing infra
9. Test all infrastructure changes on testnet before mainnet
10. Document and automate disaster recovery procedures

## References
  - references/blockchain-infrastructure-advanced.md — Blockchain Infrastructure Advanced Topics
  - references/blockchain-infrastructure-fundamentals.md — Blockchain Infrastructure Fundamentals
  - references/ci-cd-smart-contracts.md — CI/CD for Smart Contracts
  - references/disaster-recovery-backup.md — Disaster Recovery & Backup
  - references/environment-mgmt.md — Environment Management
  - references/kms-hsm.md — KMS & HSM for Blockchain
  - references/mev-infrastructure.md — MEV Infrastructure
  - references/monitoring-alerting.md — Monitoring and Alerting
  - references/node-deployment.md — Node Deployment
  - references/performance-benchmarking.md — Performance Benchmarking
  - references/rpc-infrastructure.md — RPC Infrastructure
  - references/validator-operations.md — Validator Operations Guide

## Phase
blockchain → blockchain-infrastructure
