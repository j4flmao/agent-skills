# Blockchain Infrastructure Fundamentals

## Node Types and Requirements

### Full Node
Stores the entire blockchain state (not full history). Can validate all transactions independently. Required for RPC services, wallet backends, and validator operations. Storage: 2-4TB SSD for Ethereum full node.

### Archive Node
Stores the complete historical state at every block height. Required for historical queries, analytics, and data indexing services. Storage: 12TB+ SSD for Ethereum archive node. Sync time: weeks without snapshot sync.

### Validator Node
Full node + validator client. Participates in consensus (attestations, block proposals). Requires low-latency network (25ms to validators). Multiple ISPs for redundancy. MEV-Boost integration for Ethereum validators.

## RPC Infrastructure

### JSON-RPC API
Standard API for blockchain interaction. Request types: eth_call (read state), eth_sendRawTransaction (submit tx), eth_getLogs (query events), eth_getBalance, eth_blockNumber. Rate limiting by IP, API key, or user.

### Load Balancing
Distribute RPC requests across multiple nodes. Health check: block height within threshold of peers. Sticky sessions for subscription-based services (WebSocket). Circuit breaker on unhealthy nodes.

### Caching
Common RPC responses can be cached: eth_call results (until next block), eth_getBalance (short TTL), eth_gasPrice (updated per block). Invalidated automatically on new blocks. Cache hit rate: 60-80% for typical workloads.

## Environment Management

### Devnet
Local single-node or small multi-node network. Instant block production (no mining delay). Pre-funded accounts. Used for development and unit testing.

### Testnet (Sepolia, Holesky, Goerli)
Public test networks. Sepolia: permissioned validator set, small state. Holesky: larger testnet for staking/infra testing. Goerli: deprecated. Test token faucets available.

### Mainnet
Production network. Real economic value. No faucets (real gas fees). Deployment requires: audited contracts, multi-sig governance, monitoring setup, incident response plan.
