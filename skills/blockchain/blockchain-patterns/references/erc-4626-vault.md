# ERC-4626 Yield-Bearing Vault Standard

## Overview

ERC-4626 tokenizes a yield-bearing position as an ERC-20. Vault shares represent pro-rata ownership of an underlying `asset()`. The standard enables uniform vault interfaces for aggregators, lending protocols, and yield optimizers.

```
User deposits asset ──> Vault mints shares
User redeems shares ──> Vault returns asset + yield
```

## Interface

```solidity
interface IERC4626 is IERC20 {
    // Asset
    function asset() external view returns (address);
    function totalAssets() external view returns (uint256);

    // Conversion
    function convertToShares(uint256 assets) external view returns (uint256);
    function convertToAssets(uint256 shares) external view returns (uint256);

    // Deposit
    function maxDeposit(address receiver) external view returns (uint256);
    function previewDeposit(uint256 assets) external view returns (uint256);
    function deposit(uint256 assets, address receiver) returns (uint256 shares);

    // Mint
    function maxMint(address receiver) external view returns (uint256);
    function previewMint(uint256 shares) external view returns (uint256);
    function mint(uint256 shares, address receiver) returns (uint256 assets);

    // Withdraw
    function maxWithdraw(address owner) external view returns (uint256);
    function previewWithdraw(uint256 assets) external view returns (uint256);
    function withdraw(uint256 assets, address receiver, address owner) returns (uint256 shares);

    // Redeem
    function maxRedeem(address owner) external view returns (uint256);
    function previewRedeem(uint256 shares) external view returns (uint256);
    function redeem(uint256 shares, address receiver, address owner) returns (uint256 assets);

    event Deposit(address indexed sender, address indexed owner, uint256 assets, uint256 shares);
    event Withdraw(address indexed sender, address indexed receiver, address indexed owner, uint256 assets, uint256 shares);
}
```

## Share Price Math

```
convertToShares(assets) = assets * totalSupply / totalAssets
convertToAssets(shares) = shares * totalAssets / totalSupply
```

When `totalSupply == 0` (first deposit), the vault uses an initial ratio (typically 1:1):

```solidity
function _convertToShares(uint256 assets, Math.Rounding rounding) internal view returns (uint256) {
    if (totalSupply() == 0) return assets;
    return assets.mulDiv(totalSupply(), totalAssets(), rounding);
}

function _convertToAssets(uint256 shares, Math.Rounding rounding) internal view returns (uint256) {
    if (totalSupply() == 0) return shares;
    return shares.mulDiv(totalAssets(), totalSupply(), rounding);
}
```

## Complete Solidity Implementation

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20, IERC4626} from "./interfaces/IERC4626.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

contract YieldVault is ERC20, IERC4626 {
    using SafeERC20 for IERC20;
    using Math for uint256;

    IERC20 private _asset;
    uint256 private _totalAssets;
    uint256 private _entryFeeBasis;     // e.g. 50 = 0.5%
    uint256 private _performanceFeeBasis;
    address private _feeRecipient;

    // Virtual shares offset — inflation attack mitigation
    uint256 private immutable _offset = 10**6;

    constructor(
        string memory name,
        string memory symbol,
        address asset_,
        address feeRecipient_
    ) ERC20(name, symbol) {
        _asset = IERC20(asset_);
        _feeRecipient = feeRecipient_;
        // Mint virtual shares to dead address
        _mint(address(0xdead), _offset);
    }

    function asset() public view returns (address) {
        return address(_asset);
    }

    function totalAssets() public view returns (uint256) {
        return _asset.balanceOf(address(this));
    }

    function convertToShares(uint256 assets) public view returns (uint256) {
        return _convertToShares(assets, Math.Rounding.Floor);
    }

    function convertToAssets(uint256 shares) public view returns (uint256) {
        return _convertToAssets(shares, Math.Rounding.Floor);
    }

    function _convertToShares(uint256 assets, Math.Rounding rounding) internal view returns (uint256) {
        uint256 supply = totalSupply() - _offset;
        if (supply == 0) return assets;
        return assets.mulDiv(supply, totalAssets(), rounding);
    }

    function _convertToAssets(uint256 shares, Math.Rounding rounding) internal view returns (uint256) {
        uint256 supply = totalSupply() - _offset;
        if (supply == 0) return shares;
        return shares.mulDiv(totalAssets(), supply, rounding);
    }

    function maxDeposit(address) public pure returns (uint256) {
        return type(uint256).max;
    }

    function maxMint(address) public pure returns (uint256) {
        return type(uint256).max;
    }

    function maxWithdraw(address owner) public view returns (uint256) {
        return _convertToAssets(balanceOf(owner), Math.Rounding.Floor);
    }

    function maxRedeem(address owner) public view returns (uint256) {
        return balanceOf(owner);
    }

    function previewDeposit(uint256 assets) public view returns (uint256) {
        return _convertToShares(assets, Math.Rounding.Floor);
    }

    function previewMint(uint256 shares) public view returns (uint256) {
        return _convertToAssets(shares, Math.Rounding.Ceil);
    }

    function previewWithdraw(uint256 assets) public view returns (uint256) {
        return _convertToShares(assets, Math.Rounding.Ceil);
    }

    function previewRedeem(uint256 shares) public view returns (uint256) {
        return _convertToAssets(shares, Math.Rounding.Floor);
    }

    function deposit(uint256 assets, address receiver) public returns (uint256 shares) {
        require(assets <= maxDeposit(receiver), "ERC4626: deposit exceeds max");
        shares = previewDeposit(assets);
        require(shares > 0, "ERC4626: zero shares");
        _asset.safeTransferFrom(msg.sender, address(this), assets);
        _mint(receiver, shares);
        emit Deposit(msg.sender, receiver, assets, shares);
    }

    function mint(uint256 shares, address receiver) public returns (uint256 assets) {
        require(shares <= maxMint(receiver), "ERC4626: mint exceeds max");
        assets = previewMint(shares);
        _asset.safeTransferFrom(msg.sender, address(this), assets);
        _mint(receiver, shares);
        emit Deposit(msg.sender, receiver, assets, shares);
    }

    function withdraw(uint256 assets, address receiver, address owner) public returns (uint256 shares) {
        require(assets <= maxWithdraw(owner), "ERC4626: withdraw exceeds max");
        shares = previewWithdraw(assets);
        _spendAllowance(owner, msg.sender, shares);
        _burn(owner, shares);
        _asset.safeTransfer(receiver, assets);
        emit Withdraw(msg.sender, receiver, owner, assets, shares);
    }

    function redeem(uint256 shares, address receiver, address owner) public returns (uint256 assets) {
        require(shares <= maxRedeem(owner), "ERC4626: redeem exceeds max");
        assets = previewRedeem(shares);
        _spendAllowance(owner, msg.sender, shares);
        _burn(owner, shares);
        _asset.safeTransfer(receiver, assets);
        emit Withdraw(msg.sender, receiver, owner, assets, shares);
    }
}
```

## Fee Mechanics

### Performance Fee

Charged on yield generated above a high-water mark. The fee is minted as shares to the fee recipient, diluting depositors proportionally.

```solidity
function _collectFees() internal {
    uint256 yield = _asset.balanceOf(address(this)) - _totalAssets;
    if (yield == 0) return;
    uint256 feeShares = convertToShares(yield * _performanceFeeBasis / 10000);
    _mint(_feeRecipient, feeShares);
    _totalAssets = _asset.balanceOf(address(this));
}
```

### Management Fee

Continuous fee based on total assets over time:
```
fee = totalAssets * managementFeeBasis * elapsed / (365.25 days * 10000)
```

### Entry/Exit Fees

Charged on deposit/withdraw as shares or assets withheld:

```solidity
function previewDeposit(uint256 assets) public view returns (uint256) {
    uint256 fee = assets * _entryFeeBasis / 10000;
    return _convertToShares(assets - fee, Math.Rounding.Floor);
}
```

## Attack Vectors

### Inflation Attack (First-Depositor Front-Run)

An attacker front-runs the first depositor with a minimal deposit + direct donation to manipulate the share price:

```
1. Attacker deposits 1 wei → receives 1 share (1:1)
2. Attacker donates 1000e18 asset → share price now 1000e18 / 1
3. Victim deposits 1000e18 → receives ~1 share
4. Attacker redeems → extracts victim's value
```

### Mitigation: Virtual Shares (Muon/Morpho Style)

Mint a fixed offset of shares to `address(0)` on construction. The supply denominator in `_convertToShares / _convertToAssets` excludes virtual shares, but the price calculation includes them, making first-deposit manipulation economically irrational.

```solidity
// In constructor:
_mint(address(0xdead), _offset);  // e.g. 10**6

// In conversions:
uint256 supply = totalSupply() - _offset;
```

Alternative: **Offset donation** — donate a small amount of asset to establish a floor price.

### Fee Rounding Attacks

Malicious vaults can set extreme fees or rounding in favor of the vault to extract value. Always verify `previewDeposit == deposit` return value off-chain.

### Reentrancy via Asset Callbacks

ERC-777 and ERC-4626 tokens can trigger callbacks on transfer. Use CEI pattern or reentrancy guard:

```solidity
function deposit(uint256 assets, address receiver) external nonReentrant returns (uint256 shares) {
    shares = previewDeposit(assets);
    _mint(receiver, shares);        // effects
    _asset.safeTransferFrom(...);   // interactions — only after state changes
}
```

## Integration Examples

### Yearn-Style Strategy Integration

```solidity
contract YearnVault is ERC4626 {
    address public strategy;

    function _harvest() internal {
        uint256 earned = IStrategy(strategy).harvest();
        if (earned > 0) {
            uint256 fee = earned * performanceFee / MAX_BPS;
            _asset.safeTransfer(treasury, fee);
        }
    }

    function totalAssets() public view override returns (uint256) {
        return super.totalAssets() + IStrategy(strategy).estimatedTotalAssets();
    }
}
```

### ERC-4626 Wrapper (Leverage)

```solidity
contract LeveragedVault is ERC4626 {
    IERC4626 public underlyingVault;
    ILendingPool public lendingPool;

    function totalAssets() public view override returns (uint256) {
        return underlyingVault.convertToAssets(balanceOfUnderlyingShares())
               - lendingPool.debt();
    }

    function deposit(uint256 assets, address receiver) public override returns (uint256) {
        // Deposit into underlying, borrow against position, re-deposit
    }
}
```

## References

- [EIP-4626](https://eips.ethereum.org/EIPS/eip-4626)
- [OpenZeppelin ERC4626](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC20/extensions/ERC4626.sol)
- [Solmate ERC4626](https://github.com/transmissions11/solmate/blob/main/src/tokens/ERC4626.sol)
- [Morpho Virtual Shares](https://github.com/morpho-org/morpho-blue)
