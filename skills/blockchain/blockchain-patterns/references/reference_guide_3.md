# Factory, Clone (EIP-1167) and CREATE2 Patterns

Protocols that create many instances (vaults, pools, escrow accounts, wallets) use factories. This reference covers plain factories, minimal proxy clones, deterministic deployment with CREATE2, and registry design. Upgradeable proxy mechanics (UUPS, transparent, beacon) are covered in `upgradeable-contracts.md`.

## Factory Options

| Pattern | Deploy cost per instance | Upgradeable | Notes |
|---------|--------------------------|-------------|-------|
| `new Contract(...)` | Full bytecode | No | Simple; constructor args |
| EIP-1167 minimal proxy (clone) | ~45-byte runtime | No (fixed implementation) | Initialize instead of constructor |
| Clone with immutable args | Small + appended data | No | Args read from code, cheaper than storage |
| Beacon proxy | Proxy + beacon lookup | Yes, all at once | Shared upgrade for every instance |
| CREATE2 variants of the above | Same | Same | Predictable addresses |

## Plain Factory

```solidity
contract PoolFactory {
    event PoolCreated(address indexed token0, address indexed token1, address pool);
    mapping(address => mapping(address => address)) public getPool;
    address[] public allPools;

    function createPool(address a, address b) external returns (address pool) {
        (address t0, address t1) = a < b ? (a, b) : (b, a);
        if (t0 == address(0) || t0 == t1) revert InvalidPair();
        if (getPool[t0][t1] != address(0)) revert PoolExists();
        pool = address(new Pool{salt: keccak256(abi.encode(t0, t1))}(t0, t1));
        getPool[t0][t1] = pool;
        getPool[t1][t0] = pool;
        allPools.push(pool);
        emit PoolCreated(t0, t1, pool);
    }
}
```

Sorting tokens canonicalizes the pair so each pool exists once.

## Minimal Proxy Clones (OpenZeppelin `Clones`)

```solidity
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";

contract Escrow is Initializable {
    address public buyer;
    address public seller;

    constructor() { _disableInitializers(); }   // lock the implementation

    function initialize(address buyer_, address seller_) external initializer {
        buyer = buyer_;
        seller = seller_;
    }
}

contract EscrowFactory {
    address public immutable implementation = address(new Escrow());
    event EscrowCreated(address escrow, address buyer, address seller);

    function create(address seller, bytes32 salt) external returns (address escrow) {
        escrow = Clones.cloneDeterministic(implementation, keccak256(abi.encode(msg.sender, salt)));
        Escrow(escrow).initialize(msg.sender, seller);      // same tx: no front-running window
        emit EscrowCreated(escrow, msg.sender, seller);
    }

    function predict(address creator, bytes32 salt) external view returns (address) {
        return Clones.predictDeterministicAddress(implementation, keccak256(abi.encode(creator, salt)));
    }
}
```

Rules:
- Clones share code but have independent storage; constructors never run for clones, so use `initialize`.
- Initialize in the creating transaction.
- `_disableInitializers()` in the implementation constructor prevents someone taking over the implementation itself.
- Clones are not upgradeable; to fix a bug you deploy a new implementation and new clones.
- OZ 5.x also offers `cloneWithImmutableArgs`/`cloneDeterministicWithImmutableArgs` (5.2+) and `fetchCloneArgs` to read appended args.

## CREATE2 Address Derivation

```
address = keccak256(0xff ++ factory ++ salt ++ keccak256(initCode))[12:]
```

Uses:
- Counterfactual addresses: users can receive funds at an address before the contract exists (smart accounts, payment channels).
- Same address across chains (same factory address, salt, init code).
- Off-chain address computation for UX.

Salt design:
- Include `msg.sender` (or the owner) in the salt so third parties cannot squat your address.
- Include all identity-defining parameters (e.g. token pair) so one salt maps to one logical instance.

## Redeploy and SELFDESTRUCT

Since EIP-6780 (Cancun), `SELFDESTRUCT` only deletes code when called in the same transaction as creation. The old "metamorphic contract" trick (selfdestruct then redeploy different code at the same CREATE2 address) no longer works in general; do not rely on it, and do not assume a deployed address can be reused.

## Registries and Discovery

- Emit a creation event with all parameters; indexers build the list.
- Keep an on-chain mapping only if contracts need to verify membership (`isPool[addr]`), which matters when other contracts must trust that an address is a genuine factory product.
- Avoid unbounded on-chain iteration over `allPools`.

## Verifying Factory-Created Contracts

Explorers often auto-verify identical bytecode ("similar match"). Minimal proxies are recognized as proxies pointing to the verified implementation.

## Security Considerations

| Risk | Mitigation |
|------|-----------|
| Implementation initialized by attacker | `_disableInitializers()` in constructor |
| Clone initialized by front-runner | Initialize within factory call |
| Fake instances impersonating protocol | `isInstance` mapping checked by integrators |
| Address squatting with CREATE2 | Salt includes caller |
| Implementation with `delegatecall`/selfdestruct paths | Avoid; audit implementation as shared code |

## Checklist

- [ ] Instances initialized atomically on creation
- [ ] Implementation locked
- [ ] Salt includes caller and identity parameters
- [ ] Creation event emitted with all parameters
- [ ] Membership mapping if other contracts must trust instances
- [ ] No reliance on SELFDESTRUCT/redeploy behavior
