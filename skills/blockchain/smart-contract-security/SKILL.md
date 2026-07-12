---
name: Smart Contract Security
description: Automated auditing, reentrancy guards, and flashloan attack prevention.
---

# Smart Contract Security

## Reentrancy Guards
Use the Checks-Effects-Interactions pattern and OpenZeppelin's `ReentrancyGuard`.

```solidity
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract Vault is ReentrancyGuard {
    mapping(address => uint) public balances;

    function withdraw() external nonReentrant {
        uint bal = balances[msg.sender];
        require(bal > 0, "No balance");
        balances[msg.sender] = 0; // Effect
        (bool success, ) = msg.sender.call{value: bal}(""); // Interaction
        require(success, "Transfer failed");
    }
}
```

## Flashloan Attack Prevention
Use decentralized oracles (Chainlink) or TWAP (Uniswap V3) to prevent price manipulation.

## Security Audit Workflow
```mermaid
flowchart TD
    A[Source Code] --> B[Static Analysis (Slither)]
    B --> C[Fuzzing (Echidna)]
    C --> D[Formal Verification]
    D --> E[Manual Code Review]
    E --> F[Audit Report]
```
