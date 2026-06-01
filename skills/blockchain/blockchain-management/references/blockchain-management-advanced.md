# Blockchain Management Advanced Topics

## Tokenomics Engineering

### Supply Model Design
- **Fixed supply with halving**: Bitcoin model. Predictable scarcity. No inflation to fund development.
- **Inflationary with decay**: 5-15% initial inflation, exponential decay over 5-10 years. Funds security budget.
- **Rebase/algorithmic**: Dynamic supply targeting stable price. High risk (Terra collapse).
- **Fee burn**: Deflationary pressure from protocol fees (Ethereum EIP-1559).

### Emission Schedule
- **Halving curve**: Reward halves at fixed intervals (Bitcoin: 210K blocks)
- **Exponential decay**: Continuous decay function (Cosmos: 1/3 reduction per year)
- **Linear emission**: Fixed per-block reward until cap reached
- **S-curve**: Slow start → rapid growth → plateau

### Distribution Design
| Allocation | Typical % | Vesting |
|---|---|---|
| Team | 15-25% | 1y cliff, 3-4y linear |
| Investors | 15-25% | 1y cliff, 2-3y linear |
| Treasury | 20-40% | Released over 4+ years |
| Community rewards | 30-50% | Continuous via emissions |
| Airdrop | 5-10% | Immediate or cliffed |

## Treasury Management

### Diversification Strategy
- Year 0: 100% in protocol token (initial state)
- Year 1: 50% protocol token, 30% ETH/stablecoins, 20% diversified
- Year 2+: <30% protocol token, 40% stablecoins, 30% diversified (ETH, BTC, real estate, bonds)

### Vesting Contract Implementation
Tokens are locked in an escrow contract with: cliff period, linear vesting schedule, emergency cancel (gov vote), beneficiary address. Team and investor tokens must be contract-enforced, not legally promised.

## Governance Attack Vectors

### Flash Loan Governance
Attacker borrows governance tokens via flash loan, votes, returns tokens. Mitigation: snapshot voting power at proposal block (getPastVotes), not current balance.

### Proposal Spam
Attacker submits many low-quality proposals to waste governance attention. Mitigation: proposer bond (100-10,000 tokens), bond returned only if proposal passes certain threshold.

### Timelock Bypass
If governor can modify its own timelock address or delay, a malicious proposal can set timelock to zero. Mitigation: make timelock delay immutable or require supermajority to change.
