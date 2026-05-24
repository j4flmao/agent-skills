# Smart Contract Design Patterns

## Access Control

### Ownable

```solidity
contract Ownable {
    address public owner;

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }
}
```

### Role-Based (OpenZeppelin AccessControl)

```solidity
import "@openzeppelin/contracts/access/AccessControl.sol";

contract MyContract is AccessControl {
    bytes32 public constant ADMIN = keccak256("ADMIN");
    bytes32 public constant MINTER = keccak256("MINTER");

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function mint(address to, uint256 amount) external onlyRole(MINTER) {
        // mint logic
    }
}
```

## Checks-Effects-Interactions

```solidity
// ✅ Correct
function withdraw(uint256 amount) external {
    // CHECK
    require(balances[msg.sender] >= amount, "insufficient");

    // EFFECT
    balances[msg.sender] -= amount;

    // INTERACTION
    (bool success,) = msg.sender.call{value: amount}("");
    require(success, "transfer failed");
}

// ❌ Reentrancy vulnerable
function badWithdraw(uint256 amount) external {
    (bool success,) = msg.sender.call{value: amount}(""); // INTERACTION FIRST
    require(success, "transfer failed");
    balances[msg.sender] -= amount; // EFFECT AFTER — REENTRANCY!
}
```

### Reentrancy Guard

```solidity
abstract contract ReentrancyGuard {
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _status = _NOT_ENTERED;

    modifier nonReentrant() {
        require(_status != _ENTERED, "reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }
}
```

## Emergency Stop (Circuit Breaker)

```solidity
contract Pausable {
    bool public paused;
    modifier whenNotPaused() { require(!paused, "paused"); _; }

    function pause() external onlyOwner { paused = true; }
    function unpause() external onlyOwner { paused = false; }
}

// Inherit and use modifier
contract Vault is ReentrancyGuard, Pausable {
    function withdraw(uint256 amount) external nonReentrant whenNotPaused {
        // safe
    }
}
```

## Factory Pattern

```solidity
contract TokenFactory {
    event TokenCreated(address token, address owner);

    function createToken(string memory name, string memory symbol) external returns (address) {
        Token token = new Token(name, symbol, msg.sender);
        emit TokenCreated(address(token), msg.sender);
        return address(token);
    }
}

// Minimal proxy (ERC-1167)
function clone(address implementation) internal returns (address) {
    bytes20 implBytes = bytes20(implementation);
    address clone;
    assembly {
        let clonePtr := mload(0x40)
        mstore(clonePtr, 0x3d602d80600a3d3981f3363d3d373d3d3d363d73000000000000000000000000)
        mstore(add(clonePtr, 0x14), implBytes)
        mstore(add(clonePtr, 0x28), 0x5af43d82803e903d91602b57fd5bf30000000000000000000000000000000000)
        clone := create(0, clonePtr, 0x37)
    }
    require(clone != address(0), "create failed");
    return clone;
}
```

## Pull Over Push (Payment)

```solidity
// ❌ Push — send to all users (vulnerable to DoS)
function distribute(uint256[] calldata amounts, address[] calldata users) external {
    for (uint256 i = 0; i < users.length; i++) {
        payable(users[i]).transfer(amounts[i]); // one failing user blocks all
    }
}

// ✅ Pull — users withdraw themselves
contract PullPayment {
    mapping(address => uint256) public pendingWithdrawals;

    function withdraw() external {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "nothing to withdraw");
        pendingWithdrawals[msg.sender] = 0;
        (bool success,) = msg.sender.call{value: amount}("");
        require(success, "transfer failed");
    }
}
```

## Flash Loan Pattern

```solidity
interface IFlashLoanReceiver {
    function executeOperation(
        address token, uint256 amount, uint256 fee, bytes calldata params
    ) external returns (bool);
}

contract FlashLender {
    function flashLoan(address receiver, uint256 amount, bytes calldata params) external {
        uint256 balanceBefore = token.balanceOf(address(this));
        token.transfer(receiver, amount);

        // Receiver must return amount + fee
        require(
            IFlashLoanReceiver(receiver).executeOperation(address(token), amount, fee, params),
            "flash loan failed"
        );

        uint256 balanceAfter = token.balanceOf(address(this));
        require(balanceAfter >= balanceBefore + fee, "not repaid");
    }
}
```

## Batch Processing

```solidity
contract BatchTransfer {
    function batchTransfer(address[] calldata recipients, uint256[] calldata amounts) external {
        require(recipients.length == amounts.length, "length mismatch");
        uint256 total;
        unchecked {
            for (uint256 i = 0; i < recipients.length; i++) {
                total += amounts[i];
            }
        }
        require(token.balanceOf(msg.sender) >= total, "insufficient");

        for (uint256 i = 0; i < recipients.length; i++) {
            token.transferFrom(msg.sender, recipients[i], amounts[i]);
        }
    }
}
```

## Timelock Controller

```solidity
contract TimelockController {
    uint256 public immutable delay;
    mapping(bytes32 => bool) public queued;

    constructor(uint256 _delay) { delay = _delay; }

    function queue(address target, bytes memory data) external onlyOwner {
        queued[keccak256(abi.encode(target, data, block.timestamp + delay))] = true;
    }

    function execute(address target, bytes memory data) external onlyOwner {
        bytes32 id = keccak256(abi.encode(target, data, block.timestamp));
        require(queued[id], "not queued");
        delete queued[id];
        (bool success,) = target.call(data);
        require(success, "execution failed");
    }
}
```

## Gas Golfing Techniques

```solidity
// Use constant over immutable over variable
address constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48; // cheapest
address immutable public factory; // medium cost
address public owner; // most expensive (SLOAD)

// Use short-circuit evaluation (OR = cheap, AND = same)
require(isAdmin[msg.sender] || block.timestamp > deadline, "denied");

// Cache array length
for (uint256 i; i < users.length; i++) // ❌ reads length each iteration
for (uint256 i; i < len; i++) { unchecked { ++i; } } // ✅ cache + unchecked

// Use uint256 (native word size) over smaller types when not packing
// EVM operates on 256-bit words — uint8 costs same as uint256 alone
```
