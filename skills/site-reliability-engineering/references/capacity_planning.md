# Capacity Planning

## Core Principles
Capacity planning ensures that your service can handle anticipated load without degrading performance or reliability, while optimizing resource costs.

## Load Testing
- **Goal:** Identify the maximum capacity of a system under normal and peak conditions.
- **Tools:** JMeter, Locust, K6.
- **Metrics to monitor during test:** Latency, Throughput, Error Rate, Resource Utilization (CPU, Memory, Network I/O).

## Bottleneck Analysis
- **CPU Bound:** High CPU utilization, low wait times. Solution: Optimize code, add more compute (Vertical/Horizontal scaling).
- **Memory Bound:** High memory usage, swapping, OOM kills. Solution: Fix memory leaks, increase RAM, optimize data structures.
- **I/O Bound:** High disk/network wait times. Solution: Caching (Redis/Memcached), optimize DB queries, upgrade disks (SSD/NVMe).

## Scaling Strategies
- **Vertical Scaling (Scaling Up):** Adding more power (CPU, RAM) to an existing machine.
  - *Pros:* Easy to implement, no architectural changes.
  - *Cons:* Hard limits (hardware constraints), potential downtime, single point of failure.
- **Horizontal Scaling (Scaling Out):** Adding more machines to the pool of resources.
  - *Pros:* Infinite scalability, better fault tolerance.
  - *Cons:* Complex architecture (needs load balancers, stateless apps, distributed data).
