# Serverless Cold Starts & Optimization

## 1. Skill Context
**Focus**: Execution environment lifecycle, AWS Lambda/Azure Functions, provisioned concurrency, and runtime optimization.
**Triggers**: lambda cold start, optimize serverless, provisioned concurrency, aws lambda performance

## 2. Deep Optimization Mechanics
The agent must understand the micro-vm (Firecracker) initialization sequence and runtime constraints.

### The Cold Start Anatomy
1. **Infrastructure Phase**: Cloud provider allocates a micro-VM, downloads the code package, and bootstraps the runtime.
2. **Init Phase**: The runtime loads the user code and executes code *outside* the main handler function.
3. **Invoke Phase**: The actual handler function processes the event.

### Mitigation Strategies
- **Provisioned Concurrency**: Keeping a specific number of execution environments pre-warmed. Explain the cost implications versus latency requirements.
- **Init Phase Optimization**: 
  - Lazy loading dependencies (importing modules inside the handler if they are rarely used).
  - Establishing database connections outside the handler so they are preserved across warm invocations.
- **Language & Runtime Selection**: Transitioning from heavy runtimes (Java/Spring, C#) to fast-booting compiled languages (Go, Rust) or leveraging AOT (Ahead-of-Time) compilation like GraalVM native images.
- **VPC Cold Starts**: Explaining how modern AWS Lambda Hyperplane ENIs solved the historic VPC cold start issue, but why IP address exhaustion is still a concern.

## 3. Output Format
- Provide architecture strategies for multi-tier serverless apps.
- Detail code-level refactoring to shift heavy initialization out of the critical path.
- Provide Terraform snippets for configuring Provisioned Concurrency and Auto Scaling.
