# Threat Intelligence Platforms

## Platform Comparison

| Feature | MISP | OpenCTI | ThreatConnect | Recorded Future | VirusTotal | AbuseIPDB |
|---------|------|---------|---------------|-----------------|------------|-----------|
| Cost | Free (Open Source) | Free (Open Source) | Commercial | Commercial | Freemium | Free |
| Deployment | Self-hosted | Self-hosted/Cloud | Cloud | Cloud | Cloud | Cloud |
| STIX/TAXII | ✅ Native | ✅ Native | ✅ Native | ✅ Export | ✅ Import | ❌ |
| Automation API | ✅ REST | ✅ GraphQL | ✅ REST | ✅ REST | ✅ REST | ✅ REST |
| Correlation | ✅ Community | ✅ AI-based | ✅ Platform | ✅ AI-based | ✅ File/URL | ❌ |
| Dashboards | Basic | ✅ Advanced | ✅ Advanced | ✅ Advanced | Basic | Basic |
| Sharing | ✅ MISP communities | ✅ Connectors | ✅ Groups/Communities | ❌ Limited | ❌ Limited | ❌ |
| Threat Score | Community weight | Confidence (0-100) | Platform score | Risk score | Detection ratio | Abuse score |
| Intel Types | All STIX objects | All STIX objects | IoCs + TTPs | IoCs + TTPs + Context | Files + URLs + IPs | IP + Domain |
| API Limits | None (self-hosted) | None (self-hosted) | Varies by plan | Varies by plan | 4 req/min (free) | 1000 req/day (free) |

## MISP (Malware Information Sharing Platform)

### Core Features
- Event-based threat data sharing with structured attributes
- Automatic correlation of related indicators across events
- Built-in taxonomies (PAP, TLP, kill chain, ATT&CK)
- Warning lists for known good indicators
- Feed system for external data ingestion
- Sighting mechanism for indicator feedback

### MISP Object Templates
| Object | Description | Example Attributes |
|--------|-------------|-------------------|
| File | Malware file details | hash, filename, size, MIME type |
| Network | Network indicators | IP, domain, URL, port, protocol |
| Email | Phishing email | subject, sender, attachment, headers |
| Threat Actor | Actor profile | name, aliases, motive, SOP |
| Attack Pattern | TTP description | technique, description, mitigation |
| Vulnerability | CVE details | cve_id, cvss, description, solution |

### MISP Automation
```python
from pymisp import PyMISP

misp = PyMISP("https://misp.local", "api_key", False)

# Create event with IoCs
event = misp.new_event(1, distribution=1, threat_level_id=2,
                       analysis=0, info="Phishing campaign targeting finance")
misp.add_attribute(event, "ip-dst", "5.6.7.8", comment="C2 server")
misp.add_attribute(event, "md5", "d41d8cd98f00b204e9800998ecf8427e")
misp.add_attribute(event, "url", "https://evil.com/payload.exe")

# Publish to community
misp.publish(event)
```

## OpenCTI

### Core Features
- Knowledge graph-based threat modeling
- STIX 2.1 native data model
- Automated ingestion via connectors (MISP, MITRE, feeds)
- Observable enrichment pipeline
- Case management with investigations
- Rules engine for automated analysis

### OpenCTI Connectors
| Connector | Type | Function |
|-----------|------|----------|
| MISP | Import/Export | Sync MISP events to OpenCTI |
| MITRE ATT&CK | Import | Load full ATT&CK matrix |
| AlienVault OTX | Import | Pull OTX pulses |
| VirusTotal | Enrichment | Enrich observables with VT data |
| TheHive | Case Management | Sync investigations |
| Slack/Teams | Notification | Alert on new intel |
| Custom | Any | Build custom Python connectors |

### OpenCTI GraphQL Query
```graphql
{
  indicators(filters: [{key: "pattern_type", values: ["stix"]}]) {
    edges {
      node {
        name
        pattern
        valid_from
        confidence
        killChainPhases { phase_name }
      }
    }
  }
}
```

## ThreatConnect

### Core Features
- Collaborative intelligence platform
- Playbook automation for intel workflows
- Groups and communities for sharing
- Metrics and performance dashboards
- Indicator scoring with custom weights
- Integration marketplace

### ThreatConnect Groups
| Group Type | Purpose | Visibility |
|-----------|---------|------------|
| My Organization | Internal threat data | Private |
| Standard Group | Trusted partner sharing | Members only |
| Community | Public threat sharing | Public |
| Source Group | Feed management | Configurable |

## Recorded Future

### Core Features
- AI-powered intelligence collection from open, technical, and dark web sources
- Real-time risk scoring for IoCs
- Intelligence cards with contextual enrichment
- Integration with SIEM, SOAR, firewalls, and EDR
- Threat landscape briefings and analyst reports
- API-first architecture for automation

### API Endpoints
```python
import requests

rf_api = "https://api.recordedfuture.com/v2"
headers = {"X-RFToken": "api_key"}

# Lookup IP
ip = requests.get(f"{rf_api}/ip/1.2.3.4", headers=headers)

# Risk list
risks = requests.get(f"{rf_api}/ip/risklist", headers=headers)

# Intelligence alert search
alerts = requests.get(f"{rf_api}/alert/search",
    params={"categories": "Cyber Attack", "limit": 10},
    headers=headers)
```

## VirusTotal

### Key Capabilities
- File/URL/IP/domain scanning by 70+ AV engines
- File behavior sandbox analysis (Cuckoo, custom)
- Community comments and threat classification
- Graph visualization for threat relationships
- Retrohunt (YARA hunting over historical data)
- Intelligence search with LiveHunt

### VT API Usage
```python
import requests

vt_url = "https://www.virustotal.com/api/v3"
headers = {"x-apikey": "api_key"}

# File hash lookup
resp = requests.get(f"{vt_url}/files/{sha256_hash}", headers=headers)
data = resp.json()
malicious_count = data["data"]["attributes"]["last_analysis_stats"]["malicious"]

# URL submission
resp = requests.post(f"{vt_url}/urls",
    data={"url": "https://suspicious.example.com"},
    headers=headers)
```

## AbuseIPDB

### Key Features
- Community-reported IP abuse database
- Categorization of abuse types (brute force, malware hosting, phishing)
- Confidence scoring based on report frequency and reporter reliability
- Public blacklist for download
- WHOIS and DNS lookup integration

### AbuseIPDB API
```python
import requests

api = "https://api.abuseipdb.com/api/v2"
headers = {"Key": "api_key", "Accept": "application/json"}

# Check IP
resp = requests.get(f"{api}/check",
    params={"ipAddress": "1.2.3.4", "maxAgeInDays": 90},
    headers=headers)

# Report IP
resp = requests.post(f"{api}/report",
    data={
        "ip": "1.2.3.4",
        "categories": ["14", "21"],  # Brute Force, Malware
        "comment": "SSH brute force detected from this IP"
    },
    headers=headers)
```

## Platform Integration Strategy

### Integration Architecture
```
Sources (Feeds, Community, Internal) → TIP (MISP/OpenCTI) → SIEM → SOAR → Response
                                              │
                                              ↓
                                        EDR/Firewall/DNS → Blocking
```

### Automation Workflow
1. **Ingestion**: TIP collects from MISP communities, OSINT feeds, vendor intel
2. **Normalization**: Convert to STIX 2.1 format
3. **Enrichment**: Cross-reference across platforms (VT + AbuseIPDB + RF)
4. **Scoring**: Calculate confidence based on source reliability + cross-validation
5. **Distribution**: Publish qualified intel to SIEM correlation rules, firewall blocklists, EDR IoC feeds
6. **Feedback**: Collect sighting data from detection tools → update confidence scores

## Platform Selection Criteria
| Criteria | Weight | Notes |
|----------|--------|-------|
| Data model flexibility | High | STIX 2.1 support essential |
| Automation capabilities | High | API-first design, webhook triggers |
| Sharing compatibility | High | MISP/TAXII connectivity |
| Integration depth | Medium | Pre-built connectors to SIEM, SOAR, EDR |
| Cost | Varies | Open source vs commercial licensing |
| Scale | Medium | Handle 10K-1M+ indicators daily |
| UI/UX | Low | Analyst adoption considerations |
