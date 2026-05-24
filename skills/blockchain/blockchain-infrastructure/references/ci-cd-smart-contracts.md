# CI/CD for Smart Contracts

## Pipeline Flow

```
   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
   │  Lint    │───►│  Test    │───►│  Static  │───►│  Build   │───►│  Verify  │
   │ Solhint  │    │  Forge   │    │  Slither │    │  Artif.  │    │ Explorer │
   └──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
                                                         │
                                                    ┌────┴────┐
                                                    │  Deploy │
                                                    │ Testnet │
                                                    └─────────┘
                                                         │
                                                    ┌────┴────┐
                                                    │  Smoke  │
                                                    │  Tests  │
                                                    └─────────┘
```

## Foundry (Forge) Pipeline

### GitHub Actions — Forge CI/CD
```yaml
name: Smart Contract CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  workflow_dispatch:
    inputs:
      environment:
        description: "Deploy environment"
        type: choice
        options: [testnet, staging]
        required: true

env:
  FOUNDRY_PROFILE: ci
  RPC_URL_SEPOLIA: ${{ secrets.RPC_URL_SEPOLIA }}
  DEPLOYER_PRIVATE_KEY: ${{ secrets.DEPLOYER_PRIVATE_KEY }}
  ETHERSCAN_API_KEY: ${{ secrets.ETHERSCAN_API_KEY }}

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Foundry
        uses: foundry-rs/foundry-toolchain@v1
        with:
          version: nightly

      - name: Run Solhint
        uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm install -g solhint && solhint 'src/**/*.sol'

      - name: Format check
        run: forge fmt --check

  test:
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - uses: actions/checkout@v4

      - name: Install Foundry
        uses: foundry-rs/foundry-toolchain@v1
        with:
          version: nightly

      - name: Run Forge tests with gas report
        run: forge test --gas-report --match-path "test/**/*.t.sol" -vvv

      - name: Run coverage
        run: forge coverage --report lcov

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./lcov.info
          flags: smart-contracts

      - name: Store gas snapshot
        run: |
          forge snapshot --diff
          echo "## Gas Report" >> $GITHUB_STEP_SUMMARY
          cat .gas-snapshot >> $GITHUB_STEP_SUMMARY

  slither:
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - uses: actions/checkout@v4

      - name: Run Slither
        uses: crytic/slither-action@v0.3.0
        continue-on-error: true
        with:
          solc-version: 0.8.25
          slither-args: >
            --detect all
            --exclude-dependencies
            --filter-paths "lib/"
            --fail-high

      - name: Upload Slither report
        uses: actions/upload-artifact@v4
        with:
          name: slither-report
          path: slither_report.json

  deploy-testnet:
    runs-on: ubuntu-latest
    needs: [test, slither]
    if: github.ref == 'refs/heads/main' && github.event_name == 'workflow_dispatch'
    environment: ${{ github.event.inputs.environment || 'testnet' }}
    steps:
      - uses: actions/checkout@v4

      - name: Install Foundry
        uses: foundry-rs/foundry-toolchain@v1
        with:
          version: nightly

      - name: Deploy contracts
        run: |
          forge script script/Deploy.s.sol \
            --rpc-url ${{ env.RPC_URL_SEPOLIA }} \
            --private-key ${{ env.DEPLOYER_PRIVATE_KEY }} \
            --broadcast \
            --verify \
            --etherscan-api-key ${{ env.ETHERSCAN_API_KEY }} \
            -vvvv

      - name: Save deployment artifact
        run: |
          cp broadcast/Deploy.s.sol/11155111/run-latest.json deploy-artifact.json
          echo "DEPLOYED_AT=$(cat deploy-artifact.json | jq -r '.transactions[0].contractAddress')" >> $GITHUB_ENV

      - name: Upload deployment artifact
        uses: actions/upload-artifact@v4
        with:
          name: deployment-${{ github.sha }}
          path: deploy-artifact.json

  smoke-test:
    runs-on: ubuntu-latest
    needs: deploy-testnet
    steps:
      - uses: actions/checkout@v4

      - name: Install Foundry
        uses: foundry-rs/foundry-toolchain@v1
        with:
          version: nightly

      - name: Run post-deployment smoke tests
        env:
          DEPLOYED_ADDRESS: ${{ needs.deploy-testnet.outputs.DEPLOYED_AT }}
        run: |
          forge script script/SmokeTest.s.sol \
            --rpc-url ${{ env.RPC_URL_SEPOLIA }} \
            -vvv
```

## Hardhat Pipeline

### GitHub Actions — Hardhat CI/CD
```yaml
name: Hardhat CI/CD

on:
  push:
    branches: [main]
  pull_request:

jobs:
  hardhat-ci:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20]

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: "npm"

      - run: npm ci

      - name: Compile
        run: npx hardhat compile --force

      - name: Run tests
        run: npx hardhat test --network hardhat

      - name: Run coverage
        run: npx hardhat coverage

      - name: Gas report
        run: REPORT_GAS=true npx hardhat test

      - name: Slither analysis
        uses: crytic/slither-action@v0.3.0
        with:
          target: "contracts/"
          slither-args: "--detect all --exclude-dependencies --fail-high"

  deploy-testnet:
    runs-on: ubuntu-latest
    needs: hardhat-ci
    if: github.ref == 'refs/heads/main'
    environment: testnet
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "npm"

      - run: npm ci

      - name: Deploy to Sepolia
        env:
          SEPOLIA_URL: ${{ secrets.SEPOLIA_URL }}
          PRIVATE_KEY: ${{ secrets.DEPLOYER_PRIVATE_KEY }}
          ETHERSCAN_API_KEY: ${{ secrets.ETHERSCAN_API_KEY }}
        run: |
          npx hardhat run scripts/deploy.ts \
            --network sepolia

      - name: Verify contracts
        env:
          ETHERSCAN_API_KEY: ${{ secrets.ETHERSCAN_API_KEY }}
        run: |
          npx hardhat verify --network sepolia $DEPLOYED_ADDRESS
```

## Deployment Script Examples

### Foundry Deploy Script
```solidity
// script/Deploy.s.sol
pragma solidity ^0.8.25;

import "forge-std/Script.sol";
import "../src/Token.sol";
import "../src/Vault.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        Token token = new Token(deployer);
        Vault vault = new Vault(address(token));

        vm.stopBroadcast();

        // Log deployment addresses
        console2.log("Token deployed at:", address(token));
        console2.log("Vault deployed at:", address(vault));
        console2.log("Deployer:", deployer);

        // Write deployment info for verification
        string memory json = string.concat(
            '{"token":"', vm.toString(address(token)),
            '","vault":"', vm.toString(address(vault)),
            '","deployer":"', vm.toString(deployer), '"}'
        );
        vm.writeJson(json, "./deployments/deploy.json");
    }
}
```

### Hardhat Deploy Script (TypeScript)
```typescript
// scripts/deploy.ts
import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

  // Deploy Token
  const Token = await ethers.getContractFactory("Token");
  const token = await Token.deploy(deployer.address);
  await token.waitForDeployment();
  console.log("Token deployed to:", await token.getAddress());

  // Deploy Vault
  const Vault = await ethers.getContractFactory("Vault");
  const vault = await Vault.deploy(await token.getAddress());
  await vault.waitForDeployment();
  console.log("Vault deployed to:", await vault.getAddress());

  // Save deployment artifact
  const deployment = {
    network: network.name,
    chainId: network.config.chainId,
    token: await token.getAddress(),
    vault: await vault.getAddress(),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
  };

  const deploymentsDir = path.join(__dirname, "../deployments");
  fs.mkdirSync(deploymentsDir, { recursive: true });
  fs.writeFileSync(
    path.join(deploymentsDir, `${network.name}.json`),
    JSON.stringify(deployment, null, 2)
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

### Foundry Verification Script
```solidity
// script/Verify.s.sol
pragma solidity ^0.8.25;

import "forge-std/Script.sol";

contract VerifyScript is Script {
    function run() external {
        string memory deployJson = vm.readFile("./deployments/deploy.json");
        address token = vm.parseJsonAddress(deployJson, ".token");
        address vault = vm.parseJsonAddress(deployJson, ".vault");

        // Verify on Etherscan
        vm.serializeAddress("constructor_args", "deployer", vm.addr(vm.envUint("DEPLOYER_PRIVATE_KEY")));

        string memory cmd = string.concat(
            "forge verify-contract ",
            vm.toString(token),
            " src/Token.sol:Token ",
            "--chain-id 11155111 ",
            "--etherscan-api-key ", vm.envString("ETHERSCAN_API_KEY")
        );

        vm.ffi(vm.split(cmd, " "));
    }
}
```

## Multi-Sig Deployment Flow

### Gnosis Safe Deployment
```typescript
// scripts/gnosis-deploy.ts
import { ethers } from "hardhat";

async function gnosisDeploy() {
  const safe = "0x..."; // Gnosis Safe address
  const deployer = new ethers.Wallet(process.env.PRIVATE_KEY!, ethers.provider);

  // Prepare deployment transaction data
  const TokenFactory = await ethers.getContractFactory("Token");
  const tokenData = TokenFactory.interface.encodeDeploy([deployer.address]);
  const tokenInitCode = TokenFactory.bytecode + tokenData.slice(2);

  // Compute counterfactual address
  const tokenAddress = ethers.getCreateAddress({
    from: safe,
    nonce: 0, // next nonce on Safe
  });

  // Create Safe transaction batch
  const safeTxn = {
    to: safe,
    value: 0,
    data: safe.interface.encodeFunctionData("execTransaction", [
      safe,                                     // to
      0,                                        // value
      tokenInitCode,                            // data
      0,                                        // operation (0 = call, 1 = delegate)
      0,                                        // safeTxGas
      0,                                        // baseGas
      0,                                        // gasPrice
      ethers.ZeroAddress,                       // gasToken
      ethers.ZeroAddress,                       // refundReceiver
      "0x",                                     // signatures
    ]),
  };

  console.log("Submit to Gnosis Safe UI:", safeTxn);
  console.log("Predicted Token address:", tokenAddress);
}

gnosisDeploy();
```

## Post-Deployment Smoke Tests

```solidity
// script/SmokeTest.s.sol
pragma solidity ^0.8.25;

import "forge-std/Script.sol";
import "../src/Token.sol";

contract SmokeTestScript is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        string memory deployJson = vm.readFile("./deployments/deploy.json");
        address tokenAddr = vm.parseJsonAddress(deployJson, ".token");

        Token token = Token(tokenAddr);

        // Smoke checks
        require(token.totalSupply() > 0, "Total supply is zero");
        require(token.balanceOf(deployer) > 0, "Deployer balance is zero");
        require(token.decimals() > 0, "Decimals not set");

        vm.startBroadcast(deployerKey);
        token.transfer(address(0xdead), 1 ether);
        vm.stopBroadcast();

        require(
            token.balanceOf(address(0xdead)) == 1 ether,
            "Transfer failed"
        );

        console2.log("All smoke tests passed ✓");
    }
}
```

## Slither Static Analysis Config

```json
{
  "detectors": [
    "all"
  ],
  "exclude_informational": false,
  "exclude_low": false,
  "exclude_medium": false,
  "exclude_high": false,
  "filter_paths": "(lib/|test/|script/)",
  "solc_remaps": [
    "ds-test/=lib/forge-std/lib/ds-test/src/",
    "forge-std/=lib/forge-std/src/"
  ],
  "disable_color": false,
  "exclude_dependencies": true,
  "maximum_detectors": 25,
  "fail_on": ["high", "medium"]
}
```
