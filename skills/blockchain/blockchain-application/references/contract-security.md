# Smart Contract Security

## Top Vulnerability Classes

### Reentrancy

```solidity
// ❌ Vulnerable
contract EtherVault {
    mapping(address => uint256) public balances;

    function withdraw() external {
        uint256 amount = balances[msg.sender];
        (bool success,) = msg.sender.call{value: amount}(""); // reentrancy here
        require(success, "transfer failed");
        balances[msg.sender] = 0; // state update AFTER call
    }
}

// ✅ Fixed
contract SecureVault is ReentrancyGuard {
    mapping(address => uint256) public balances;

    function withdraw() external nonReentrant {
        uint256 amount = balances[msg.sender];
        balances[msg.sender] = 0; // effect BEFORE interaction
        (bool success,) = msg.sender.call{value: amount}("");
        require(success, "transfer failed");
    }
}
```

#### Read-Only Reentrancy

```solidity
// Balances contract before update → reentrant call sees old state
// Solution: use ReentrancyGuard and update state before external call
```

### Oracle Manipulation

```solidity
// ❌ Vulnerable to flash loan attack
contract VulnerableAMM {
    function getTWAP() public view returns (uint256) {
        uint256 price = pool.spotPrice(); // manipulable in single block
        return price;
    }
}

// ✅ Use TWAP or multiple oracle sources
contract SecureAMM {
    function getTWAP(uint32 window) public view returns (uint256) {
        uint32[] memory secondsAgos = new uint32[](2);
        secondsAgos[0] = window; // look back
        secondsAgos[1] = 0;
        (int56[] memory tickCumulatives,) = pool.observe(secondsAgos);
        // time-weighted average price over window
        return uint256(UniV3Math.getQuoteAtTick(
            int24((tickCumulatives[1] - tickCumulatives[0]) / int56(window)),
            1e18, tokenIn, tokenOut
        ));
    }
}
```

### Flash Loan Attacks

```
1. Flash borrow 100M USDC
2. Manipulate oracle/AMM price
3. Exploit protocol using manipulated price
4. Repay flash loan
5. Profit
```

**Mitigation**: TWAP oracles, pause on large price deviations, min liquidity checks.

### Signature Replay

```solidity
// ❌ Vulnerable — no nonce, no chain ID
function permit(address user, uint256 amount, bytes memory signature) external {
    bytes32 message = keccak256(abi.encode(user, amount));
    address signer = ECDSA.recover(message, signature);
    // replayable on any chain, any nonce
}

// ✅ Fixed — EIP-712 typed data + nonce + deadline
function permit(address user, uint256 amount, uint256 nonce, uint256 deadline, bytes memory signature) external {
    require(block.timestamp <= deadline, "expired");
    bytes32 structHash = keccak256(abi.encode(_PERMIT_TYPEHASH, user, amount, nonce, deadline));
    bytes32 digest = _hashTypedDataV4(structHash); // includes domain separator (chainId, contract)
    address signer = ECDSA.recover(digest, signature);
    require(signer == user, "invalid signature");
    nonces[user]++; // prevent replay
}
```

### Access Control Flaws

```solidity
// ❌ Missing access control
function setFee(uint256 newFee) external { // anyone can call!
    fee = newFee;
}

// ✅ Use OpenZeppelin's Ownable or AccessControl
function setFee(uint256 newFee) external onlyOwner {
    fee = newFee;
}
```

### Integer Overflow/Underflow

```solidity
// Solidity 0.8+ has built-in overflow checks
// But watch out for:
function batchMint(address[] calldata users) external {
    unchecked { // unchecked block skips overflow checks
        totalSupply += users.length; // potential overflow
    }
}

// Safe pattern:
function batchMint(address[] calldata users) external {
    uint256 len = users.length;
    uint256 newSupply = totalSupply + len; // checked addition
    require(newSupply >= totalSupply, "overflow"); // explicit check
    totalSupply = newSupply;
}
```

### Frontrunning

```solidity
// ❌ Frontrunnable — submission order determines outcome
function submitOrder(uint256 amount, uint256 price) external { /* ... */ }

// ✅ Commit-reveal mitigates
function commit(bytes32 commitment) external { /* ... */ }
function reveal(uint256 amount, uint256 price, bytes32 salt) external {
    require(keccak256(abi.encode(amount, price, salt)) == commitments[msg.sender], "mismatch");
    // execute at original price
}
```

## Security Tools

| Tool | Purpose | Type |
|------|---------|------|
| Slither | Static analysis (detects 90+ vulnerability types) | Python |
| Mythril | Symbolic execution | Python |
| Echidna | Fuzz testing, property-based | Haskell |
| Foundry fuzz | Built-in fuzzing via forge | Solidity |
| Certora | Formal verification | Spec lang |
| Halmos | Symbolic testing | Python |
| Scribble | Runtime verification annotations | Solidity |
| AppArmor | MythX API integration | Python |

### Slither Example

```bash
slither . --detect reentrancy-eth,reentrancy-no-eth,unchecked-lowlevel \
          --filter-paths src/ \
          --fail-high
```

## Audit Checklist

### Pre-Audit

- [ ] All functions have access control modifiers
- [ ] Checks-Effects-Interactions pattern followed everywhere
- [ ] ReentrancyGuard on all external functions that transfer value
- [ ] No DOS patterns (loop over unbounded array)
- [ ] Oracle values have freshness checks and bounds
- [ ] Upgrade timelock implemented
- [ ] No hardcoded addresses (use constructor or setter)
- [ ] Events emitted for all state changes
- [ ] Emergency stop / pause mechanism available
- [ ] Flash loan resistant design

### During Audit

- [ ] Run Slither with all detectors
- [ ] Run Foundry fuzz tests with wide input ranges
- [ ] Run invariant tests for protocol-level properties
- [ ] Manual review of each external function
- [ ] Review upgrade path and proxy storage collisions
- [ ] Test mainnet fork with existing protocol composition

### Post-Audit

- [ ] Bug bounty program (Immunefi, Code4rena)
- [ ] Monitor on-chain (Forta, Tenderly)
- [ ] Gradual rollout with caps
- [ ] Emergency response plan
