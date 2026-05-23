# EDR/XDR Platform Comparison

| Feature | CrowdStrike Falcon | Microsoft Defender | SentinelOne | Carbon Black |
|---------|-------------------|-------------------|-------------|-------------|
| Deployment | Cloud | Cloud + On-prem | Cloud | On-prem + Cloud |
| OS Support | Win/Mac/Linux | Win/Mac/Linux | Win/Mac/Linux | Win/Mac/Linux |
| ML Detection | ✅ | ✅ | ✅ | ✅ |
| Ransomware Rollback | ❌ | ✅ | ✅ | ❌ |
| EDR | ✅ | ✅ | ✅ | ✅ |
| XDR | ✅ | ✅ | ✅ | ❌ |
| Threat Intel | ✅ (Paid) | ✅ (M365) | ✅ | ✅ |
| API | ✅ REST | ✅ Graph | ✅ REST | ✅ REST |
| Cost/Endpoint | $$$ | $$ (E5) | $$$ | $$$ |

## Key EDR Capabilities
- **Process Tree**: Full process ancestry and child processes
- **File Operations**: Create, modify, delete with hash tracking
- **Network Connections**: IP/port/process/SSL certificate
- **Registry Changes**: Key creation, modification, deletion
- **Scheduled Tasks**: Task creation, trigger, action
- **Persistence**: Service/startup/autorun modifications
- **Memory Scanning**: In-memory malware detection
- **Script Execution**: PowerShell, VBScript, JavaScript monitoring
- **USB/Device Control**: Removable media monitoring

## Detection Rule Examples

### Suspicious PowerShell
```
Rule: Suspicious PowerShell -encodedCommand
Severity: Medium
Events:
  - Process.Create | Image: "powershell.exe" | CommandLine contains "-enc", "-encodedCommand"
Logic:
  - Count occurrences within 5 minutes per host > 3
  - Exclude known admin scripts from automation
Response:
  - Investigate process ancestry
  - Review script content (decoded)
```

### Unusual LSASS Access
```
Rule: LSASS Access via Unusual Process
Severity: High
Events:
  - ProcessAccess | TargetImage: "lsass.exe" | SourceImage not in
    {"wmiprvse.exe", "svchost.exe", "taskmgr.exe", C:\Program Files\*}
Logic:
  - Any non-standard process accessing lsass
  - Immediate investigation required
Response:
  - Pull process dump from memory
  - Check for credential theft tools (mimikatz, etc.)
  - Isolate endpoint if confirmed
```
