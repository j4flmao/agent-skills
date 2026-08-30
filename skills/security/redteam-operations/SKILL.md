# Red Team Operations

> [!WARNING]
> **DISCLAIMER: EDUCATIONAL & DEFENSIVE PURPOSES ONLY**
> This skill and its technical methodologies are strictly for authorized adversary simulation, defensive posture validation, and educational purposes. Do not use for unauthorized access.

## 1. Skill Context
**Focus**: Adversary simulation methodology, OSINT, C2 architecture, and defense evasion (educational).
**Triggers**: simulate attack, red team strategy, bypass edr concept, lateral movement, c2 infrastructure

## 2. Advanced Strategy and Execution
Red Team operations simulate sophisticated adversaries (APTs). The agent must focus on providing architectural and strategic insights into:

### Command & Control (C2) Architecture
- **Redirectors**: Utilizing Nginx/HAProxy reverse proxies with domain fronting or CDN pivoting to mask the true C2 backend (e.g., Cobalt Strike Teamserver, Mythic, Sliver).
- **Malleable C2 Profiles**: Modifying beacon signatures, jitter, HTTP headers, and sleeping patterns to blend in with normal network traffic (e.g., mimicking jQuery or Windows Update).

### Initial Access & Payload Delivery
- **Phishing & Execution**: Macro-enabled Office documents (VBA), HTML Smuggling, and malicious LNK files. 
- **Defense Evasion (In-Memory execution)**:
  - **Process Injection**: Shellcode injection via `VirtualAllocEx`, `WriteProcessMemory`, and `CreateRemoteThread`.
  - **Process Hollowing**: Spawning a legitimate suspended process, unmapping its memory, and replacing it with a malicious payload.
  - **AMSI/ETW Patching**: Hooking and modifying `AmsiScanBuffer` or `EtwEventWrite` in memory to return `AMSI_RESULT_CLEAN`.

### Lateral Movement & Privilege Escalation
- **Living off the Land (LOLBins)**: Using native Windows tools (`wmic`, `powershell`, `certutil`, `rundll32`) to avoid dropping custom binaries.
- **Credential Dumping**: Extracting LSASS memory (via `procdump` or MiniDumpWriteDump), DCSync attacks, and Pass-the-Hash.

## 3. Output Format
- Detail the simulated attack vector step-by-step.
- Explain the underlying API calls or protocols abused.
- **Mandatory**: Conclude with Blue Team detection strategies (e.g., monitoring `CreateRemoteThread` telemetry, hunting for anomalous child processes of `winword.exe`).
