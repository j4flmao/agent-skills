# Token Standards Integration: ERC-20, ERC-721, ERC-1155, Permits and ENS

Client-side handling of tokens and names: decimals and amount math, allowance flows (approve, EIP-2612 permit, Permit2), non-standard ERC-20 behaviour, NFT metadata resolution, and ENS lookups with viem.

## ERC-20

### Amounts
```ts
import { formatUnits, parseUnits, erc20Abi } from 'viem'

const [decimals, symbol] = await Promise.all([
  publicClient.readContract({ address: token, abi: erc20Abi, functionName: 'decimals' }),
  publicClient.readContract({ address: token, abi: erc20Abi, functionName: 'symbol' }),
])

const raw = parseUnits('12.5', decimals)       // user input → base units (bigint)
const display = formatUnits(raw, decimals)     // base units → string
```

- Always `bigint` for on-chain amounts. Never `Number` or floating point.
- Do not assume 18 decimals (USDC/USDT use 6 on Ethereum; WBTC uses 8).
- Read `decimals` from the contract or a reviewed token list; cache per chain.

### Non-standard tokens
| Behaviour | Example | Handling |
|-----------|---------|----------|
| No return value on `transfer`/`approve` | USDT on Ethereum | On-chain: use OpenZeppelin `SafeERC20`; off-chain viem handles via receipt status |
| Must set allowance to 0 before changing | USDT | Detect non-zero allowance; approve 0 first, or use `forceApprove` in contracts |
| Fee-on-transfer | Some tokens | Measure balance before/after instead of trusting `amount` |
| Rebasing | stETH | Balances change without transfers; use wrapped versions (wstETH) for accounting |
| Blocklists / pausable | USDC, USDT | Transfers can revert for listed addresses |
| `symbol`/`name` as `bytes32` | MKR (legacy) | Fallback decode |

### Allowance flows

| Flow | Transactions | Notes |
|------|--------------|-------|
| `approve` + action | 2 (or 1 if allowance already sufficient) | Universal |
| EIP-2612 `permit` signature + action | 1 | Only tokens implementing `permit` |
| Permit2 (Uniswap, `0x000000000022D473030F116dDEE9F6B43aC78BA3`) | one-time `approve(Permit2)`, then signatures | Works for any ERC-20; expiries and per-spender amounts |
| Batched via EIP-5792 `sendCalls` | 1 wallet confirmation | If wallet supports atomic batching |

Check allowance before prompting:

```ts
const allowance = await publicClient.readContract({
  address: token, abi: erc20Abi, functionName: 'allowance', args: [owner, spender],
})
if (allowance < amount) {
  const { request } = await publicClient.simulateContract({
    account: owner, address: token, abi: erc20Abi, functionName: 'approve', args: [spender, amount],
  })
  await publicClient.waitForTransactionReceipt({ hash: await walletClient.writeContract(request) })
}
```

### EIP-2612 permit
```ts
const nonce = await publicClient.readContract({ address: token, abi: permitAbi, functionName: 'nonces', args: [owner] })
const signature = await walletClient.signTypedData({
  account: owner,
  domain: { name: tokenName, version: tokenVersion, chainId, verifyingContract: token },
  types: {
    Permit: [
      { name: 'owner', type: 'address' }, { name: 'spender', type: 'address' },
      { name: 'value', type: 'uint256' }, { name: 'nonce', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
    ],
  },
  primaryType: 'Permit',
  message: { owner, spender, value: amount, nonce, deadline },
})
```

Read the domain from the token (`eip712Domain()` per EIP-5267 when implemented); many tokens use version `"1"` but not all (USDC uses `"2"`).

## ERC-721 and ERC-1155

| Aspect | ERC-721 | ERC-1155 |
|--------|---------|----------|
| Ownership | `ownerOf(id)` | `balanceOf(owner, id)` (fungible per id) |
| Batch | No standard batch | `safeBatchTransferFrom`, `balanceOfBatch` |
| Metadata | `tokenURI(id)` | `uri(id)` with `{id}` substitution (64 hex chars, lowercase, zero-padded) |
| Approval | `approve(id)` / `setApprovalForAll` | `setApprovalForAll` only |
| Interface detection | ERC-165 `0x80ac58cd` | ERC-165 `0xd9b67a26` |

### Metadata resolution
```ts
const IPFS_GATEWAY = process.env.NEXT_PUBLIC_IPFS_GATEWAY ?? 'https://ipfs.io'

function resolveUri(uri: string, id?: bigint): string {
  let u = uri
  if (id !== undefined) u = u.replace('{id}', id.toString(16).padStart(64, '0'))
  if (u.startsWith('ipfs://')) return `${IPFS_GATEWAY}/ipfs/${u.slice(7)}`
  if (u.startsWith('ar://')) return `https://arweave.net/${u.slice(5)}`
  return u                                  // https:// or data:application/json;base64,...
}
```

Safety when rendering metadata:
- Treat metadata as untrusted: sanitize HTML in descriptions, do not render SVG inline (scripts); use `<img>` or a sanitizing proxy.
- Enforce timeouts and size limits on metadata fetches.
- Use your own or a trusted IPFS gateway; gateways can be slow or censor.
- `data:` URIs are common for on-chain metadata; parse them without `eval`.

## ENS

```ts
import { normalize } from 'viem/ens'

const address = await publicClient.getEnsAddress({ name: normalize('vitalik.eth') })
const name = await publicClient.getEnsName({ address })                 // reverse record
const avatar = name ? await publicClient.getEnsAvatar({ name: normalize(name) }) : null
const twitter = await publicClient.getEnsText({ name: normalize('vitalik.eth'), key: 'com.twitter' })
```

- Always `normalize()` (ENSIP-15) user-entered names before lookup; it rejects confusable or invalid input.
- Reverse records are claims by the address owner: verify forward resolution matches (`getEnsAddress(getEnsName(addr)) === addr`) before displaying a name as identity.
- ENS resolution runs on Ethereum mainnet (L2 primary names use additional resolution rules); use a mainnet client for lookups even when the dApp transacts on an L2.
- Show both name and truncated address in confirmations; send to the resolved address captured at confirmation time.

## Token Lists and Spam

- Use reviewed token lists (Uniswap token list format) per chain for symbols, decimals and logos.
- Hide airdropped spam tokens/NFTs by default; never show "claim" links from token names or metadata.
- Do not trust `symbol()`: anyone can deploy a token named "USDC". Identify assets by `(chainId, address)`.

## Checklist

- [ ] Amounts handled as bigint with on-chain decimals
- [ ] Allowance checked before approve; exact amounts; USDT zero-first handled
- [ ] Permit domain read from token; Permit2 used for generic signature approvals
- [ ] NFT metadata fetched with timeouts and rendered safely
- [ ] ENS names normalized, forward-verified, resolved on mainnet
- [ ] Assets identified by chain + address, not symbol
