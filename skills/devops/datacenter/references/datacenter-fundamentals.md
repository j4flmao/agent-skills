# Datacenter Fundamentals

## Overview
A data center is a physical facility housing computer systems, storage, networking, and supporting infrastructure. Data centers are the foundation of cloud computing and enterprise IT operations.

## Core Concepts

### Tier Classification
Tier I: basic capacity, no redundancy. 99.671% uptime (28.8 hours downtime/year). Single path for power/cooling. Tier II: redundant capacity components. 99.741% uptime (22 hours/year). Partial redundancy in power/cooling. Tier III: concurrently maintainable. 99.982% uptime (1.6 hours/year). Dual power/cooling paths, N+1 redundancy. Tier IV: fault tolerant. 99.995% uptime (26 minutes/year). Dual active power/cooling paths, 2N redundancy.

### Power Infrastructure
Utility feed: main power source from grid. UPS (Uninterruptible Power Supply): battery backup for short outages (5-30 minutes). Generator: long-term backup power (diesel or natural gas). PDU (Power Distribution Unit): distribute power to racks. ATS (Automatic Transfer Switch): switch between utility and generator. Redundancy configurations: N (no backup), N+1 (one extra), 2N (fully duplicated).

### Cooling Infrastructure
CRAC (Computer Room Air Conditioner): traditional raised-floor cooling. CRAH (Computer Room Air Handler): chilled water cooling. In-row cooling: cooling units between racks. Liquid cooling: direct-to-chip or immersion for high-density. Cold aisle/hot aisle containment: separate cold supply from hot exhaust.

## Key Components

### Rack Layout
Standard 19-inch rack, 42U height. Front-to-rear cooling airflow. Cable management: overhead or underfloor. Power distribution: redundant PDUs per rack. Network: top-of-rack switches, leaf-spine architecture.

### Networking
Spine-leaf architecture: each leaf switch connects to every spine switch. Provides predictable latency, horizontal scaling. Redundant spine switches for fault tolerance. Cross-connects between different carriers for diversity.

### Physical Security
Multi-factor access control (badge + biometric). CCTV monitoring with retention. Mantrap entry for secure areas. Visitor logs and escort policies. Vibration sensors, motion detection.

## Design Considerations

### Location Selection
Proximity to network backbone for low latency. Access to reliable utility power. Low natural disaster risk (flood, earthquake, hurricane). Available workforce for operations. Tax incentives and regulatory environment.

### Capacity Planning
Power density per rack (5-15 kW typical, 30-50 kW for high-density). Total facility power capacity (MW). Cooling capacity (tons of refrigeration). Network bandwidth (Gbps/Tbps). Rack count and utilization targets.

### Environmental Monitoring
Temperature and humidity sensors. Power usage effectiveness (PUE) tracking. Water leak detection. Airflow and pressure monitoring. Fire detection (VESDA) and suppression (FM200, Novec).

## Best Practices
- Design for N+1 or 2N power/cooling redundancy for critical workloads.
- Implement cold aisle/hot aisle containment for cooling efficiency.
- Monitor PUE to track energy efficiency (target under 1.4).
- Maintain accurate asset inventory and cable documentation.
- Implement remote hands capability for unmanned sites.
- Schedule regular generator testing under load.
- Document standard operating procedures for all maintenance.
- Plan for hardware lifecycle (3-5 year refresh cycle).

## References
- datacenter-advanced.md -- Advanced Datacenter topics
- power-cooling.md -- Power and Cooling
- networking-topology.md -- Network Topology
- data-center-security.md -- Physical Security
