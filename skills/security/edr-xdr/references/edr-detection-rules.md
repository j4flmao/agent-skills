# EDR Detection Rule Patterns

## Process-Based Rules

### Untrusted Parent-Child
```
Rule: Untrusted process launched cmd.exe/powershell.exe
Signal: Parent process is non-standard (browser, document viewer, email client)
Response: Review parent, check for phishing/web drive-by
```

### Suspicious Execution Location
```
Rule: EXE launched from AppData/Temp/Downloads
Signal: Process running from user-writable directory without installer pattern
Response: Check source, scan file, review network connections
```

## Network-Based Rules

### Beacon Detection
```
Rule: Regular outbound connections from non-browser process
Signal: Connection interval ±1s variance, periodic, low data per connection
Response: Check C2 indicators, block IP, isolate if confirmed
```

### Unusual Protocol
```
Rule: DNS TXT/AAAA queries from non-browser process
Signal: Excessive DNS queries to domains with high entropy
Response: Investigate process, check for DNS tunneling
```

## File-Based Rules

### Office Document Spawning Child
```
Rule: winword.exe/excel.exe/outlook.exe spawning cmd.exe/powershell.exe
Signal: Office application launching shell
Response: Check for macro/malware, review attachment
```

### Renamed Executable
```
Rule: svchost.exe running from non-system32 path
Signal: Masquerading as system process
Response: Terminate process, scan file, check persistence
```

## Registry-Based Rules

### Boot/Logon Autostart
```
Rule: Run key added for non-installer process
Signal: Registry key Run/RunOnce modified by suspicious process
Response: Revert change, check malware persistence
```

### Service Installation
```
Rule: New service created by non-admin tool
Signal: Service binary path points to non-system32 location
Response: Stop service, remove, scan binary
```

## Memory-Based Rules

### Process Injection
```
Rule: Process opened with PROCESS_ALL_ACCESS by non-standard source
Signal: CreateRemoteThread, WriteProcessMemory detected
Response: Memory dump, process termination, host isolation
```
