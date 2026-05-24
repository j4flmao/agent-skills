# Chaos Testing Reference

## Blockchain-Specific Chaos Types

| Layer | Fault | Impact | Simulation |
|-------|-------|--------|------------|
| **Network** | Latency injection | Delayed block propagation | `tc netem delay` |
| **Network** | Packet loss | Orphan blocks, fork divergence | `tc netem loss` |
| **Network** | Partition | Network split, chain fork | `iptables` drop |
| **Node** | Crash/kill | Missed proposals, downtime | `kill -9`, Chaos Mesh PodKill |
| **Node** | CPU exhaustion | Slow block processing | `stress --cpu` |
| **Node** | Disk I/O contention | Delayed state writes | `stress --io` |
| **Blockchain** | Reorg | Chain reorganization | Anvil mine + fork reset |
| **Blockchain** | Block delay | Missed slot | Pause validator client |
| **Slashing** | Double sign | Validator slashed | Duplicate validator keys |
| **Slashing** | Surround vote | Same penalty | Invalid attestation broadcast |
| **Cross-chain** | Relayer delay | Bridge tx stuck | Pause relayer service |
| **Cross-chain** | Gas spike (L1) | L2 sequencer stops | Raise L1 gas |

---

## Tooling

| Tool | Domain | Deployment |
|------|--------|------------|
| **Chaos Mesh** | K8s pod/network chaos | K8s CRDs |
| **Litmus** | K8s chaos engineering | K8s native |
| **Gremlin** | Network + host chaos | SaaS + agents |
| **tc** | Network faults | Linux kernel |
| **stress-ng** | Resource exhaustion | Linux hosts |

---

## K8s Chaos Mesh Experiments

### Pod Kill

```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: beacon-node-kill
  namespace: blockchain
spec:
  action: pod-kill
  mode: one
  selector:
    namespaces: ["blockchain"]
    labelSelectors:
      app: beacon-node
  duration: "60s"
  scheduler:
    cron: "@every 5m"
```

### Network Partition

```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: validator-network-partition
  namespace: blockchain
spec:
  action: partition
  mode: all
  selector:
    namespaces: ["blockchain"]
    labelSelectors:
      app: validator
  target:
    mode: all
    selector:
      namespaces: ["blockchain"]
      labelSelectors:
        app: validator
  duration: "120s"
```

```bash
kubectl apply -f pod-kill-experiment.yaml
kubectl get pods -n blockchain -w
kubectl delete chaos experiment --all -n blockchain
```

---

## Network Faults (Linux CLI)

```bash
# Latency (500ms on port 8545)
tc qdisc add dev eth0 root netem delay 500ms 100ms
# Packet loss (10%)
tc qdisc add dev eth0 root netem loss 10%
# Partition
iptables -A INPUT -s <validator-ip-range> -j DROP
# Cleanup
tc qdisc del dev eth0 root netem

# Resource exhaustion
stress-ng --cpu 4 --cpu-load 80 --timeout 120s
stress-ng --vm 2 --vm-bytes 4G --timeout 60s
```

---

## Blockchain-Layer Chaos

### Reorg Simulation

```typescript
async function simulateReorg() {
  const blockBefore = await ethers.provider.getBlockNumber();
  for (let i = 0; i < 5; i++) await ethers.provider.send("evm_mine");
  const snapshot = await ethers.provider.send("evm_snapshot", []);
  for (let i = 0; i < 3; i++) await ethers.provider.send("evm_mine");
  await ethers.provider.send("evm_revert", [snapshot]);
  assert((await ethers.provider.getBlockNumber()) === blockBefore + 5);
}
```

### Slashing Condition Test

```solidity
contract SlashingConditionTest is Test {
    function testDoubleSignSlashing() public {
        deal(validator, 32 ether);
        depositManager.deposit{value: 32 ether}(validator);

        vm.prank(validator);
        blockProposer.proposeBlock(100, 1000);

        vm.warp(block.timestamp + 12);
        vm.expectEmit();
        emit Slashing(validator, "double_signing");
        vm.prank(validator);
        blockProposer.proposeBlock(101, 1000); // same slot, diff block

        (uint256 balance, bool slashed) = beaconChain.getValidator(validator);
        assertTrue(slashed);
        assertLt(balance, 32 ether);
    }

    function testSurroundVoteSlashing() public {
        vm.startPrank(validator);
        attestationHandler.submitAttestation(10, 20);
        vm.expectEmit();
        emit Slashing(validator, "surround_vote");
        attestationHandler.submitAttestation(5, 25); // surrounds [10,20]
        vm.stopPrank();
    }
}
```

---

## Test Scenarios

### Scenario 1: Validator Offline

```typescript
const { beaconNode, validators } = await setupCluster(4);
await validators[2].stop();
await sleep(12000);
const slots = await beaconNode.getSlots(100, 110);
expect(slots.find(s => s.proposer === 2 && s.block === null)).toBeDefined();
await validators[2].start();
```

### Scenario 2: 33% Validator Partition

```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
spec:
  action: partition
  mode: fixed-percent
  value: "33"
  selector:
    namespaces: ["blockchain"]
    labelSelectors:
      app: validator
  duration: "300s"
```

Expected: chain continues finalizing (±1 epoch), no persistent fork.

### Scenario 3: Oracle Price Feed Stall

```solidity
function testOracleStall() public {
    vm.createSelectFork(MAINNET_RPC, 19_500_000);
    vm.warp(block.timestamp + 4 hours); // > 3h stale
    vm.expectRevert("Price stale");
    protocol.doPriceSensitiveAction();
}
```

---

## Validator Resilience

### MEV-Boost Failover

```yaml
services:
  mev-boost-primary:
    image: flashbots/mev-boost:latest
    command: ["-goerli", "-relays=${RELAY_PRIMARY}"]
  mev-boost-fallback:
    image: flashbots/mev-boost:latest
    command: ["-goerli", "-relays=${RELAY_FALLBACK}"]
    profiles: ["fallback"]
```

### Sentry Node Architecture

```yaml
networks:
  sentry-net:
    driver: bridge
  validator-net:
    driver: bridge
    internal: true
services:
  sentry-1:
    image: geth:latest
    networks: [sentry-net, validator-net]
    ports: ["30303:30303"]
  validator:
    image: lighthouse:latest
    networks: [validator-net]
```

---

## Chaos Testing Checklist

| # | Test | Expected Outcome | Metric |
|---|------|-----------------|--------|
| 1 | Node crash + restart | Syncs, ≤2 missed proposals | Attestation ≥ 95% |
| 2 | 33% partition | No persistent fork | Finalization ≤ 2 epochs |
| 3 | Latency 500ms | Delayed block propagation | Block delay ≤ 4s |
| 4 | CPU 80% | Some missed attestations | Effectiveness ≥ 90% |
| 5 | Reorg (2 blocks) | Resolves to heaviest chain | Depth confirmed |
| 6 | MEV-Boost failure | Fallback relay activates | Response < 1s |
| 7 | Disk I/O stall | Graceful degradation | Recovery ≤ 5 min |
| 8 | Oracle stall | Circuit breaker triggers | No liquidations |
| 9 | Cross-chain delay | Tx queued, consistent | Queue clears ≤ 1h |
| 10 | Double sign | Immediate slashing | Detected ≤ 1 epoch |
