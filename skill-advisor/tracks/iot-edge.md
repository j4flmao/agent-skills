# IoT & Edge Engineer

**Who this is for:** You connect devices, run code at the edge and ship ML to small hardware.

[← Advisor home](../README.md) · [Build a custom bundle](../custom-bundles.md) · [Recipes](../recipes.md)

## Security baseline (2 skills, installed with every level)

These skills make the agent apply this domain's security practices by default. They are included in every install command below; the repository-wide baseline is in [`.claude/rules/secure-by-default.md`](../../.claude/rules/secure-by-default.md).

| Skill | Path | What it covers |
|-------|------|----------------|
| [`modern-cryptography`](../../skills/cybersecurity/modern-cryptography/SKILL.md) | `cybersecurity/modern-cryptography` | Explain the mechanics and correct selection of modern asymmetric cryptography — ECC/ECDHE for key exchange and forward secrecy, and NIST PQC… |
| [`security-secrets-management`](../../skills/security/secrets-management/SKILL.md) | `security/secrets-management` | Design a secrets management strategy covering detection (GitLeaks, truffleHog, ggshield), centralized storage (Vault, AWS Secrets Manager, GCP… |

## Level 1 — Essentials (3 skills)

Install these first. They cover the everyday work of this role and rarely conflict.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`iot-protocols`](../../skills/embedded-systems/iot-protocols/SKILL.md) | `embedded-systems/iot-protocols` | Constrained devices run on batteries, lossy radios and tiny RAM. |
| [`rtos`](../../skills/embedded-systems/rtos/SKILL.md) | `embedded-systems/rtos` | Turn a firmware feature into a set of tasks, priorities and communication primitives that meet deadlines deterministically. |
| [`c-cpp-patterns`](../../skills/embedded-systems/c-cpp-patterns/SKILL.md) | `embedded-systems/c-cpp-patterns` | Firmware bugs come from a short list: wrong register access, data shared with ISRs unsafely, heap fragmentation, undefined behaviour the optimiser… |

## Level 2 — Professional (4 skills)

Add when the project grows: production concerns, scaling and team workflows.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`edge-ai`](../../skills/embedded-systems/edge-ai/SKILL.md) | `embedded-systems/edge-ai` | A model that works in a notebook still has to fit the device's memory, latency, power and operator support. |
| [`bare-metal-rust`](../../skills/embedded-systems/bare-metal-rust/SKILL.md) | `embedded-systems/bare-metal-rust` | Rust removes whole classes of firmware bugs (buffer overruns, use-after-free, data races between ISR and main) at compile time while compiling to… |
| [`cloud-native-cloudflare-workers`](../../skills/cloud-native/edge-computing/cloudflare-workers/SKILL.md) | `cloud-native/edge-computing/cloudflare-workers` | Run request-path logic close to users on Cloudflare's network. |
| [`data-streaming`](../../skills/data/streaming/SKILL.md) | `data/streaming` | Design streaming data pipelines with Kafka topic architecture, Flink/Kafka Streams processing, schema evolution, and reliability guarantees. |

## Level 3 — Specialist (2 skills)

Add one at a time, only for the problem in front of you. These are deep and narrow.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`rtos-fundamentals`](../../skills/embedded-systems/rtos-fundamentals/SKILL.md) | `embedded-systems/rtos-fundamentals` | Real-time means bounded and predictable response time, not fast. |
| [`ml-inference-optimization`](../../skills/ml/inference-optimization/SKILL.md) | `ml/inference-optimization` | Serve LLMs at the required latency for the lowest cost. |

## Install

Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.

**Level 1 + security baseline (5 skills):**

```bash
npx skills add j4flmao/agent-skills --skill iot-protocols --skill rtos --skill c-cpp-patterns --skill modern-cryptography --skill security-secrets-management
```

**Level 1 + 2 + security baseline (9 skills):**

```bash
npx skills add j4flmao/agent-skills --skill iot-protocols --skill rtos --skill c-cpp-patterns --skill edge-ai --skill bare-metal-rust --skill cloud-native-cloudflare-workers --skill data-streaming --skill modern-cryptography --skill security-secrets-management
```

Level 3: add single skills with `--skill <name>` when you need them.

## Ready-made bundles

Bundles are installed with the same command; each one's full command is on the [bundles page](../bundles.md).

| Bundle | Skills | Description |
|--------|--------|-------------|
| [`embedded-iot`](../bundles.md#embedded-iot) | 9 | Embedded and IoT: RTOS, bare-metal Rust, C/C++ patterns, IoT protocols, edge AI |

## Combine with

- [Systems & Embedded Engineer](systems.md)
- [Cloud Architect & Engineer](cloud.md)

## Watch out

Read `.claude/rules/misra-c-standards.md` for firmware and `.claude/rules/crypto-deprecation.md` for device credentials.
