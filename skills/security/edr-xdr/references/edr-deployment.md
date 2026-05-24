# EDR Deployment

## Deployment Planning

### Pre-Deployment Checklist
- [ ] Asset inventory complete (all endpoints identified and classified)
- [ ] OS versions documented (Windows 10/11/Server, macOS, Linux distros)
- [ ] Network segmentation mapped (VLANs, VPN, air-gapped systems)
- [ ] Existing security tools identified (AV, firewall, DLP for conflicts)
- [ ] Performance baseline established (CPU, memory, disk I/O per endpoint type)
- [ ] Rollback plan documented (uninstall procedure, system restore points)
- [ ] Change management approval obtained
- [ ] Staged rollout plan defined (pilot → critical → standard → remaining)

### Risk Assessment
| Risk | Mitigation |
|------|-----------|
| Performance impact on production servers | Pilot test on non-critical systems first |
| False positives causing alert fatigue | Tune detection rules during pilot phase |
| Application compatibility issues | Build exclusion list from app inventory |
| Network bandwidth saturation | Configure bandwidth throttling, peer-to-peer distribution |
| Uninstall failure | Document manual removal procedures per OS |
| Cloud connectivity loss | Cache events locally, queue for upload on reconnect |

## Deployment by OS

### Windows Deployment

**Group Policy (GPO) Distribution:**
- Create GPO linked to the relevant OU (e.g., "EDR Clients")
- Configure sensor installation via MSI with silent switches:
  ```
  msiexec /i edr-sensor.msi /qn /norestart SITE_TOKEN=xxx GROUP=Production
  ```
- Set sensor update policy via GPO administrative templates
- Configure Windows Firewall rules to allow sensor communication
- Apply to test group first, then phased rollout

**SCCM/MECM Distribution:**
- Create application in Configuration Manager
- Define detection method (registry key, file version)
- Deploy to device collections in phases
- Monitor deployment status via SCCM console

**Intune/Autopilot:**
- Add EDR sensor as Line-of-Business app in Intune
- Assign to Azure AD groups with phased rollout
- Use Intune compliance policies for health monitoring
- Deploy via Autopilot for new devices

### macOS Deployment

**MDM Distribution (Jamf, Intune):**
- Package sensor as .pkg or .mpkg
- Deploy via MDM configuration profile
- Configure system extension approval (NSExtension)
- Set Full Disk Access permissions via MDM
- Deploy kernel extension if required by sensor

**Installation Command:**
```bash
sudo installer -pkg edr-sensor.pkg -target /
sudo /usr/local/bin/edr-config --token XXX --group Production
```

**macOS Permissions Required:**
- Full Disk Access (FDA)
- Accessibility (for process monitoring)
- Network Filter (for network connections)
- System Extension (for kernel-level monitoring)
- Notification (for alert popups)

### Linux Deployment

**Package Manager Distribution:**
```bash
# RPM-based (RHEL, CentOS, Fedora)
sudo rpm -ivh edr-sensor.rpm
sudo /opt/edr/bin/edr-config --token XXX --group Production

# DEB-based (Ubuntu, Debian)
sudo dpkg -i edr-sensor.deb
sudo /opt/edr/bin/edr-config --token XXX --group Production
```

**Containerized Environments:**
- Deploy EDR agent as a DaemonSet in Kubernetes
- Use hostPID: true and hostNetwork: true for visibility
- Mount host file system for file monitoring
- Configure exclusion for container orchestrator processes

## Performance Impact Guidelines

| Endpoint Type | CPU Baseline | CPU with EDR | Memory Impact | Disk Impact |
|--------------|-------------|-------------|---------------|-------------|
| Desktop (8GB RAM) | 5-15% | +3-8% | +150-400 MB | +2-5 MB/day |
| Laptop (8GB RAM, battery) | 5-10% | +2-5% | +100-300 MB | +1-3 MB/day |
| Server (32GB RAM, high I/O) | 20-40% | +5-10% | +300-600 MB | +5-15 MB/day |
| VDI (shared resources) | 10-20% | +3-6% | +100-200 MB | +2-4 MB/desktop/day |

## Exclusion Management

### Standard Exclusions

| Category | Examples | Reason |
|----------|----------|--------|
| Business applications | ERP, CRM, Office 365 apps | Performance |
| Development tools | Visual Studio, Git, Docker | False positives |
| Security tools | Other AV/EDR tools (careful coordination) | Conflicts |
| Management agents | SCCM, Intune, JumpCloud, AD connectors | Conflicts |
| Backup software | Veeam, Commvault, BackupExec | Performance |
| Database systems | SQL Server, Oracle, MySQL | Performance |
| Virtualization | Hyper-V, VMware, VirtualBox | Performance |

### Exclusion Path Examples

```
C:\Program Files\BusinessApp\*
C:\ProgramData\BackupSoftware\*
D:\Database\Data\*
%WINDIR%\Temp\* (exclude with caution)
C:\Users\*\AppData\Local\Microsoft\Teams\*
```

### Exclusion Best Practices
- Use path exclusions over process exclusions when possible
- Always capture exclusion justifications in documentation
- Review exclusions quarterly for stale entries
- Enable threat detection even on excluded paths (alert-only mode)
- Use wildcards sparingly — be as specific as possible
- Validate exclusions in a test environment before production

## Health Monitoring

### Sensor Health Dashboard Metrics
| Metric | Healthy | Warning | Critical |
|--------|---------|---------|----------|
| Last Seen | < 5 min | 5-30 min | > 30 min |
| Events/Sec | Within baseline | > 2x baseline | > 5x baseline |
| Queued Events | < 100 | 100-1000 | > 1000 |
| CPU Usage | < 15% | 15-30% | > 30% |
| Memory Usage | < 500 MB | 500-800 MB | > 800 MB |
| Sensor Version | Latest | 1 version behind | 2+ versions behind |

### Automated Health Checks
- Query EDR API for sensor status (all endpoints, every 5 min)
- Alert on endpoints with "Offline" > 24 hours
- Alert on endpoints with sensor version > 2 releases behind
- Weekly report of "stale" endpoints (no check-in > 7 days)
- Cross-reference with AD inventory for missing coverage

## Coverage Targets

| Environment | Minimum Coverage | Target Coverage |
|-------------|-----------------|-----------------|
| Corporate laptops | 98% | 100% |
| Corporate desktops | 95% | 100% |
| Servers (prod) | 95% | 100% |
| Servers (dev/test) | 80% | 95% |
| Cloud VMs | 90% | 100% |
| Containers | 80% | 95% |
| Remote/BYOD | 70% | 90% |

## Troubleshooting

| Symptom | Likely Cause | Resolution |
|---------|-------------|-----------|
| Sensor not installing | Missing dependencies | Install VC++ redistributable, .NET Framework |
| Sensor shows offline | Firewall blocking | Verify ports 443, 8883 outbound to EDR cloud |
| High CPU after install | Scan occurring | Add process exclusions, wait for initial scan |
| Application crashes | Injection conflicts | Add process exclusion, enable safe mode |
| Missing events | OS not supported | Check OS version compatibility matrix |
| Update fails | Service account permissions | Verify SYSTEM account has write access to install dir |
