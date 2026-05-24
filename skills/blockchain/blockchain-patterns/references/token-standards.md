# Token Standards & Contracts

## ERC-20 (Fungible Token)

```solidity
interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}
```

### Implementation (OpenZeppelin)

```solidity
contract MyToken is ERC20, Ownable {
    mapping(address => uint256) private _balances;

    function _beforeTokenTransfer(address from, address to, uint256 amount) internal override {
        // Custom logic: no transfer during pause
        require(!paused(), "token paused");
        super._beforeTokenTransfer(from, to, amount);
    }
}
```

## ERC-721 (Non-Fungible Token)

```solidity
interface IERC721 {
    function balanceOf(address owner) external view returns (uint256);
    function ownerOf(uint256 tokenId) external view returns (address);
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
    function transferFrom(address from, address to, uint256 tokenId) external;
    function approve(address to, uint256 tokenId) external;
    function setApprovalForAll(address operator, bool approved) external;
}
```

### ERC-721A (Gas-optimized, Azuki)

```solidity
contract AzukiStyle is ERC721A {
    // ERC721A optimizes batch minting:
    // O(n) storage writes → O(1) for n mints
    // Tracks balance + owned only for first token in batch
    function _mint(address to, uint256 quantity) internal {
        // ... ERC721A optimized storage
    }
}
```

## ERC-1155 (Multi Token)

```solidity
interface IERC1155 {
    function balanceOf(address account, uint256 id) external view returns (uint256);
    function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes calldata data) external;
    function balanceOfBatch(address[] calldata accounts, uint256[] calldata ids) external view returns (uint256[] memory);
}
```

- Single contract for fungible, non-fungible, and semi-fungible tokens
- Batch operations: `safeBatchTransferFrom`

## ERC-4626 (Tokenized Vault)

```solidity
interface IERC4626 is IERC20 {
    function asset() external view returns (address);
    function totalAssets() external view returns (uint256);
    function convertToShares(uint256 assets) external view returns (uint256);
    function convertToAssets(uint256 shares) external view returns (uint256);
    function maxDeposit(address receiver) external view returns (uint256);
    function previewDeposit(uint256 assets) external view returns (uint256);
    function deposit(uint256 assets, address receiver) external returns (uint256);
    function maxMint(address receiver) external view returns (uint256);
    function previewMint(uint256 shares) external view returns (uint256);
    function mint(uint256 shares, address receiver) external returns (uint256);
    function maxWithdraw(address owner) external view returns (uint256);
    function previewWithdraw(uint256 assets) external view returns (uint256);
    function withdraw(uint256 assets, address receiver, address owner) external returns (uint256);
    function maxRedeem(address owner) external view returns (uint256);
    function previewRedeem(uint256 shares) external view returns (uint256);
    function redeem(uint256 shares, address receiver, address owner) external returns (uint256);
}
```

## ERC-4337 (Account Abstraction)

```solidity
// UserOperation — not a tx, a meta-transaction
struct UserOperation {
    address sender;
    uint256 nonce;
    bytes initCode;            // deploy AA wallet if needed
    bytes callData;            // execution payload
    uint256 callGasLimit;
    uint256 verificationGasLimit;
    uint256 preVerificationGas;
    uint256 maxFeePerGas;
    uint256 maxPriorityFeePerGas;
    bytes paymasterAndData;
    bytes signature;
}
```

### Flow

```
User → Bundle → EntryPoint → Execute
        │                      │
   Bundler aggregates    Verifies signature, pays gas
   UserOps into bundle   Calls wallet.exec()
```

## SPL Token Standard (Solana)

```rust
// Solana Program Library token
use spl_token::instruction;

struct TokenAccount {
    mint: Pubkey,
    owner: Pubkey,
    amount: u64,
    delegate: Option<Pubkey>,
    state: AccountState,
}

// SPL-22: Token-2022 with extensions (transfer fees, confidential transfers, interest-bearing)
```

## Token Security Patterns

| Pattern | ERC-20 | ERC-721 | ERC-1155 |
|---------|--------|---------|----------|
| Pausable | OpenZeppelin | OpenZeppelin | OpenZeppelin |
| Burnable | `_burn()` | `_burn()` | `_burn()` |
| Mintable | `_mint()` + role | `_safeMint()` | `_mint()` |
| Permit (EIP-2612) | Off-chain approval | N/A | N/A |
| Royalty (EIP-2981) | N/A | `royaltyInfo()` | `royaltyInfo()` |
