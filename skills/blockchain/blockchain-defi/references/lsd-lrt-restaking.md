# Liquid Staking & Restaking

## Liquid Staking Derivatives (LSDs)

### stETH (Lido)

Lido's stETH is the dominant liquid staking token. Users deposit ETH and receive stETH which accrues staking rewards through a rebasing mechanism.

```solidity
// Simplified Lido staking pool
contract LidoStakingPool {
    uint256 public totalShares;     // Total stETH shares
    uint256 public totalPooledEther; // Total ETH under management

    function submit(address referral) external payable returns (uint256 shares) {
        // Convert ETH -> stETH shares at current rate
        shares = (msg.value * totalShares) / totalPooledEther;
        _mintShares(msg.sender, shares);

        // Deposit to Ethereum consensus layer
        IDepositContract(DEPOSIT_CONTRACT).deposit{value: msg.value}(
            pubkey, withdrawalCredentials, signature, depositDataRoot
        );
    }

    function getShareValue() public view returns (uint256) {
        return (totalPooledEther * 1e18) / totalShares;
    }

    function withdraw(uint256 shares) external {
        // ETH distribution may be delayed due to withdrawal queue
        uint256 ethAmount = (shares * totalPooledEther) / totalShares;
        _burnShares(msg.sender, shares);
        _sendETH(msg.sender, ethAmount);
    }

    function handleStakingRewards() external payable {
        // Called by oracle when consensus layer rewards are distributed
        totalPooledEther += msg.value;
    }
}
```

### rETH (Rocket Pool)

Rocket Pool is a decentralized staking protocol where node operators deposit 8 ETH (minipool) and the protocol matches with 24 ETH from rETH holders.

```solidity
// Rocket Pool minipool creation
function createMinipool(address nodeOperator) external payable {
    require(msg.value == 8 ether, "Minipool requires 8 ETH bond");

    // Create a beacon chain deposit for 32 ETH
    uint256 protocolDeposit = 24 ether;
    totalPooledEther += msg.value + protocolDeposit;

    IDepositContract(DEPOSIT_CONTRACT).deposit{value: 32 ether}(
        pubkey, withdrawalCredentials, signature, depositDataRoot
    );

    // Node operator gets commission on staking rewards
    uint256 commissionRate = 14; // 14% commission for NO
    minipools[msg.sender] = Minipool({
        nodeDeposit: 8 ether,
        protocolDeposit: 24 ether,
        commissionRate: commissionRate,
        active: true
    });
}
```

### mSOL (Marinade)

Marinade is a liquid staking protocol on Solana. It uses a stake pool with multiple validators for diversification.

## Staking Pool Mechanics

### Validation and MEV Rewards

```solidity
// MEV reward distribution
function handleMEVRewards(bytes calldata mevData) external onlyOracle {
    uint256 mevRewards = address(this).balance;
    uint256 totalFee = (mevRewards * feePercent) / 100;

    // Protocol fee
    treasury.transfer(totalFee);

    // Distribute remaining to stakers through share price appreciation
    totalPooledEther += mevRewards - totalFee;
}
```

### SLASH Insurance

Staking pools maintain insurance funds to cover slash events:

```solidity
contract SlashInsurance {
    uint256 public insuranceFund;
    uint256 public MAX_SLASH_PENALTY = 1 ether; // ~1 ETH max slash

    function coverSlash(uint256 lossAmount) external returns (bool) {
        uint256 coverage = min(lossAmount, insuranceFund);
        insuranceFund -= coverage;
        return coverage == lossAmount;
    }

    function depositInsurance() external payable {
        insuranceFund += msg.value;
    }
}
```

## EigenLayer Restaking

EigenLayer extends Ethereum staking security to additional protocols (AVSs — Actively Validated Services). Stakers opt into additional slashing conditions.

### Operator Sets & AVS

```
Staker ──> Delegates ETH to ──> Operator
                                  │
                                  ├── AVS 1 (e.g. Data Availability Oracle)
                                  ├── AVS 2 (e.g. Bridge Validator)
                                  └── AVS 3 (e.g. Shared Sequencer)

Operator Opt-In: signs new slashing conditions per AVS
Staker Opt-In: delegates to operator, accepts AVS risk
```

### Slashing Conditions

```solidity
// EigenLayer-style slashing
contract EigenSlashManager {
    struct SlashRequest {
        address operator;
        address avs;
        uint256 amount;          // % of stake to slash (e.g. 5% = 0.05e18)
        bytes proof;             // Fraud proof or misbehavior evidence
    }

    function slash(SlashRequest memory request) external returns (uint256) {
        // Verify the fraud proof
        require(verifyFraudProof(request.operator, request.avs, request.proof), "Invalid proof");

        // Calculate slash amount from operator's delegated stake
        uint256 delegatedStake = delegateManager.getDelegatedStake(request.operator);
        uint256 slashAmount = (delegatedStake * request.amount) / 1e18;

        // Transfer slashed amount to AVS
        _transferToAVS(request.avs, slashAmount);

        // Burn a portion to simulate consensus penalty
        _burnPenalty(slashAmount / 2);

        emit Slashed(request.operator, request.avs, slashAmount);
        return slashAmount;
    }
}
```

### Shared Security Model

```
EigenLayer Security:
  Total Staked: ~$15B (example)
  AVS Security = min(Stake Assigned, Sum of All Staker Stakes)

  Capital Efficiency: One stake secures multiple protocols
  Risk: Restaked ETH faces multiple slashing conditions → higher risk
```

## Liquid Restaking Tokens (LRTs)

### eETH / weETH (EtherFi)

EtherFi combines liquid staking with EigenLayer restaking in a single product:

```solidity
contract EtherFiLRT {
    uint256 public totalETHStaked;

    function deposit() external payable {
        // ETH is split between:
        // 1. Direct staking (Lido / Rocket Pool) — earning consensus rewards
        // 2. EigenLayer restaking — earning AVS rewards

        uint256 stakingPortion = (msg.value * 60) / 100;   // 60% direct stake
        uint256 restakingPortion = msg.value - stakingPortion;

        // Stake directly
        lido.submit{value: stakingPortion}(address(this));

        // Deposit into EigenLayer
        eigenLayer.deposit{value: restakingPortion}();

        _mint(msg.sender, msg.value); // Mint eETH
        totalETHStaked += msg.value;
    }

    function getYieldComponents() public view returns (uint256 consensusYield, uint256 avsYield) {
        consensusYield = lido.getShareValue() - 1e18; // Accumulated consensus rewards
        avsYield = eigenLayer.getAVSRewards(address(this)); // AVS rewards
    }
}
```

## Yield Comparison Across LSDs

| Protocol | Type | Reward Source | Risk Factor | Liquidity | Fee |
|---|---|---|---|---|---|
| Lido (stETH) | LSD | Consensus + MEV | Staking slashing | Very high (Curve) | 10% |
| Rocket Pool (rETH) | LSD | Consensus + NO commission | Staking slashing + NO risk | High | 14% |
| Marinade (mSOL) | LSD (Solana) | Consensus + MEV (Solana) | Staking + Solana risk | High | 6-8% |
| EigenLayer | Restaking | AVS rewards | Multiple slashing conditions | Medium | 10% |
| EtherFi (eETH) | LRT | Consensus + AVS | Staking + restaking risks | High | 5-10% |

## Cross-References

- **AMM pools for LSD trading** → `blockchain-defi/references/amm-mechanics.md`
- **LSDs as lending collateral** → `blockchain-defi/references/lending-borrowing.md`
- **Yield optimization for LSD/LRT positions** → `blockchain-defi/references/yield-strategies.md`
