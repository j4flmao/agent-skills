# EDR Incident Investigation

## Investigation Methodology

### 1. Alert Triage
- Verify alert legitimacy — distinguish true positive from false positive
- Check alert metadata: severity, type, affected endpoint, timestamp
- Review initial trigger event details (process, file, network, registry)
- Cross-reference with other alerts on the same endpoint (alert storm detection)

### 2. Process Tree Analysis

Build the full process ancestry chain:

```
Parent Process
  └─ Grandparent Process
       └─ Great-Grandparent Process
```

Key investigation questions:
- Was the process spawned by a trusted parent (explorer.exe → cmd.exe → powershell)?
- Does the parent-child relationship make sense (word.exe → powershell.exe is suspicious)?
- Are there orphaned processes or suspicious parent PID mismatches?
- Check process command-line arguments for obfuscation, encoding, base64 strings
- Look for process hollowing/injection: legitimate process spawned from unusual location

### 3. File and Registry Timeline

Build a chronological timeline of events on the endpoint:

**File Operations:**
- File creation: `notepad.exe` → `evil.ps1`, `svchost.exe` in temp directories
- File modification: DLL injection, system file replacement
- File deletion: Evidence removal, ransomware encryption markers
- Renamed files: LOLBin renamed to avoid detection

**Registry Operations:**
- Run/RunOnce keys for persistence
- AppInit_DLLs, AppCertDLLs for DLL injection
- Image hijacking (Debugger, SilentProcessExit)
- Service failure recovery (cmd.exe as recovery action)
- COM hijacking (CLSID modifications)

### 4. Memory Analysis

- Dump process memory for injected code detection
- Identify unbacked memory regions (private, committed, executable)
- Look for reflective DLL loading
- Detect API hooking and trampoline patches
- Check for hollowed processes (image mismatch)
- Extract configuration data from malware samples in memory

### 5. Suspicious Network Connections

| Indicator | Description | Suspicious If |
|-----------|-------------|---------------|
| Beaconing | Periodic callbacks to external IPs | Regular intervals, same payload size |
| DNS Tunneling | Unusual DNS queries to single domain | Long subdomains, TXT record exfil |
| Non-Standard Ports | HTTP/S over non-standard ports | 445/139/3389 for web traffic |
| SSL/TLS Anomalies | Self-signed certs, mismatched SNI | Mismatched certificate to domain |
| Tor/I2P | Connection to known anonymization | Any unapproved Tor usage |
| Encrypted C2 | TLS to unknown/rare IPs | No prior DNS resolution |

### 6. LOLBins Detection

Common Living-Off-the-Land Binaries used by adversaries:

| Binary | Common Abuse | Detection |
|--------|-------------|-----------|
| `powershell.exe` | Encoded commands, download cradle | Monitor -EncodedCommand, IEX, downloadstring |
| `cmd.exe` | Batch script execution, pipe output | Suspicious parent processes |
| `wmic.exe` | Remote process execution, data exfil | WMIC /node, process call create |
| `mshta.exe` | JavaScript/VBScript in HTA | Unusual command-line arguments |
| `rundll32.exe` | DLL execution from non-standard paths | JavaScript protocol, URL monikers |
| `regsvr32.exe` | COM scriptlet execution | .sct file execution over network |
| `certutil.exe` | File download/decode | URL download, base64 decode |
| `bitsadmin.exe` | File download | Transfer job creation |
| `cscript.exe` / `wscript.exe` | Script execution | Suspicious script content |
| `msbuild.exe` | Inline task execution | Compile with suspicious source |

### 7. Persistence Mechanisms

| Method | Registry/File Location | Detection |
|--------|----------------------|-----------|
| Scheduled Tasks | `\Windows\Tasks\` | Unusual task triggers, actions |
| Startup Folder | `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup` | Non-standard executables |
| Services | `HKLM\SYSTEM\CurrentControlSet\Services\` | New services, renamed binaries |
| WMI Persistence | `__EventFilter`, `CommandLineEventConsumer` | WMI permanent event subscriptions |
| Bootkit | Master Boot Record, EFI partition | Boot sector modification |
| DLL Sideloading | Legitimate app directory | Unverified DLL in app path |
| Browser Extensions | Chrome/Firefox extension folders | Unauthorized extensions |

### 8. MITRE ATT&CK Mapping

Map investigation findings to the MITRE ATT&CK framework:

| Event | Tactic | Technique ID |
|-------|--------|-------------|
| Phishing email with attachment | Initial Access | T1566.001 |
| PowerShell encoded command | Execution | T1059.001 |
| Registry Run key added | Persistence | T1547.001 |
| UAC bypass via fodhelper | Privilege Escalation | T1548.002 |
| Process injection into explorer | Defense Evasion | T1055.001 |
| LSASS process access | Credential Access | T1003.001 |
| Net command to enumerate domain | Discovery | T1016 |
| SMB connection to remote host | Lateral Movement | T1021.002 |
| Data archived in temp folder | Collection | T1074.001 |
| HTTPS beacon to external IP | Command and Control | T1071.001 |
| Upload to file sharing site | Exfiltration | T1567.009 |
| File encryption with ransom note | Impact | T1486 |

### 9. Investigation Checklist

- [ ] Alert confirmed as true positive (severity validated)
- [ ] Process tree fully mapped (grandparent through descendants)
- [ ] File/registry timeline reconstructed
- [ ] Memory analysis performed (samples collected)
- [ ] Network connections reviewed (beaconing, C2)
- [ ] Persistence mechanisms identified and removed
- [ ] All affected endpoints identified and isolated
- [ ] Indicators of compromise extracted (hashes, IPs, domains)
- [ ] MITRE ATT&CK mapping completed
- [ ] Root cause determined
- [ ] Remediation steps documented and executed

### 10. Forensic Artifact Collection Order

Preserve evidence by collection priority:

1. **Volatile data** (memory dump, process list, network connections)
2. **System state** (registry hives, event logs, prefetch files)
3. **Persistent data** (file system, alternate data streams, $MFT)
4. **Application data** (browser history, email, office documents)
5. **Network artifacts** (pcap, netflow, DNS logs)
6. **Cloud/remote data** (CASB logs, identity provider logs)
