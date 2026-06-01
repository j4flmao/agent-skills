# Bare Metal Hardware Lifecycle

## Hardware Sourcing
OEM comparison: Dell iDRAC, HP iLO, Supermicro IPMI, Cisco UCS. Evaluate: CPU cores, RAM channels, disk controllers, network interfaces. Warranty and support: 4-hour on-site replacement. Burn-in testing: 72-hour stress test before production. Firmware baseline: uniform version across fleet.

## Server Provisioning
PXE boot: network boot from provisioning server. iPXE: extended PXE with HTTP boot and scripting. Kickstart (RHEL) / Preseed (Debian) for OS installation automation. MAAS: Metal-as-a-Service for bare-metal provisioning. Terraform with MAAS provider for infrastructure as code.

## Firmware Lifecycle
Firmware updates: BIOS, BMC, NIC, disk controller, SSD. Vendor tools: Dell RACADM, HP SUM, Supermicro SUM. Staged rollout: test → canary → batch → fleet. Rollback plan: previous firmware version saved. Critical security patches: apply within 30 days.

## Health Monitoring
IPMI/BMC monitoring: temperature, fan speed, power consumption. SMART monitoring for disk health prediction. Memory ECC error tracking. CPU thermal throttling detection. Hardware watchdog for hang detection. Integration with Prometheus/librenms/checkmk.

## End-of-Life Planning
Vendor EOL announcements tracked in asset management. Budget planning: 3-5 year refresh cycle. Data destruction: degaussing, physical shredding, or certified wipe. Decommission: remove from inventory, clear configuration. Migration planning: migrate workloads before EOL.

## RMA Process
Vendor SLA: next business day, 4-hour, or 2-hour replacement. Hot spare: keep spare hardware on-site for critical roles. RMA request: serial number, error logs, diagnostic output. Return shipping: prepaid label from vendor. Cross-ship: receive replacement before sending defective unit.

## References
- bare-metal-fundamentals.md -- Fundamentals
- ipmi-bmc.md -- IPMI and BMC
- provisioning-pxe-maas.md -- Provisioning
- burn-in.md -- Burn-in Testing
- firmware-lifecycle.md -- Firmware Management
