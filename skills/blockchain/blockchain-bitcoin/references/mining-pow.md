# Mining & Proof of Work

## SHA-256d

Bitcoin's PoW uses **double SHA-256**:

```
SHA-256d(x) = SHA-256(SHA-256(x))

Block hash = SHA-256d(block_header_80_bytes)
```

Double-hashing protects against length-extension attacks on SHA-256.

## Block Header Structure (80 bytes)

```
Offset  Size  Field         Description
------  ----  -----         -----------
 0       4    version       Block version (currently 4 = 0x20000000)
 4      32    prev_block    Previous block hash (little-endian)
36      32    merkle_root   Merkle root of tx tree (little-endian)
68       4    timestamp     Unix epoch seconds
72       4    bits          Difficulty target (compact encoding)
76       4    nonce         32-bit counter

Total:   80 bytes
```

### Example Block Header (Hex)

```
Block #800,000 (mainnet):

Version:      20400000  (4 bytes, little-endian → 0x00000020 = version 4, mining)
Prev block:   000000000000000000029b0f2d347e723f3c1fe0370d1282c0e7d8ec22e819ac
Merkle root:  5291d23a531847e413d51138010e0dfa77b7534d82e26b58726ad08523b8c01e
Timestamp:    64f1b3f8  (little-endian = 1693616120 = 2023-09-02)
Bits:         17030c81  (compact target encoding)
Nonce:        d1b31a00  (little-endian = 0x001ab3d1 = 1,752,017)

Full 80 bytes:
20400000 000000000000000000029b0f2d347e723f3c1fe0370d1282c0e7d8ec22e819ac
5291d23a531847e413d51138010e0dfa77b7534d82e26b58726ad08523b8c01e
64f1b3f8 17030c81 d1b31a00
```

## Difficulty & Target

### Target

```
block_hash ≤ max_target / difficulty

max_target = 0x00000000FFFF0000000000000000000000000000000000000000000000000000
            (genesis difficulty 1 target)
```

The `bits` field uses compact encoding:
```
bits = 0x1c0ffff0  →  exponent = 0x1c, mantissa = 0x0ffff0
target = mantissa × 2^(8 × (exponent - 3))
       = 0x0ffff0 × 2^(8 × 0x19)
       = 0x00000000000FFFF0000000000000000000000000000000000000000000000000
```

### Difficulty Adjustment Algorithm

Adjustment every 2016 blocks (~2 weeks):

```cpp
// In chainparams.cpp / pow.cpp
uint32_t CalculateNextWorkRequired(const CBlockIndex* pindexLast,
                                   int64_t nFirstBlockTime,
                                   const Consensus::Params& params)
{
    if (params.fPowAllowMinDifficultyBlocks) return uint32_t(0x1d00ffff);

    int64_t nActualTimespan = pindexLast->GetBlockTime() - nFirstBlockTime;
    int64_t nTargetTimespan = params.nPowTargetTimespan; // 2 weeks = 1209600 sec

    // Clamp adjustment range: [0.5 × target, 2 × target] (BIP-94 tightens)
    nActualTimespan = std::max(nActualTimespan, nTargetTimespan / 4);
    nActualTimespan = std::min(nActualTimespan, nTargetTimespan * 4);

    // Retarget
    arith_uint256 bnNew;
    bnNew.SetCompact(pindexLast->nBits);
    bnNew *= nActualTimespan;
    bnNew /= nTargetTimespan;

    return bnNew.GetCompact();
}
```

Adjustment bounds: max 4× increase or decrease (BIP-94: max 2× for testnet).
Next retarget height = `floor(current_height / 2016) * 2016 + 2016`.

## ASIC Evolution

| Era | Hardware | Hashrate | Power | Efficiency | Year |
|-----|----------|----------|-------|------------|------|
| CPU | Intel Core i7 | ~10 MH/s | 95 W | ~9.5 MH/J | 2009 |
| GPU | ATI HD 5870 | ~400 MH/s | 188 W | ~2.1 MH/J | 2010 |
| FPGA | Xilinx Spartan-6 | ~800 MH/s | 20 W | ~40 MH/J | 2011 |
| ASIC | Bitmain Antminer S9 | ~14 TH/s | 1372 W | ~0.098 J/GH | 2016 |
| ASIC | Bitmain Antminer S19 Pro | ~110 TH/s | 3250 W | ~0.030 J/GH | 2020 |
| ASIC | Bitmain Antminer S21 | ~200 TH/s | 3500 W | ~0.018 J/GH | 2023 |
| ASIC | MicroBT Whatsminer M60S | ~190 TH/s | 3344 W | ~0.018 J/GH | 2023 |
| ASIC | Bitmain Antminer S21 XP | ~270 TH/s | 3780 W | ~0.014 J/GH | 2024 |

Modern ASICs use **7nm** and **5nm** process nodes. All have built-in SHA-256d engines — they cannot mine other algorithms.

## Mining Pools

### Pool Architectures

```
Pool Server (stratum hub)
  ├── Job Manager         (constructs block templates)
  ├── Share Validation    (checks partial PoW)
  └── Payout Engine       (calculates rewards)

Stratum:
  Miners connect via TCP. Pool sends jobs, miners submit shares.

  Job: { job_id, prevhash, coinbase1, coinbase2, merkle_branch, version, nbits, ntime }
  Submit: { user_id, job_id, nonce, ntime, nonce2 }
```

### Reward Distribution Models

| Model | Description | Risk | Typical Slice |
|-------|-------------|------|--------------|
| PPS | Pay-Per-Share: fixed payout per valid share | Pool bears variance risk | +5-10% fee |
| FPPS | Full-Pay-Per-Share: PPS + tx fee pool | Pool bears tx fee variance | +2-4% fee |
| PPLNS | Pay-Per-Last-N-Shares: proportional to recent shares | Miner bears variance risk | +0-2% fee |
| Solo | No pool — full block reward if found | Extremely high variance | 0% |

### Stratum Protocol (v1)

```
Miner → Pool:  {"id":1,"method":"mining.subscribe","params":["BMiner/1.0"]}
Pool → Miner:  {"id":1,"result":[["mining.set_difficulty","ae1..."],["mining.notify","ae1..."]],"extranonce1":"01000000","extranonce2_size":4}
Pool → Miner:  {"method":"mining.set_difficulty","params":[8192]}
Pool → Miner:  {"method":"mining.notify","params":["bf4...","00000000000000000000...","0100000000000000...","ffff",true,"10000000","17030c81","64f1b3f8",true]}
Miner → Pool:  {"id":2,"method":"mining.submit","params":["miner1","bf4...","00000000","64f1b400","05f0c8e1"]}
```

### Stratum V2 (2022)

Key improvements over v1:
- **Job Negotiation**: miners can propose their own block templates (reduce centralization)
- **Encrypted communication**: optional AEAD encryption between miner and pool
- **Standardized protocol**: binary encoding (not JSON), reduces bandwidth
- **Channel binding**: miner can choose which transactions go into their block
- Sub-protocols: `mining-protocol`, `job-negotiation-protocol`, `template-distribution-protocol`

### Block Template Construction

```
1. Fetch best block tip from local node (or template provider)
2. Select transactions from mempool:
   - Sort by ancestor score (fee/vsize)
   - Pack until block weight ≈ 4,000,000 WU (4 MW)
   - Skip txs with missing ancestors
3. Construct coinbase transaction:
   - Input: { prevout: null (coinbase), scriptSig: height + extranonce + extra }
   - Outputs: block_reward→pool_address + (optional) fees→pool_address
4. Compute merkle root:
   merkle_root = BuildMerkleTree([coinbase_tx, tx1, tx2, ..., txN])
5. Set block header:
   - nVersion = current (0x20000004 for version 4 with signaling)
   - nBits = current network difficulty
   - nNonce = 0 (miner increments and hashes)
```

### Coinbase Transaction Details

```
Coinbase input scriptSig:
  <block_height> (varint, required by BIP-34)
  <extranonce>   (pool-specific extra nonce for hashrate tracking)
  <extra_data>   (ASCII: pool name, version, etc.)

Coinbase maturity: 100 blocks before outputs can be spent
```

### Extranonce

- Extranonce1: assigned by pool at connect (4 bytes, per-connection unique)
- Extranonce2: miner chooses (4 bytes, per-share unique)
- Combined: miner modifies nTime + nNonce + extranonce2 to generate unique block headers
- Total unique combinations ≈ 2^96 (nNonce: 2^32 × nTime: 2^8 × extranonce2: 2^32 × extranonce1: 2^32)

## Hashrate Estimation

### From Block Intervals

```
hashrate = difficulty × 2^256 / max_target / block_interval_average

Given: difficulty = current_target / max_target
       expected interval = 600 seconds

Example at difficulty = 80 trillion (8 × 10^13):
  expected hashes per block = 8e13 × 2^48 ≈ 2.25 × 10^21 hashes
  hashrate = 2.25e21 / 600 ≈ 3.75 × 10^18 H/s = 375 EH/s
```

### Network Estimates

- Mainnet (2025): ~500–700 EH/s (exahashes per second)
- Peak ever: ~700+ EH/s in early 2025
- Block time variance: Exponential distribution (Poisson process)
- Standard deviation of block interval: ~600 seconds (same as mean)

## Mining Economics

```
Block reward = subsidy + fees

Subsidy halving every 210,000 blocks (~4 years):
  Era 1 (2009): 50 BTC
  Era 2 (2012): 25 BTC
  Era 3 (2016): 12.5 BTC
  Era 4 (2020): 6.25 BTC
  Era 5 (2024): 3.125 BTC (current)
  Era 6 (2028): 1.5625 BTC (next)

Total supply: 21,000,000 BTC (approx 21 million)
Last block: ~2140 (block 6,930,000)

Miner profitability per TH/s:
  revenue_THs = (block_reward + fees) × hashrate_share × BTC_price
  cost_THs    = power_THs × electricity_price

Breakeven conditions:
  BTC_price × (block_reward + fees) × (TH_s / network_HR) ≥ power_W × kWh_price × block_time

ASIC efficiency threshold (2025): ~$0.04–0.08/kWh for profitability
```
