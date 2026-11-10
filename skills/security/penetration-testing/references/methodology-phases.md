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

## Phases 3–6: Exploitation, Privilege, Lateral Movement, Data Access (Process Only)

These phases run only inside a signed scope, with a named client contact and an emergency stop. This reference lists objectives, evidence and remediation themes; it intentionally contains no exploitation, credential, lateral-movement or exfiltration commands.

| Phase | Objective | Acceptable evidence | Typical remediation |
|-------|-----------|---------------------|---------------------|
| 3. Initial access | Show that an identified vulnerability is exploitable | Minimal proof: version banner, harmless marker read, screenshot of access level | Patch or upgrade, input validation, WAF rule as a stopgap, MFA on exposed logins |
| 4. Privilege escalation | Show that a foothold can gain higher privileges | The misconfiguration itself (writable service path, sudo rule, missing patch) and the privilege it would grant | Least privilege, remove dangerous sudo/service permissions, patch kernels and OS, application allow-listing |
| 5. Lateral movement | Show which other systems are reachable with the access obtained | Network reachability and credential-reuse findings, not actual hopping across the estate | Segmentation, unique local admin passwords (LAPS), restrict remote admin protocols, privileged access workstations |
| 6. Data access | Show that sensitive data *could* be read | Count and classification of reachable records, never a copy of real data | Encryption at rest, access reviews, DLP, egress filtering and monitoring |

### Rules for these phases

- Stop at proof of impact; escalate further only with written client approval.
- Do not leave persistence, accounts or tools behind; log anything temporary and remove it before the window closes.
- Log every action (time, target, technique, ATT&CK ID) so defenders can match it to their telemetry and tune detections.
- Treat captured evidence as confidential: encrypt it, limit access, and delete it on the agreed date.

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
