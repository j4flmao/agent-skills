---
name: blockchain-infrastructure
description: >
  Use this skill when asked about blockchain node deployment, RPC infrastructure, CI/CD for smart contracts, monitoring and alerting for blockchain networks, MEV infrastructure (Flashbots, builders, relays), key management (KMS, HSM), and environment management for devnet/testnet/staging/mainnet. Languages: Go, Rust, TypeScript, Python, Shell. Covers node deployment (archive, full, validator nodes on bare-metal/cloud/K8s), RPC infrastructure (load balancing, caching, WSS, rate limiting), MEV infrastructure (builder/relay setup, searcher infrastructure, block building optimization), key management (AWS KMS, Fireblocks, HSMs, MPC signing, validator key management), CI/CD pipelines for smart contract testing/deployment/verification, blockchain monitoring (Prometheus exporters, Grafana, Forta, Tenderly), and multi-environment configuration (devnet, testnet, staging, mainnet per chain). Integrates with shared devops skills: ansible, terraform, kubernetes-patterns, monitoring, vault, cdn-edge, and backup-dr for infrastructure operations. Do NOT use for: core protocol development (use blockchain-core), smart contract development (use blockchain-application), or general devops outside blockchain context.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsuf: true
tags: [blockchain, infrastructure, devops, deployment, phase-blockchain]
---

# blockchain-infrastructure

## Trigger
"blockchain deploy", "node deployment", "archive node", "validator node", "RPC infrastructure", "blockchain RPC", "JSON-RPC load balancing", "smart contract CI/CD", "forge CI", "hardhat CI", "blockchain monitoring", "Prometheus blockchain", "Grafana blockchain", "Forta", "Tenderly", "devnet", "testnet", "blockchain environment", "mainnet deploy", "contract verification", "blockchain DevOps", "MEV infrastructure", "builder", "relay", "Flashbots", "MEV relay", "block building", "KMS", "HSM", "key management blockchain", "Fireblocks", "HSM blockchain", "validator key management"

## Rules
1. Deploy archive nodes for data availability, full nodes for RPC, validator nodes for consensus participation
2. Use Ansible for config management of bare-metal nodes, Terraform for cloud nodes, Helm for K8s deployments
3. Always run at least 2 geographically distributed RPC nodes behind a load balancer for HA
4. CI/CD: Foundry forge for tests + Slither for static analysis + contract verification in one pipeline
5. Monitor: node sync status (block height lag), peer count, mempool size, RPC latency, validator status
6. Environment configs must specify: chain ID, RPC endpoints, block explorer URL, faucet, registry addresses
7. Use the references in `references/` for deep technical detail
8. Reference shared skills: `skills/devops/ansible`, `skills/devops/terraform`, `skills/devops/monitoring`, `skills/devops/vault`, `skills/devops/cdn-edge`, `skills/devops/backup-dr` for standard devops practices

## Response Format
1. **Deployment topology**: node type, infrastructure sizing, network requirements
2. **Provisioning**: Ansible/Terraform/K8s configuration, secrets management
3. **CI/CD pipeline**: test → build → verify → deploy → monitor flow
4. **Configuration**: environment-specific parameters, chain settings
5. **Monitoring & alerting**: metrics, dashboards, SLOs, runbooks

## References
  - references/blockchain-infrastructure-advanced.md — Blockchain Infrastructure Advanced Topics
  - references/blockchain-infrastructure-fundamentals.md — Blockchain Infrastructure Fundamentals
  - references/ci-cd-smart-contracts.md — CI/CD for Smart Contracts
  - references/environment-mgmt.md — Environment Management
  - references/kms-hsm.md — KMS & HSM for Blockchain
  - references/mev-infrastructure.md — MEV Infrastructure
  - references/monitoring-alerting.md — Monitoring and Alerting
  - references/node-deployment.md — Node Deployment
  - references/rpc-infrastructure.md — RPC Infrastructure
## Phase
blockchain → blockchain-infrastructure
