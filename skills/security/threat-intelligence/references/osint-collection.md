# OSINT Collection

## Passive Reconnaissance

### Domain and DNS Intelligence
- **WHOIS Lookup**: Registrar, creation date, registrant contact, name servers
  - Tools: whois, WhoisXMLAPI, DomainTools
  - Look for: Privacy shields, recently registered domains, misspelled brands
- **DNS Enumeration**: Subdomain discovery, DNS records (A, MX, CNAME, TXT, NS)
  - Tools: dnsrecon, Sublist3r, Amass, Certificate Transparency logs
  - Look for: Wildcard DNS, DNS Zone Transfer exposure
- **Reverse DNS/PTR**: Identify infrastructure patterns, hosting providers
- **Passive DNS**: Historical DNS resolution data (RiskIQ, PassiveTotal, VirusTotal)
  - Look for: Fast-flux patterns, domain overlap across IPs

### Certificate Transparency
- Monitor crt.sh, Google CT, Facebook CT for issued certificates
- Identify subdomains from SAN/DNSNames in certificates
- Detect suspicious certificates targeting your organization
- Tools: certspotter, crtsh CLI, custom CT log monitoring

### Email and Account Intelligence
- **Email OSINT**: Verify email existence, breach exposure
  - Tools: Hunter.io, HaveIBeenPwned, DeHashed
  - Look for: Email format convention, exposed credentials
- **Social Media**: LinkedIn (employee structure), Twitter (breach announcements), GitHub (code leaks)
- **Paste Sites**: Monitor Pastebin, Ghostbin, Rentry for credential dumps
  - Tools: PasteHunter, custom scrapers, Google dorking

## Threat Actor Tracking

### Actor Identification
| Indicator | Source | Relevance |
|-----------|--------|-----------|
| TTP patterns | MITRE ATT&CK, incident reports | High — unique behaviors |
| Tool signatures | Malware configs, C2 frameworks | Medium — can be reused |
| Infrastructure | IPs, domains, hosting providers | Low — easily changed |
| Linguistic analysis | Communication style, language choice | Medium — attribution support |
| Targeting | Industry, geography, technology | High — strategic alignment |

### Tracking Methodology
1. Maintain actor profiles with known TTPs, tools, and infrastructure
2. Monitor chatter on forums (Russian/Chinese/English underground)
3. Track infrastructure changes (new domains, IP rotation)
4. Correlate new incidents to known actor patterns
5. Update TTP mappings when new actor behavior is observed

## Dark Web Monitoring

### Access Tiers
| Tier | Description | Access Method |
|------|-------------|---------------|
| Clear Web | Public forums, paste sites, social media | Standard browser |
| Deep Web | Private forums, invite-only Telegram groups | Credentialed access |
| Dark Web | Tor/.onion marketplaces, criminal forums | Tor Browser, authenticated |
| Encrypted | Private chats, Signal/Telegram encrypted groups | Existing membership |

### Monitoring Approach
- Deploy automated scrapers for public dark web marketplaces
- Monitor for: Credential dumps mentioning your domain, stolen data listings, source code leaks, zero-day exploit sales, RaaS (Ransomware-as-a-Service) affiliates
- Establish relationships with threat intel vendors for deep/dark web access
- Track ransomware leak site activity for data exfiltration victims
- Use Telegram monitoring for channel chatter about targeted industries

### Dark Web Data Sources
| Source | Type | Monitored For |
|--------|------|---------------|
| Exploit forums | Hackers, exploit brokers | Zero-days targeting your tech stack |
| Ransomware blogs | Extortion victims | Company name, leaked data |
| Carding shops | Stolen payment data | Corporate credit card data |
| Credential markets | Stolen logins | Corporate credentials |
| DDoS services | Booter/stresser sites | DDoS threats against infrastructure |

## IOC/IOA Collection

### Indicators of Compromise (IoC)
| Type | Examples | Collection |
|------|----------|------------|
| File Hash | MD5, SHA1, SHA256 | Malware sandboxes, intel feeds |
| IP Address | C2 servers, exfiltration endpoints | Network telemetry, sinkholes |
| Domain | Malware C2, phishing pages | DNS analytics, threat feeds |
| URL | Phishing links, malware download URLs | Email security, web proxy |
| Registry Key | Persistence locations | Forensics, sandbox analysis |
| YARA Rule | Malware family patterns | Malware analysis |
| Email | Phishing sender, subject line | Email security gateway |

### Indicators of Attack (IoA)
- Unusual process chain (winword.exe → powershell.exe → wget.exe)
- Abnormal authentication patterns (impossible travel, off-hours access)
- Configuration changes (disabled logging, registry modification)
- Beaconing behavior (regular callouts to unknown IPs)
- Data staging/collection (archive creation in user folders)

## Open-Source Feeds

| Feed | Type | Content | Reliability |
|------|------|---------|-------------|
| AlienVault OTX | Community | IoCs, pulses, TTPs | Medium |
| IBM X-Force Exchange | Community/Commercial | IoCs, vulnerability intel | High |
| MISP | Community | Structured threat data | Varies |
| URLHaus | Community | Malicious URLs | Medium |
| AbuseIPDB | Community | Malicious IPs | Medium |
| PhishTank | Community | Phishing URLs | Low-Medium |
| Tor Exit Nodes | Community | Tor relay IPs | High |
| Spamhaus | Semi-commercial | Bad IPs, domains | High |
| GreyNoise | Community/Commercial | Internet noise, scanner IPs | High |
| Shadowserver | Community | Scan data, honeypot telemetry | High |

## TAXII/STIX Integration

### STIX 2.1 Key Objects
```json
{
  "type": "indicator",
  "spec_version": "2.1",
  "id": "indicator--12345678-90ab-cdef-1234-567890abcdef",
  "name": "Malicious IP - 1.2.3.4",
  "pattern": "[ipv4-addr:value = '1.2.3.4']",
  "pattern_type": "stix",
  "valid_from": "2026-05-20T00:00:00Z",
  "labels": ["malicious-activity"],
  "kill_chain_phases": [{
    "kill_chain_name": "mitre-attack",
    "phase_name": "command-and-control"
  }]
}
```

### TAXII 2.1 API Endpoints
- **Discovery**: `/taxii2/` — API root information and authentication
- **Collections**: `/collections/` — Available threat intel collections
- **Manifest**: `/collections/{id}/manifest/` — Object metadata
- **Objects**: `/collections/{id}/objects/` — STIX objects

### Collection Workflow
1. Connect to TAXII server (discovery → authenticate)
2. List available collections
3. Subscribe to relevant collections (based on sector, threat type)
4. Poll for new objects periodically (every 1-60 min based on urgency)
5. Parse STIX objects into normalized format
6. Deploy to detection tools (SIEM, firewall, EDR)

### Integration Example
```python
import stix2
from taxii2client.v20 import Collection

# Connect to TAXII server
collection = Collection(
    "https://taxii.example.com/collections/1234",
    user="api_user",
    password="api_key"
)

# Poll for new indicators
for bundle in collection.get_objects():
    for obj in bundle.objects:
        if obj.type == "indicator":
            ip = extract_pattern(obj.pattern)
            score = confidence_scoring(obj)
            if score > 50:
                # Push to firewall blocklist
                push_to_blocklist(ip, obj.name, score)
```

## Collection Best Practices
- Automate feed collection with deduplication and staleness checks
- Implement feed quality scoring (reliability × relevance)
- Set collection frequency based on intelligence tier (strategic: daily, tactical: hourly)
- Maintain feed source diversity to avoid blind spots
- Document collection T&C and licensing for each source
- Never expose automated collection methods to adversaries
