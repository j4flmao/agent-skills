# Hardhat Testing Reference

## Project Init

```bash
npx hardhat init
npm install --save-dev @nomicfoundation/hardhat-toolbox
```

## Task System

```typescript
import { task } from "hardhat/config";

task("balance", "Prints an account balance")
  .addParam("account", "The account address")
  .setAction(async (taskArgs, hre) => {
    const balance = await hre.ethers.provider.getBalance(taskArgs.account);
    console.log(hre.ethers.formatEther(balance), "ETH");
  });
```

```bash
npx hardhat balance --account 0x...
```

## Network Configuration

```typescript
const config: HardhatUserConfig = {
  solidity: { version: "0.8.24", settings: { optimizer: { enabled: true, runs: 200 } } },
  networks: {
    hardhat: { chainId: 31337, blockGasLimit: 30_000_000 },
    sepolia: { url: `https://sepolia.infura.io/v3/${process.env.INFURA_KEY}`, accounts: [process.env.PRIVATE_KEY!] },
  },
  etherscan: { apiKey: process.env.ETHERSCAN_API_KEY },
};
```

## Chai Matchers

```typescript
import { expect } from "chai";

// Standard
expect(await token.balanceOf(alice)).to.equal(ethers.parseEther("100"));

// Revert
await expect(vault.connect(bob).deposit(0, bob.address)).to.be.revertedWith("ZeroDeposit");

// Events
await expect(tx).to.emit(token, "Transfer").withArgs(deployer, alice, amount);

// Balance change
await expect(() => vault.deposit(ethers.parseEther("10"), alice))
  .to.changeTokenBalance(token, vault, ethers.parseEther("10"));
```

## Test Patterns

```typescript
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("Vault", function () {
  async function deployFixture() {
    const [owner, alice] = await ethers.getSigners();
    const vault = await ethers.deployContract("Vault");
    return { vault, owner, alice };
  }

  beforeEach(async function () {
    Object.assign(this, await loadFixture(deployFixture));
  });

  it("should deposit", async function () {
    const { vault, alice } = this;
    await expect(vault.connect(alice).deposit(ethers.parseEther("1"), alice.address))
      .to.emit(vault, "Deposit");
    expect(await vault.balanceOf(alice.address)).to.equal(ethers.parseEther("1"));
  });
});
```

## Console.log Debugging

```solidity
import "hardhat/console.sol";

function swap(uint256 amountIn) external {
    console.log("swap called with amount:", amountIn);
    console.log("msg.sender:", msg.sender);
    uint256 amountOut = getAmountOut(amountIn);
    console.log("amountOut:", amountOut);
}
```

```bash
npx hardhat test --logs
```

## Hardhat Network — Forking

```typescript
// hardhat.config.ts
networks: {
  hardhat: {
    forking: {
      url: `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`,
      blockNumber: 19_500_000,
      enabled: true,
    },
  },
}
```

```typescript
// Programmatic fork
import { takeSnapshot, time, setBalance, impersonateAccount } from
  "@nomicfoundation/hardhat-toolbox/network-helpers";

it("should impersonate a whale", async function () {
  await impersonateAccount(WHALE);
  await setBalance(WHALE, ethers.parseEther("100"));
  const signer = await ethers.getSigner(WHALE);
  const dai = await ethers.getContractAt("IERC20", DAI);
  await dai.connect(signer).transfer(alice, ethers.parseEther("10000"));
});
```

### Mining Modes

```typescript
await ethers.provider.send("evm_setAutomine", [true]);           // auto
await ethers.provider.send("evm_setIntervalMining", [5000]);     // every 5s
await ethers.provider.send("evm_setAutomine", [false]);          // manual
await ethers.provider.send("evm_mine", [{ timestamp: 1700000000 }]);
```

### State Modification

```typescript
// Set storage
await ethers.provider.send("hardhat_setStorageAt", [contract, "0x0", paddedValue]);
// Set code (deploy arbitrary bytecode)
await ethers.provider.send("hardhat_setCode", [address, "0x608060..."]);
```

## ERC-4626 Vault Test

```typescript
describe("ERC-4626", function () {
  async function deploy4626() {
    const [_, alice] = await ethers.getSigners();
    const asset = await ethers.deployContract("MockERC20", "Ast", "AST", 18);
    const vault = await ethers.deployContract("YieldVault", asset.target);
    await asset.mint(alice.address, ethers.parseEther("10000"));
    await asset.connect(alice).approve(vault.target, ethers.parseEther("10000"));
    return { vault, asset, alice };
  }

  it("share price >= 1:1 after deposits", async function () {
    const { vault, asset, alice } = await loadFixture(deploy4626);
    await vault.connect(alice).deposit(ethers.parseEther("500"), alice.address);
    expect(await vault.convertToAssets(await vault.balanceOf(alice.address)))
      .to.be.gte(ethers.parseEther("500"));
  });

  it("handles multi-cycle deposit+withdraw", async function () {
    const { vault, asset, alice } = await loadFixture(deploy4626);
    for (const amt of [100, 200, 50, 300]) {
      await vault.connect(alice).deposit(ethers.parseEther(String(amt)), alice.address);
    }
    await vault.connect(alice).redeem(await vault.balanceOf(alice.address), alice.address, alice.address);
    expect(await asset.balanceOf(alice.address)).to.equal(ethers.parseEther("10000"));
  });
});
```

## Fork Test — AMM Swap Simulation

```typescript
describe("Uniswap V3 on Fork", function () {
  const ROUTER = "0xE592427A0AEce92De3Edee1F18E0157C05861564";
  const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
  const WHALE = "0x...";

  it("simulates WETH→USDC swap", async function () {
    await impersonateAccount(WHALE);
    const s = await ethers.getSigner(WHALE);
    const router = await ethers.getContractAt("ISwapRouter", ROUTER);
    const weth = await ethers.getContractAt("IERC20", WETH);

    await weth.connect(s).approve(ROUTER, ethers.parseEther("10"));
    const tx = await router.connect(s).exactInputSingle({
      tokenIn: WETH, tokenOut: USDC, fee: 3000, recipient: WHALE,
      deadline: Math.floor(Date.now() / 1000) + 60,
      amountIn: ethers.parseEther("10"), amountOutMinimum: 0, sqrtPriceLimitX96: 0,
    });
    const receipt = await tx.wait();
    console.log("Gas used:", receipt!.gasUsed.toString());
  });
});
```

## Gas Reporter

```typescript
// hardhat.config.ts
gasReporter: {
  enabled: process.env.REPORT_GAS === "true",
  currency: "USD",
  token: "ETH",
  coinmarketcap: process.env.COINMARKETCAP_API_KEY,
  excludeContracts: ["MockERC20"],
  onlyCalledMethods: true,
  outputFile: "gas-report.txt",
}
```

```bash
REPORT_GAS=true npx hardhat test
```

```
·-----------------------------|-----------|-----------|-----------|----------·
| Contract    · Method        · Min       · Max       · Avg       · USD     │
·-----------------------------|-----------|-----------|-----------|---------·
| YieldVault  · deposit       ·     89234 ·     91245 ·     90782 ·   1.23  │
| YieldVault  · redeem        ·     56321 ·     57892 ·     57106 ·   0.78  │
·-----------------------------|-----------|-----------|-----------|---------·
```

## Coverage

```bash
npm install --save-dev solidity-coverage
npx hardhat coverage
```

## Hardhat Console

```bash
npx hardhat console --network hardhat
# In console:
const [d] = await ethers.getSigners();
const T = await ethers.getContractFactory("Token");
const t = await T.deploy("T", "TST", 18);
await t.totalSupply();
```
