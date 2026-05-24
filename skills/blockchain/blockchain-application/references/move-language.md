# Move Language (Sui & Aptos)

## Core Concepts

### Abilities

| Ability | Purpose | Used On |
|---------|---------|---------|
| `copy` | Value can be copied | Value types |
| `drop` | Value can be discarded | Temp data |
| `key` | Stored in global storage | Resources, assets |
| `store` | Stored inside a `key` struct | Nested data |

### Global Storage

```move
move_to<T: key>(signer, T);              // Publish resource
move_from<T: key>(addr): T;              // Remove resource
borrow_global<T: key>(addr): &T;         // Read
borrow_global_mut<T: key>(addr): &mut T; // Write
exists<T: key>(addr): bool;              // Check
```

### Linear Types (Resources)

```move
struct Coin has key, store { id: UID, value: u64 }
// ❌ No `copy` or `drop` on Coin
// Must be moved or explicitly destroyed
fun transfer_coin(coin: Coin, recipient: address) {
    transfer::transfer(coin, recipient); // consumes coin
}

fun destroy(token: Token) {
    let Token { id, amount } = token; // destructure
    test_utils::destroy(id);
    // amount (u64) has `drop`, fine to discard
}
```

## Sui Move

### Object Model

```move
// Every Sui object must have `id: UID` as first field
struct SuiObject has key, store {
    id: UID,
    version: u64,
    previous_tx: TxContext,
}
```

### Creating a Coin

```move
module examples::my_coin {
    public struct MY_COIN has drop {}

    fun init(ctx: &mut TxContext) {
        let (treasury_cap, metadata) = coin::create_currency<MY_COIN>(
            ctx, 6, b"MYC", b"My Coin", b"", option::none());
        transfer::public_freeze_object(metadata);
        transfer::public_transfer(treasury_cap, ctx.sender());
    }

    public entry fun mint(treasury_cap: &mut TreasuryCap<MY_COIN>, amount: u64,
        recipient: address, ctx: &mut TxContext) {
        let coin = coin::mint(treasury_cap, amount, ctx);
        transfer::public_transfer(coin, recipient);
    }
}
```

### NFT

```move
module examples::devnet_nft {
    public struct DevNetNFT has key, store {
        id: UID, name: String, description: String, url: Url,
    }

    public entry fun mint_to_sender(name: vector<u8>, description: vector<u8>,
        url: vector<u8>, ctx: &mut TxContext) {
        let nft = DevNetNFT {
            id: object::new(ctx),
            name: string::utf8(name),
            description: string::utf8(description),
            url: url::new_unsafe_from_bytes(url),
        };
        transfer::transfer(nft, tx_context::sender(ctx));
    }

    public entry fun burn(nft: DevNetNFT) {
        let DevNetNFT { id, name: _, description: _, url: _ } = nft;
        object::delete(id);
    }
}
```

### Dynamic Fields

```move
module examples::hero {
    public struct Hero has key { id: UID, level: u64 }
    public struct Sword has key, store { id: UID, power: u64 }

    public entry fun add_sword(hero: &mut Hero, power: u64, ctx: &mut TxContext) {
        dynamic_field::add(hero, b"sword", Sword { id: object::new(ctx), power });
    }

    public fun get_sword_power(hero: &Hero): u64 {
        let sword: &Sword = dynamic_field::borrow(hero, b"sword");
        sword.power
    }
}
```

### Programmable Transaction Blocks (PTBs)

```
Constructed off-chain, executed atomically:
Split coin → Transfer → Merge → Call entry function
```

### Signature Verification

```move
let valid = ed25519::verify(b"message", pubkey, sig);
assert!(valid, EInvalidSignature);
// Supports: Ed25519, Secp256k1, Secp256r1, multi-sig
```

## Aptos Move

### Fungible Token

```move
module examples::my_token {
    use aptos_framework::fungible_asset;

    fun init(creator: &signer) {
        let (burn_ref, mint_ref, metadata) =
            fungible_asset::create_fungible_asset(
                creator, 1000000, b"My Token", b"MTK", 6,
                b"https://token.io/icon.png", b"https://token.io");
        move_to(creator, MyToken {});
    }

    public entry fun mint(recipient: &signer, amount: u64) {
        let asset = fungible_asset::mint(&mint_ref, amount);
        fungible_asset::deposit(recipient.address_of(), asset);
    }
}
```

### NFT

```move
module examples::my_nft {
    public entry fun mint_nft(creator: &signer, collection_name: String,
        name: String, description: String, uri: String) {
        token::create_token(creator, collection_name, name, description, 1, uri);
    }

    public entry fun transfer_nft(owner: &signer, token_id: TokenId, recipient: address) {
        token::direct_transfer(owner, recipient, token_id, 1);
    }
}
```

### Block-STM Parallel Execution

```
Optimistic concurrency with multiversioning:
1. Pre-execute all txns (speculative)
2. Validate reads; re-execute on conflict
3. Commit results
```

## Security Patterns

### Pattern 1: Signer Verification

```move
public fun withdraw(owner: &signer, amount: u64) acquires Vault {
    let addr = signer::address_of(owner);
    assert!(exists<Vault>(addr), ENoVault);
    let vault = borrow_global_mut<Vault>(addr);
    assert!(vault.owner == addr, ENotOwner);
    vault.balance = vault.balance - amount;
}
```

### Pattern 2: Capability-Based Access

```move
struct AdminCap has key, store { id: UID }
public entry fun admin_action(cap: &AdminCap, ...) {
    // Having cap proves authorization — no signer check needed
}
```

### Pattern 3: Anti-Pattern (Non-Linear Types)

```move
// ❌ DO NOT: copy on asset-like structs
struct BadToken has copy, store { value: u64 } // infinite supply bug
// ✅ Correct: Asset types need `key` + no `copy`
struct GoodToken has key, store { id: UID, value: u64 }
```

### Pattern 4: Proper Destruction

```move
public fun burn(token: Token) {
    let Token { id, value: _ } = token; // destructure all fields
    object::delete(id);                  // delete UID
    // value (u64) has `drop`, implicitly discarded
}
```

## Comparison: Solidity vs Rust (Anchor) vs Move

| Feature | Solidity (EVM) | Rust (Anchor) | Move (Sui/Aptos) |
|---------|---------------|---------------|------------------|
| Storage | SLOAD/SSTORE | Account data (serialized) | `move_to`/`borrow_global` |
| Ownership | msg.sender | Owner field | signer + `key` resource |
| Reentrancy | Possible (guard needed) | Impossible | Impossible |
| Upgrade | Proxy (EIP-1967) | Buffer loader | Package swap |
| Parallelism | Sequential | Sealevel (read set) | Block-STM / PTB |
| Formal verification | Halmos, Certora | SMT, Z3 | Move Prover |

### Upgrade

```move
// Compatible upgrade: additive functions + structs
// incompatible: full replacement (governance)
// sui client upgrade --upgrade-capability <cap_id>
```

## Development Tools

| Tool | Install |
|------|---------|
| `sui` CLI | `cargo install --git https://github.com/MystenLabs/sui sui` |
| `aptos` CLI | `curl -fsSL https://aptos.dev/scripts/install_cli.py \| python3` |
| `move` CLI | `cargo install move-cli` |
| Move Analyzer | `cargo install move-analyzer` |
| Move Prover | `cargo install move-prover` |

### Move Prover Example

```move
module examples::safe_math {
    public fun add(a: u64, b: u64): u64 {
        let result = a + b;
        assert!(result >= a, EOverflow);
        result
    }
    spec add {
        requires a + b <= MAX_U64;
        ensures result == a + b;
        aborts_if a + b > MAX_U64;
    }
}
// Run: move prover prove examples/safe_math.move
```
