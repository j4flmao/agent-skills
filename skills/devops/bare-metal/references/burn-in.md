# Hardware Burn-In — Acceptance Testing

## Why Burn-In
Infant mortality: ~2–5% of new servers exhibit defects within first 90 days (DOA + early life).
Most fail in the first 48h of sustained load. Burn-in catches these BEFORE you put production
data on them, while still under vendor RMA.

## Burn-In Suite (24h minimum, 72h preferred)

```
[T+0 to T+24h]   Memory test (memtest86+)            full passes ×3
[T+24 to T+48h]  CPU stress (stress-ng + mprime)     concurrent with disk + NIC
[T+24 to T+48h]  Disk soak (badblocks + fio)         per drive, write+verify
[T+24 to T+48h]  NIC line-rate (iperf3)              both ports, full duplex
[T+48 to T+50h]  Thermal cycle (10 power cycles)     verify clean POST each
[T+50 to T+72h]  Sustained mixed load                CPU 80%+, disk active, NIC active
Continuous       Sensor scrape every 60s             temp/voltage/fan/PSU
```

## Memory Test

```
# memtest86+ — boot from PXE
ipmitool chassis bootdev pxe options=efiboot
# Set boot to PXE that serves memtest image. Run 3 full passes.

# Or in-OS (less thorough; can't test the kernel-used memory)
sudo apt install memtester
memtester 96G 3        # test 96 GB for 3 iterations
```

ECC errors: zero corrected errors expected in 24h. Any uncorrected = fail.

```bash
# Read ECC counters
edac-util -v
# or via mcelog
mcelog --daemon
```

## CPU Stress

```bash
# stress-ng — comprehensive
stress-ng --cpu $(nproc) --cpu-method all --metrics --timeout 24h --tz

# mprime (Prime95) — Linpack-style FPU stress
./mprime -t   # torture test

# Watch temps during run
watch -n 5 'sensors | grep -E "(Core|Package)"'
```

Fail criteria: thermal throttling, MCE (machine check exception), kernel hang, dmesg errors.

## Disk Soak

```bash
# badblocks — destructive write test (loses data; only for fresh drives)
badblocks -wsv -b 4096 -t random /dev/nvme0n1

# fio — random R/W mix, sustained
fio --name=stress --filename=/dev/nvme0n1 --rw=randrw --rwmixread=70 \
    --bs=4k --iodepth=64 --numjobs=8 --runtime=86400 --time_based \
    --group_reporting --direct=1

# SMART before / after
smartctl -a /dev/nvme0n1
# Watch for:
#   Reallocated_Sector_Ct increase
#   Pending_Sector_Ct > 0
#   Media_Wearout_Indicator drop (SSD)
#   Temperature spikes
```

## NIC Test

```bash
# iperf3 — full duplex on both ports
# Server side (peer node):
iperf3 -s -p 5201
# Client (under test):
iperf3 -c peer -p 5201 -t 14400 -P 8 --bidir
# Run on each NIC; expect line rate ± 2%

# Errors / drops (must be 0)
ethtool -S eno1 | grep -E "errors|drops|crc"
```

## Sensor Monitoring (continuous)

```bash
# Script: scrape every 60s
while true; do
  date +%FT%T
  ipmitool sensor list | grep -E "Temp|Fan|Volt|PSU"
  sleep 60
done | tee burnin-sensors.log

# Or via Redfish + Prometheus
```

Thresholds (typical):
- CPU temp ≤ 85°C under load (90°C absolute max)
- Inlet temp ≤ 30°C
- All voltages within ±5% of nominal
- Fan RPM stable (no swings)
- PSU both present + redundant

## Power Cycle Test

```bash
for i in $(seq 1 10); do
  ipmitool chassis power cycle
  sleep 600                                    # 10 min to fully boot + soak
  ipmitool chassis status | grep -q "is on" || { echo "FAIL on cycle $i"; exit 1; }
done
```

## Acceptance Criteria (pass / fail)

```
PASS if all true:
  - Memory: 3 passes, 0 errors
  - CPU: 24h stress, 0 MCE, no thermal throttle past 100ms
  - Disk: 24h fio, SMART deltas within thresholds
  - NIC: 24h iperf, 0 errors, line rate ± 2%
  - 10 power cycles, all clean POST
  - All sensors within spec entire run
  - dmesg clean (only expected messages)
FAIL otherwise → RMA back to vendor with logs.
```

## RMA Process

```
1. Capture full evidence: burn-in logs, SEL dump, SMART data, sensor history
2. Open vendor ticket (Dell ProSupport / HPE Pointnext / Supermicro RMA)
3. Receive replacement (typically 3–10 business days under NBD support)
4. Re-run burn-in on replacement
5. Update CMDB with new serial / asset
6. Failed unit shipped back; track serial to closure
```

## Aggregate Burn-In Reporting

Track over time per vendor / SKU:
- DOA rate
- Burn-in failure rate
- Failure mode distribution (mem / cpu / disk / nic / psu)
- Mean time to failure for failures observed

Use this to bias future procurement decisions.

## Automation

```
1. New unit racked + cabled
2. BMC discovered by MAAS
3. Auto-commission triggers burn-in workflow
4. 72h soak; results pushed to test database
5. PASS → promote to ready pool
6. FAIL → quarantine, RMA ticket auto-created
```

Burn-in for free during commission phase is the only realistic way at fleet scale (100+ servers/year).
