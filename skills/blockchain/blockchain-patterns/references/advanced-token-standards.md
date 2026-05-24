# Advanced Token Standards

## ERC-2612 (Permit — Gasless Approval)

Enables token approvals via off-chain EIP-712 signatures, removing the need for a separate `approve` transaction. Critical for single-transaction DeFi operations.

### Data Structures

```solidity
// EIP-712 domain separator
function DOMAIN_SEPARATOR() external view returns (bytes32);

// Sequential nonce per address
function nonces(address owner) external view returns (uint256);

// Permit signature verification
function permit(
    address owner,
    address spender,
    uint256 value,
    uint256 deadline,
    uint8 v,
    bytes32 r,
    bytes32 s
) external;
```

### Complete Implementation Snippet

```solidity
contract TokenWithPermit is ERC20 {
    bytes32 private constant PERMIT_TYPEHASH = keccak256(
        "Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"
    );

    mapping(address => uint256) public nonces;

    constructor() ERC20("PermitToken", "PRMT") {
        // Cached domain separator
    }

    function permit(address owner, address spender, uint256 value,
                    uint256 deadline, uint8 v, bytes32 r, bytes32 s) external {
        require(block.timestamp <= deadline, "PERMIT_DEADLINE_EXPIRED");
        bytes32 structHash = keccak256(abi.encode(
            PERMIT_TYPEHASH, owner, spender, value, nonces[owner]++, deadline
        ));
        bytes32 digest = keccak256(abi.encodePacked(
            "\x19\x01", DOMAIN_SEPARATOR(), structHash
        ));
        address recovered = ecrecover(digest, v, r, s);
        require(recovered == owner, "PERMIT_INVALID_SIGNATURE");
        _approve(owner, spender, value);
    }
}
```

### Use Cases

- **DAI-style permit**: Deposit token + interact in one tx
- **Batch transfers**: Sign once, submit through relayers
- **DAO voting**: Delegate voting power without gas

## ERC-3009 (Transfer With Authorization)

Alternative to ERC-2612. Uses a different nonce model and parameter ordering.

```solidity
function transferWithAuthorization(
    address from,
    address to,
    uint256 value,
    uint256 validAfter,
    uint256 validBefore,
    bytes32 nonce,
    uint8 v,
    bytes32 r,
    bytes32 s
) external;

// Nonce consumed upfront — prevents replay
mapping(bytes32 => bool) public authorizationState;
```

Key difference from ERC-2612: `validAfter`/`validBefore` windows instead of single deadline, and consumes nonce as `bytes32` (contract-generated, not sequential).

## ERC-3440 (NFT With Off-Chain Metadata)

Defines a standard for NFTs whose metadata may be stored off-chain with verifiable proofs.

```solidity
interface IERC3440 {
    function tokenURI(uint256 tokenId) external view returns (string memory);
    function verificationProof(uint256 tokenId) external view returns (bytes memory);
}
```

Metadata URI can reference IPFS, Arweave, or HTTPS. The `verificationProof` allows on-chain verification of off-chain content integrity.

## ERC-3643 (T-REX — Token for Regulated Exchanges)

Full-compliance security token standard. Enforces identity verification at the protocol level.

```solidity
interface ITREX is IERC20 {
    // Identity registry integration
    function identityRegistry() external view returns (IIdentityRegistry);

    // Claim topics — each identity holds verified claims
    function claimTopics() external view returns (uint256[] memory);

    // Modular compliance — pluggable modules for jurisdiction rules
    function compliance() external view returns (ICompliance);

    // Only verified identity holders can transfer
    function _beforeTokenTransfer(address from, address to, uint256) internal override {
        require(
            IIdentityRegistry(identityRegistry).isVerified(to),
            "TREX: recipient not verified"
        );
        require(
            ICompliance(compliance).canTransfer(from, to, amount),
            "TREX: compliance check failed"
        );
    }
}
```

### Key Features

- **Identity Registry**: On-chain KYC/AML attestations
- **Claim Topics**: Granular permission sets (e.g., accredited investor, jurisdiction)
- **Modular Compliance**: Replaceable modules for changing regulations
- **Forced Transfers**: Regulator-controlled freeze/burn capabilities

## ERC-4400 (Consent Receipt)

Tokenizes user consent for data usage. Binds consent to specific purposes, durations, and data processors.

```solidity
interface IERC4400 {
    struct Consent {
        address issuer;       // data subject
        address processor;    // data consumer
        uint256 purposeId;    // purpose of processing
        uint256 expiration;   // consent expiry
        bytes32 dataHash;     // commitment to data scope
    }

    function issueConsent(address processor, uint256 purposeId,
                          uint256 expiration, bytes32 dataHash) external returns (uint256 tokenId);

    function revokeConsent(uint256 tokenId) external;
}
```

## ERC-4907 (Rental NFT)

Dual-role NFT standard. Owner retains ownership and can rent to users with time-bound rights.

```solidity
interface IERC4907 {
    // User = temporary rights holder, expiration = when user loses rights
    function setUser(uint256 tokenId, address user, uint64 expires) external;

    function userOf(uint256 tokenId) external view returns (address);
    function userExpires(uint256 tokenId) external view returns (uint256);
}

contract RentalNFT is ERC4907 {
    // Owner rights: transfer, set metadata, set user
    // User rights: "use" (game items, social badges, access passes)
    // Upon expiration: userOf() returns address(0)

    function _beforeTransfer(address from, address to, uint256 tokenId) internal override {
        // Clear user on transfer
        _setUser(tokenId, address(0), 0);
    }
}
```

### Use Case: NFT Lending

```
Lender (owner)                   Borrower (user)
     │                                │
     ├─ setUser(token, borrower, 30d) │
     │                                ├─ userOf(token) == borrower
     │                                ├─ can interact with gated content
     │                                │
     ├─ after 30d userExpires         │
     ├─ userOf(token) == address(0)   │
     └─ can re-list or transfer       └─ rights revoked
```

## ERC-5192 (Soulbound NFT)

Non-transferable NFTs. Once minted to an address, they cannot be transferred.

```solidity
interface IERC5192 {
    // locked = true means permanently non-transferable
    event Locked(uint256 indexed tokenId);
    event Unlocked(uint256 indexed tokenId);

    function locked(uint256 tokenId) external view returns (bool);
}

contract Soulbound is ERC721, IERC5192 {
    function locked(uint256) public pure override returns (bool) {
        return true; // permanently locked
    }

    function _beforeTokenTransfer(address from, address to, uint256 tokenId) internal override {
        require(from == address(0), "SBT: non-transferable");
        super._beforeTokenTransfer(from, to, tokenId);
    }
}
```

### Locked vs Unlocked States

| State | Transferable | Use Case |
|-------|-------------|----------|
| `locked()` | Never | Credentials, attestations, POAPs |
| `locked(0) → true` then `→ false` | After unlock | Vesting, timelocked achievements |

## ERC-5484 (Consent Soulbound Token)

Extension of ERC-5192 with consent-based burning. The issuer defines burn authorization rules.

```solidity
enum ConsentAuthorization {
    Owner,  // only owner can burn
    Issuer, // only issuer can burn
    Both,   // both must consent
    None    // never burn
}

interface IERC5484 is IERC5192 {
    function burnAuthorization(uint256 tokenId) external view returns (ConsentAuthorization);
    function authorizedBurn(uint256 tokenId, bytes calldata issuerConsent) external;
}
```

## ERC-3525 (Semi-Fungible Token — SFT)

A token that is a "slot-based value system." Each token ID represents a slot, and a `value` field represents the amount. Enables fractionalization without separate wallets.

```solidity
interface IERC3525 is IERC721 {
    // Each token has a slot and a value
    function slotOf(uint256 tokenId) external view returns (uint256);
    function valueOf(uint256 tokenId) external view returns (uint256);

    // Transfer value from one token to another (same or different slot)
    function transferValue(uint256 fromTokenId, uint256 toTokenId, uint256 value) external;

    // Slot represents a category (e.g., a bond series)
    // Value represents the amount within that category
    // Token IDs within the same slot are fungible
    // Different slots are non-fungible
}
```

### Use Cases

- **Invoice Financing**: Each invoice = token ID, value = financed amount. Partial repayments via `transferValue`
- **Bond Markets**: Each bond series = slot, tokens represent tranches
- **Pooled Positions**: LP tokens across multiple pools in one contract

```solidity
// Example: Bond market with ERC-3525
// Slot 0 = Series A 5% 2026 bonds
// Token 1 holds 10,000 USDC face value
// Token 2 holds 5,000 USDC face value (from same slot)
// Can transferValue(token1 → token2, 3,000)
// Token 1 now: 7,000, Token 2 now: 8,000
```

## ERC-1155 Extension Patterns

### Multi-Token with Individual URIs

```solidity
contract ExtendedERC1155 is ERC1155 {
    mapping(uint256 => string) private _uris;

    function uri(uint256 tokenId) public view override returns (string memory) {
        return bytes(_uris[tokenId]).length > 0 ? _uris[tokenId] : super.uri(tokenId);
    }

    function setURI(uint256 tokenId, string memory newUri) external onlyOwner {
        _uris[tokenId] = newUri;
    }
}
```

### Batch Operations

```solidity
// Burn multiple token types in one transaction
function batchBurn(address account, uint256[] calldata ids, uint256[] calldata amounts) external {
    require(account == msg.sender || isApprovedForAll(account, msg.sender), "NOT_AUTHORIZED");
    _burnBatch(account, ids, amounts);
}
```

### ERC-1155 + ERC-2612 Integration

```solidity
contract Permit1155 is ERC1155 {
    using ECDSA for bytes32;
    mapping(address => uint256) public nonces;

    function permitAll(address owner, address operator, bool approved,
                       uint256 deadline, uint8 v, bytes32 r, bytes32 s) external {
        require(deadline >= block.timestamp, "EXPIRED");
        bytes32 structHash = keccak256(abi.encode(
            PERMIT_ALL_TYPEHASH, owner, operator, approved, nonces[owner]++, deadline
        ));
        address signer = structHash.toEthSignedMessageHash().recover(v, r, s);
        require(signer == owner, "INVALID_SIGNATURE");
        _setApprovalForAll(owner, operator, approved);
    }
}
```

## Standards Comparison

| EIP | Standard Name | Transfer Restriction | EIP Status | Primary Use Case |
|-----|--------------|---------------------|------------|------------------|
| ERC-20 | Fungible Token | None | Final | Currencies, tokens |
| ERC-721 | Non-Fungible Token | None | Final | Collectibles, deeds |
| ERC-1155 | Multi Token | None | Final | Gaming, mixed assets |
| ERC-2612 | Permit (gasless approve) | None (ERC-20 extension) | Final | Single-tx DeFi |
| ERC-3009 | Transfer With Authorization | None (ERC-20 extension) | Final | Relayer-based transfers |
| ERC-3440 | NFT Off-Chain Metadata | None (ERC-721 extension) | Draft | Metadata flexibility |
| ERC-3525 | Semi-Fungible Token | Slot-based | Final | Invoice financing, bonds |
| ERC-3643 | T-REX (Regulated Token) | Identity-based | Final | Security tokens |
| ERC-4400 | Consent Receipt | Consent-gated | Draft | Data privacy |
| ERC-4626 | Yield-Bearing Vault | None (ERC-20 extension) | Final | Vault positions |
| ERC-4907 | Rental NFT | Owner ↔ User roles | Final | NFT lending, gaming |
| ERC-5192 | Soulbound NFT | Permanently locked | Final | Credentials |
| ERC-5484 | Consent Soulbound Token | Issuer/Owner consent | Draft | Revocable credentials |
