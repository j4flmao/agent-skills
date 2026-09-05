# XDP (eXpress Data Path)

## 1. The Linux Networking Bottleneck
When a network packet arrives at a Network Interface Card (NIC), standard Linux networking does a massive amount of work:
1. Allocates an `sk_buff` (Socket Buffer) structure in kernel memory.
2. Passes it through the IP layer, Netfilter (iptables), TCP layer.
3. Copies it to user space.

If you are dealing with a 100 Gbps DDoS attack, creating millions of `sk_buff` structs per second will overwhelm the CPU and crash the server.

## 2. Enter XDP
XDP is a specific hook for eBPF programs. It runs at the absolute lowest possible point in the software stack: **directly inside the network driver**, *before* the kernel even creates an `sk_buff`.

When a packet arrives, your XDP eBPF program executes and can return one of four verdicts:
- `XDP_DROP`: Silently drop the packet. (Costs almost zero CPU cycles. Used by Cloudflare to mitigate DDoS).
- `XDP_PASS`: Pass the packet up to the normal Linux network stack.
- `XDP_TX`: Bounce the packet right back out the same network card (e.g., for building ultra-fast load balancers).
- `XDP_REDIRECT`: Send the packet to a different CPU, different NIC, or bypass the kernel entirely via AF_XDP.

## 3. Real-World Application (Cilium)
Kubernetes networking traditionally relies on `kube-proxy` and `iptables`. In a large cluster with thousands of services, `iptables` becomes a massive sequential bottleneck (O(N) complexity).
Projects like **Cilium** replace `iptables` entirely with eBPF/XDP. They inject the routing and security policies directly into the kernel using eBPF Maps, reducing latency by 40% and achieving near-native line rate performance.
