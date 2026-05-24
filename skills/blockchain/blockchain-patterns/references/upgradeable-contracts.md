# Upgradeable Contract Patterns

## Proxy Pattern

```
Users ──> Proxy (storage + delegatecall) ──> Implementation (logic)
                 │                                      │
            Immutable address                      Upgradeable
```

### UUPS (Universal Upgradeable Proxy Standard) — RECOMMENDED

```solidity
// Proxy — minimal, immutable storage
contract UUPSProxy {
    address public implementation; // storage slot 0
    bytes32 private constant IMPLEMENTATION_SLOT =
        bytes32(uint256(keccak256("eip1967.proxy.implementation")) - 1);

    fallback() external payable {
        address impl = _getImplementation();
        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), impl, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }
}

// Implementation — contains upgrade logic
contract MyContract is UUPSUpgradeable, OwnableUpgradeable {
    uint256 public value;

    function initialize(uint256 _value) external initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
        value = _value;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
```

### Transparent Proxy

```solidity
contract TransparentProxy {
    address public implementation;
    address public admin;

    fallback() external {
        require(msg.sender != admin, "admin cannot fallback");
        assembly { /* delegatecall to implementation */ }
    }

    function upgrade(address newImpl) external {
        require(msg.sender == admin, "not admin");
        implementation = newImpl;
    }
}
```

**Trade-off**: Admin functions cost more gas (check on every call).

### Beacon Proxy

```solidity
contract Beacon {
    address public implementation;
    function upgrade(address newImpl) external onlyOwner { implementation = newImpl; }
}

contract BeaconProxy {
    function _implementation() internal view returns (address) {
        return IBeacon(beacon).implementation(); // read from beacon
    }
}
```

**Use case**: Many proxies sharing the same implementation (e.g., NFT collection clones).

## Storage Slots

```solidity
// ⚠️ Never reorder or remove storage variables
contract V1 {
    uint256 public a; // slot 0
    uint256 public b; // slot 1
}

contract V2 is V1 {
    uint256 public c; // slot 2 — append only!
}

// ❌ WRONG — broken storage
contract V2Broken is V1 {
    uint256 public c; // slot 0 — overwrites 'a'!
    uint256 public a; // slot 1 — now reads 'b'
}
```

## Diamond (EIP-2535)

```
Diamond (storage) ──> facetA (function selectors A-B)
                 ──> facetB (function selectors C-D)
                 ──> facetC (function selectors E-F)
```

```solidity
contract Diamond {
    mapping(bytes4 => address) public facets; // selector → facet

    fallback() external payable {
        address facet = facets[msg.sig];
        require(facet != address(0), "Diamond: function does not exist");
        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), facet, 0, calldatasize(), 0, 0)
            // ...
        }
    }

    function diamondCut(FacetCut[] calldata cuts) external onlyOwner {
        // Add/replace/remove selectors
    }
}
```

## Proxy Admin Patterns

| Pattern | Ownership | Upgradeability | Gas Cost |
|---------|-----------|----------------|----------|
| UUPS | In implementation | Authorize function | Low |
| Transparent | Separate admin | Admin call | High (admin check) |
| Beacon | Beacon contract | All proxies at once | Medium |
| Diamond | Diamond owner | Per-facet upgrade | Medium |

## Common Pitfalls

### Constructor → Initializer

```solidity
// ❌ Proxies don't run constructors!
contract Bad {
    uint256 public value;
    constructor(uint256 _value) { value = _value; } // never gets called
}

// ✅ Use initializer instead
contract Good is Initializable {
    uint256 public value;
    function initialize(uint256 _value) external initializer {
        value = _value;
    }
}
```

### Uninitialized Implementation

```solidity
// Setting implementation.initialize() to kill-switch:
// Prevents direct calls to implementation (not through proxy)
constructor() {
    _disableInitializers();
}
```

### Selfdestruct

```solidity
// ⚠️ Selfdestruct in implementation can brick all proxies
// Never use selfdestruct in upgradeable contracts
```
