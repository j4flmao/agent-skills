# Threat Intelligence Sharing

## Traffic Light Protocol (TLP)

| Color | Description | Distribution |
|-------|-------------|--------------|
| RED | Confidential — direct recipients only | In-person meeting or encrypted channel, no forwarding |
| AMBER | Limited distribution — recipient's organization | Share within organization with need-to-know |
| AMBER+STRICT | Limited — specific team only | Restricted to specific team within org |
| GREEN | Community-wide sharing | Share within your community or sector |
| CLEAR | Public — no restrictions | Unlimited distribution, may be published publicly |

### TLP Implementation
- Mark all shared intelligence with TLP classification
- Apply TLP at event, indicator, and report level
- Enforce TLP restrictions in sharing platforms (MISP, TIP)
- Audit compliance with TLP handling rules
- Train analysts on TLP handling requirements

## MISP Communities

### Major MISP Communities
| Community | Focus | Membership |
|-----------|-------|------------|
| CIRCL MISP | General threat intel, malware | Open to CSIRTs, organizations |
| NATO MISP | Defense, military threats | NATO members and partners |
| FIRST MISP | CSIRT collaboration | FIRST members |
| FS-ISAC | Financial services sector | Financial sector organizations |
| NH-ISAC | Healthcare sector | Healthcare organizations |
| EINSTEIN | US government | US federal agencies |
| National CERTs | Country-specific | Per national CERT |
| Vendor-specific | Microsoft, Cisco, etc. | Product customers |

### Community Participation
- Join relevant ISACs and MISP communities for your sector
- Contribute intelligence (don't just consume — give back)
- Establish bilateral sharing agreements with peer organizations
- Participate in industry threat intelligence working groups
- Maintain regular communication with community administrators

## ISACs (Information Sharing and Analysis Centers)

| Sector | ISAC | Key Focus |
|--------|------|-----------|
| Financial | FS-ISAC | Payment fraud, cyber heists, ATM attacks |
| Healthcare | Health-ISAC | Ransomware, medical device vulnerabilities |
| Energy | E-ISAC | Grid security, ICS/SCADA threats |
| Aviation | Aviation-ISAC | Airline systems, airport security |
| Retail | Retail-ISAC | POS malware, payment card data |
| Automotive | Auto-ISAC | Connected vehicle threats |
| Government | MS-ISAC | State/local government threats |
| Elections | EI-ISAC | Election infrastructure security |

### ISAC Benefits
- Sector-specific threat intelligence and analysis
- Early warning of emerging threats targeting your industry
- Anonymized incident data for trend analysis
- Peer network for crisis response coordination
- Regulatory compliance support (showing due diligence)
- Tabletop exercises and joint incident response drills

## STIX 2.1

### Core STIX Objects
| Object Type | Purpose | Key Properties |
|-------------|---------|----------------|
| Indicator | IoC pattern for detection | pattern, pattern_type, valid_from |
| Observable | Individual cyber observable | IP, domain, file hash, URL |
| Attack Pattern | TTP describing attack | name, description, kill_chain_phases |
| Campaign | Series of attacks with purpose | name, objective, first_seen |
| Threat Actor | Adversary profile | name, aliases, sophistication |
| Intrusion Set | Grouped TTPs and infrastructure | name, description, aliases |
| Malware | Malicious software | name, malware_types, is_family |
| Course of Action | Mitigation or response | name, description, action |
| Relationship | Links between STIX objects | source_ref, target_ref, relationship_type |

### STIX Relationship Types
```
indicator → based-on → observable
indicator → indicates → attack-pattern
attack-pattern → targets → identity (sector)
threat-actor → uses → malware
threat-actor → attributed-to → intrusion-set
intrusion-set → uses → attack-pattern
campaign → attributed-to → threat-actor
malware → variant-of → malware
course-of-action → mitigates → attack-pattern
```

### STIX Bundle Example
```json
{
  "type": "bundle",
  "id": "bundle--12345678-90ab-cdef-1234-567890abcdef",
  "objects": [
    {
      "type": "indicator",
      "id": "indicator--aaaa-bbbb-cccc",
      "name": "Suspicious IP",
      "pattern": "[ipv4-addr:value = '5.6.7.8']",
      "pattern_type": "stix",
      "valid_from": "2026-05-01T00:00:00Z"
    },
    {
      "type": "relationship",
      "id": "relationship--xxxx-yyyy-zzzz",
      "relationship_type": "indicates",
      "source_ref": "indicator--aaaa-bbbb-cccc",
      "target_ref": "attack-pattern--1111-2222-3333"
    }
  ]
}
```

## TAXII 2.1

### TAXII Architecture
```
TAXII Server
├── API Root (https://taxii.example.com/taxii2/)
│   ├── Discovery Endpoint → List API Roots
│   ├── Collection A (APT Threat Intel)
│   │   ├── Manifest → Object metadata
│   │   └── Objects → Full STIX bundle
│   ├── Collection B (Phishing Indicators)
│   └── Collection C (Vulnerability Intelligence)
└── Status → Request status tracking
```

### TAXII Polling
| Polling Mode | Description | Use Case |
|-------------|-------------|----------|
| Snapshot | Get all objects in collection | Initial sync |
| Delta since | Get objects added since timestamp | Periodic updates |
| Delta by ID | Get objects after specific manifest ID | Resume interrupted sync |
| Filtered | Get objects matching query parameters | Targeted collection |

### TAXII Automation
```python
from taxii2client.v21 import Server

server = Server(
    "https://taxii.example.com/taxii2/",
    user="api_user",
    password="api_key"
)

api_root = server.api_roots[0]
collection = api_root.collections[0]

# Poll for new indicators
for manifest in collection.get_manifest():
    if manifest.date_added > last_poll_time:
        bundle = collection.get_object(manifest.id)
        process_stix_bundle(bundle)
```

## Sharing Best Practices

### Data Quality
- Remove PII before sharing (sanitize logs, emails, usernames)
- Validate indicators before publishing (test for false positives)
- Provide context for each indicator (source, confidence, use case)
- Set appropriate TLP classification
- Include MITRE ATT&CK mappings for context
- Provide attribution source and methodology

### Sharing Frequency
| Intelligence Type | Update Frequency | Rationale |
|------------------|-----------------|-----------|
| IP blocklists | Real-time / hourly | Dynamic infrastructure changes quickly |
| Malware hashes | As discovered | Stays valid until file is modified |
| Phishing domains | 2-4 hours | Takedown-dependent |
| YARA rules | Weekly / per campaign | Evolves with malware variants |
| TTP analysis | Per campaign / weekly | Slow-changing, analysis-driven |
| Strategic reports | Quarterly | Trend analysis, not time-sensitive |

### Automated Sharing Rules
```yaml
sharing_rules:
  - source: internal_malware_analysis
    target: misp_community_financial
    conditions:
      - confidence >= 70
      - tlp in [GREEN, CLEAR]
      - has_mitre_mapping: true
    actions:
      - push_to: misp
        collection: fs_isac_feeds
  - source: osint_collector
    target: siem_correlation
    conditions:
      - confidence >= 50
      - ioc_age < 24h
    actions:
      - push_to: siem
        rule_set: threat_intel_feeds
```

## Classification and Handling

### Handling Caveats
| Caveat | Meaning | Guidance |
|--------|---------|----------|
| NOFORN | Not releasable to foreign nationals | Restrict to your country's nationals |
| FVEY | Five Eyes only | Share only with Five Eyes nations |
| PROPIN | Proprietary information | Contains company trade secrets |
| ORCON | Originator controlled | Originator controls further dissemination |
| REL TO | Releasable to specific entities | Only share with named entities |

### Information Sharing Agreements
- Establish legal framework (NDA, MOU, ISA) before sharing
- Define liability and indemnification terms
- Specify data handling, retention, and destruction policies
- Document breach notification obligations
- Review agreements annually or per regulation changes
- Ensure compliance with GDPR, CCPA, and sector-specific regs

## Measuring Sharing Impact
| Metric | Description | Target |
|--------|-------------|--------|
| Indicators shared/month | Volume contributed | > 100 |
| Indicators received/month | Volume consumed | Varies |
| IoC hit rate in SIEM | % of indicators triggered | > 5% |
| False positive rate from shared intel | FP % from external intel | < 20% |
| Community reputation | Feedback from sharing partners | Positive |
| New detection rules from intel | Rules created from shared data | > 2/month |
