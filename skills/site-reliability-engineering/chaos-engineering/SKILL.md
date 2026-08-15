---
name: Chaos Engineering
description: Fault injection mechanics at network/kernel layer and blast radius containment.
---
# Chaos Engineering: Under the Hood

Chaos engineering involves deliberate fault injection to validate system resilience.

## Kernel-Layer Fault Injection
Tools like eBPF (Extended Berkeley Packet Filter) and Linux `tc` (Traffic Control) allow precise, low-overhead fault injection directly into the kernel network stack.
- **eBPF System Call Hooking**: Overriding `connect()`, `read()`, or `write()` syscalls to return synthetic `EAGAIN` or `ETIMEDOUT` errors.
- **Traffic Shaping**: Using `tc-netem` (Network Emulator) for packet corruption, delay, or dropping.

```mermaid
flowchart TD
%%{init: {"theme": "default", "themeVariables": {"fontSize": "28px"}, "flowchart": {"useMaxWidth": false}}}%%
    subgraph InjectionLayerKernelLayerInjection ["InjectionLayer ['Kernel Layer Injection']"]
        App[Application] -->|"syscall()"| Kernel[Linux Kernel]
        Kernel -->|"eBPF_Hook(Syscall)"| ErrorGen[Synthetic Error]
        Kernel -->|"tc_qdisc(eth0)"| NetDelay[Packet Delay]
    end
    subgraph SafetyBlastRadiusContainment ["Safety ['Blast Radius Containment']"]
        Target[Target Selection] --> Namespace[Network Namespaces]
        Namespace --> CGroups[Control Groups]
    end
```

## Blast Radius Containment
- **cgroups and Namespaces**: Restricting chaos agents to specific container namespaces ensures isolation.
- **Abort Conditions**: Real-time evaluation of Golden Signals (Latency, Traffic, Errors, Saturation). If SLIs breach the containment threshold, all eBPF hooks and `tc` rules are instantly flushed.
