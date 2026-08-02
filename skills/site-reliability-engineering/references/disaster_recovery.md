# Disaster Recovery (DR)

## Key Metrics
- **RTO (Recovery Time Objective):** The maximum tolerable length of time that a computer, system, network, or application can be down after a failure or disaster occurs. "How fast must we recover?"
- **RPO (Recovery Point Objective):** The maximum tolerable period in which data might be lost from an IT service due to a major incident. "How much data can we lose?"

## Backup Strategies
- **Full Backup:** Complete copy of all data. Slowest to backup and restore.
- **Incremental Backup:** Backs up only the data that has changed since the last backup. Fastest backup, slower restore (needs full + all incrementals).
- **Differential Backup:** Backs up data changed since the last *full* backup. Faster restore than incremental.

## Failover Architectures
- **Active-Passive (Cold/Warm/Hot Standby):**
  - Traffic goes to the primary (Active) site. The secondary (Passive) site is waiting.
  - *Cold:* Infrastructure is there, but off or not configured. High RTO.
  - *Warm:* Infrastructure runs, but might be scaled down or need manual intervention.
  - *Hot:* Infrastructure runs in sync, ready to take over immediately. Low RTO.
- **Active-Active:**
  - Traffic is served by both sites simultaneously.
  - Provides zero-downtime failover (RTO = 0) and better resource utilization, but is complex to set up (especially data synchronization).
