# Rust Backend Deployment Pipelines

## 1. Overview

Deploying Rust applications involves compiling the code into a statically linked binary and packaging it into a minimal container. The CI/CD pipeline should ensure code quality, security, and performance before artifact creation.

## 2. Multi-stage Docker Builds

The standard method for deploying Rust backends is via multi-stage Dockerfiles. This ensures the final image does not contain the Rust toolchain, resulting in incredibly small, secure images (often < 20MB).

### 2.1 The Dockerfile

```dockerfile
# Stage 1: Build Environment
FROM rust:1.80-slim-bullseye AS builder

# Create an empty project to cache dependencies
RUN USER=root cargo new --bin app
WORKDIR /app

# Copy manifests
COPY ./Cargo.toml ./Cargo.lock ./

# Cache dependencies by building a dummy binary
RUN cargo build --release
RUN rm src/*.rs

# Copy actual source code
COPY ./src ./src
COPY ./sqlx-data.json ./sqlx-data.json # Needed for offline sqlx compilation

# Build the real binary. Touch main.rs to ensure cargo rebuilds it
RUN rm ./target/release/deps/app*
RUN cargo build --release

# Stage 2: Runtime Environment
FROM debian:bullseye-slim AS runtime

# Install CA certificates and standard dependencies for SSL/TLS
RUN apt-get update -y \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && apt-get autoremove -y \
    && apt-get clean -y \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the compiled binary from the builder environment
COPY --from=builder /app/target/release/app /usr/local/bin/app
COPY ./config ./config

# Expose port
EXPOSE 3000

# Set the entrypoint
ENTRYPOINT ["/usr/local/bin/app"]
```

## 3. GitHub Actions CI/CD Pipeline

A robust CI/CD pipeline ensures code formats, passes tests, and is audited before deployment.

### 3.1 CI Workflow (Formatting, Linting, Testing)

```yaml
name: Rust CI

on:
  push:
    branches: [ "main" ]
  pull_request:
    branches: [ "main" ]

env:
  CARGO_TERM_COLOR: always
  SQLX_OFFLINE: true # Prevent sqlx from hitting a real DB during compilation

jobs:
  test-and-lint:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4

    - name: Set up Rust
      uses: dtolnay/rust-toolchain@stable
      with:
        components: rustfmt, clippy

    - name: Cache Cargo Registry
      uses: actions/cache@v3
      with:
        path: ~/.cargo/registry
        key: ${{ runner.os }}-cargo-registry-${{ hashFiles('**/Cargo.lock') }}

    - name: Check Formatting
      run: cargo fmt -- --check

    - name: Run Clippy
      run: cargo clippy -- -D warnings

    - name: Run Tests
      run: cargo test --verbose
```

### 3.2 CD Workflow (Docker Image Build & Push)

```yaml
  build-and-push:
    needs: test-and-lint
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Log in to Docker Hub
      uses: docker/login-action@v3
      with:
        username: ${{ secrets.DOCKER_USERNAME }}
        password: ${{ secrets.DOCKER_PASSWORD }}
        
    - name: Build and push Docker image
      uses: docker/build-push-action@v5
      with:
        context: .
        push: true
        tags: myorg/myapp:latest,myorg/myapp:${{ github.sha }}
```

## 4. Cross-Compilation

If you need to deploy on ARM architectures (like AWS Graviton or Raspberry Pi) while building on x86 machines, use `cross`.

```bash
cargo install cross
cross build --target aarch64-unknown-linux-gnu --release
```

## 5. SQLx Offline Mode

If your project uses `sqlx::query!`, it requires a running database at compile time to verify queries. This is problematic in CI.

**Solution:** Generate offline metadata using `sqlx-cli`.

1. Locally, run the database and generate metadata:
   ```bash
   cargo install sqlx-cli
   cargo sqlx prepare --workspace
   ```
2. Commit the `sqlx-data.json` file to Git.
3. Set `SQLX_OFFLINE=true` in your CI/CD and Docker environments.

## 6. Distroless Containers

For maximum security and minimal size, consider using Google's "distroless" images instead of `debian-slim`.

```dockerfile
# Replace Stage 2 in Dockerfile:
FROM gcr.io/distroless/cc-debian11
COPY --from=builder /app/target/release/app /
CMD ["./app"]
```
*Note: Ensure your application is dynamically linked to `glibc` if using `cc-debian11`, or statically compile using the `musl` target.*

## 7. Managing Application Configuration

Rust applications should utilize a tiered configuration system:
1. `config/default.toml` (Base settings)
2. `config/production.toml` (Overrides for prod)
3. **Environment Variables** (Highest precedence, overriding everything, used for Secrets).

Kubernetes ConfigMaps and Secrets map perfectly to Environment Variables.

## 8. Summary Checklist
- [ ] Multi-stage Docker builds to discard toolchains.
- [ ] Run `cargo fmt` and `cargo clippy -- -D warnings` in CI.
- [ ] Use `SQLX_OFFLINE=true` with cached query data.
- [ ] Deploy utilizing small, secure Alpine or Distroless images.
