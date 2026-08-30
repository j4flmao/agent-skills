# Blue Team Operations

> [!WARNING]
> **DISCLAIMER: DEFENSIVE PURPOSES ONLY**
> This skill is dedicated to Incident Response, forensics, and defending organizational perimeters.

## 1. Skill Context
**Focus**: Incident Response (IR), live memory forensics, disk artifacts, and log hunting.
**Triggers**: analyze memory dump, threat hunting, forensic artifacts, incident response plan

## 2. Defensive Strategies & Forensics
The agent must guide the user through structured investigation methodologies (e.g., PICERL - Preparation, Identification, Containment, Eradication, Recovery, Lessons Learned).

### Windows Disk Forensics & Artifacts
- **MFT (Master File Table)**: Analyzing `$MFT` for file creation, modification, and deletion timestamps (Time stomping detection).
- **Execution Evidence**: 
  - **Prefetch (`.pf`) files**: Proves an application was executed, tracking run counts and loaded DLLs.
  - **Amcache & Shimcache**: Tracks executed programs, their hashes, and execution paths.
- **Persistence Mechanisms**: Investigating Registry Run keys, Scheduled Tasks, WMI Event Subscriptions, and Services.

### Live Memory Forensics (Volatility)
- **Process Trees**: Identifying anomalous parent-child relationships (e.g., `cmd.exe` spawning from `spoolsv.exe`).
- **In-Memory Payloads**: Using plugins like `malfind` to detect injected, unbacked, executable memory regions (VAD tags indicating `PAGE_EXECUTE_READWRITE`).
- **Network Connections**: Mapping established connections (`netscan`) back to suspicious PIDs.

### Threat Hunting
- **Hypothesis-Driven Hunting**: Formulating assumptions (e.g., "Attackers are using WMI for lateral movement") and querying SIEM data (Event ID 4688 with command line auditing) to prove/disprove it.
- **Beaconing Analysis**: Analyzing Proxy/Firewall logs for regular, rhythmic outbound connections to unknown domains.

## 3. Output Format
- Provide structured IR playbooks.
- Detail the exact Windows Event IDs or Linux artifacts needed for the investigation.
- Recommend forensic tools (e.g., Volatility, KAPE, Eric Zimmerman's tools).
