# Blockchain Patterns Fundamentals

## Smart Contract Design Patterns

### Factory Pattern
One contract creates multiple instances of another contract. Used for: token creation (Uniswap V2 Factory creates pairs), NFT minting, user account creation. Benefits: predictable addresses, standardized deployment, event tracking for all instances.

### Proxy Pattern
Separate logic contract from storage contract. Upgrades change the logic contract while preserving state. Three main implementations: UUPS (upgrade in implementation), Transparent (upgrade in proxy), Beacon (upgrade in separate beacon contract).

### Pull-Over-Push
Instead of sending assets to users in a loop (push), let users claim their assets (pull). Prevents DoS attacks where one user's failed receive blocks all others. Each user tracks their own claimable amount.

### Oracle Pattern
External data brought on-chain for smart contract use. Pull-based (Chainlink: request → aggregation → callback) or push-based (Pyth, Chronicle: publisher pushes updates → price stored on-chain).

## Token Standards

### ERC-20 (Fungible Tokens)
Standard interface: name, symbol, decimals, totalSupply, balanceOf, transfer, approve, transferFrom. Optional extensions: Permit (ERC-2612 gasless approvals), snapshots (ERC-5805), votes (ERC-5805).

### ERC-721 (Non-Fungible Tokens)
Unique digital assets. Each token has a unique ID. Extensions: metadata (ERC-721 Metadata), enumeration (ERC-721 Enumerable), rental (ERC-4907), soulbound (ERC-5192).

### ERC-1155 (Multi-Token)
Single contract manages multiple token types (fungible + non-fungible). Batch transfers (80% cheaper for 5+ items). Used in: gaming (items + currency), metaverse (land + items).

### ERC-4626 (Yield-Bearing Vaults)
Standardized vault interface. deposit/mint (receive shares), withdraw/redeem (return assets). Single-asset vaults. Compatible with yield aggregators, lending protocols, and AMMs.

## Upgrade Pattern Selection

| Aspect | UUPS | Transparent | Beacon |
|---|---|---|---|
| Complexity | Low | Medium | High |
| Gas/call | Low (~200) | Medium (~400) | Low (~200) |
| Deploy cost | Low | High | Medium |
| Multi-impl | No | No | Yes |
| Best for | Default choice | Legacy/upgrade-heavy | Clone families |
