# Smart Contract Security

## Threat Modeling

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SecureVault {
    mapping(address => uint256) private balances;
    uint256 private totalBalance;
    bool private paused;

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event EmergencyPause(address indexed caller);

    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }

    modifier nonReentrant() {
        uint256 localSlot;
        assembly {
            localSlot := sload(0x100)
            if eq(localSlot, 1) { revert(0, 0) }
            sstore(0x100, 1)
        }
        _;
        assembly {
            sstore(0x100, 0)
        }
    }

    function deposit() external payable whenNotPaused {
        require(msg.value > 0, "Zero deposit");

        unchecked {
            balances[msg.sender] += msg.value;
            totalBalance += msg.value;
        }

        emit Deposited(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) external nonReentrant whenNotPaused {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        require(amount <= totalBalance, "Insufficient pool");

        balances[msg.sender] -= amount;
        totalBalance -= amount;

        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");

        emit Withdrawn(msg.sender, amount);
    }

    function pause() external {
        require(msg.sender == address(this), "Only contract call");
        paused = true;
        emit EmergencyPause(msg.sender);
    }

    receive() external payable {
        revert("Direct payments not allowed");
    }
}
```

## Access Control

```solidity
contract AccessControlled {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    mapping(bytes32 => mapping(address => bool)) private roles;
    mapping(address => uint256) private lastAction;

    modifier onlyRole(bytes32 role) {
        require(roles[role][msg.sender], "Access denied");
        _;
    }

    modifier rateLimited(uint256 cooldown) {
        require(
            block.timestamp >= lastAction[msg.sender] + cooldown,
            "Rate limited"
        );
        lastAction[msg.sender] = block.timestamp;
        _;
    }

    function grantRole(bytes32 role, address account) external onlyRole(ADMIN_ROLE) {
        roles[role][account] = true;
    }

    function revokeRole(bytes32 role, address account) external onlyRole(ADMIN_ROLE) {
        roles[role][account] = false;
    }
}
```

## Key Points

- Follow check-effects-interactions pattern
- Use reentrancy guards on all external calls
- Implement access control with role-based permissions
- Add emergency pause functionality
- Use pull-over-push for withdrawals
- Validate all input parameters
- Protect against integer overflow with SafeMath
- Use timelocks for privileged operations
- Implement rate limiting for user actions
- Test with formal verification tools
- Audit all proxy upgrade paths
- Monitor on-chain for suspicious activity
