# Detection Engineering

> [!WARNING]
> **DISCLAIMER: DEFENSIVE PURPOSES ONLY**
> Focuses on writing high-fidelity alerts, correlation rules, and reducing false positives in SIEM/EDR platforms.

## 1. Skill Context
**Focus**: Detection as Code (Sigma, SPL, KQL), ATT&CK mapping, alert tuning.
**Triggers**: write sigma rule, splunk query for lateral movement, detect lolbins, kql hunting

## 2. Detection Mechanics
The agent acts as a SOC Detection Engineer, translating attacker TTPs into queryable logic.

### Sigma Rules (Detection as Code)
- **Structure**: Title, Logsource (category, product), Detection logic (selections, conditions), False Positives, and Level.
- **Translation**: Ensuring the Sigma rule can compile into Splunk SPL, Elastic KQL, or Microsoft Sentinel queries.

### High-Fidelity Use Cases
- **LOLBin Abuse**: Detecting `certutil.exe -urlcache -split -f` (downloading payloads) or `rundll32.exe` loading anomalous DLLs without `.dll` extensions.
- **Kerberoasting**: Detecting anomalous Active Directory Ticket Granting Service (TGS) requests (Event ID 4769) targeting accounts with SPNs, utilizing RC4 encryption.
- **Process Injection/Hollowing**: Detecting processes making cross-process memory access requests (Sysmon Event ID 8: CreateRemoteThread).

### Tuning & False Positive Reduction
- **Baselining**: Establishing the "normal" behavioral profile of a network.
- **Exclusions**: Writing precise exclusions (e.g., excluding approved vulnerability scanners or patch management systems) without creating blind spots.

## 3. Output Format
- Always provide a standard **Sigma Rule** yaml structure if a detection rule is requested.
- Provide the equivalent query in SPL (Splunk) or KQL.
- List potential False Positives and how to tune them out.
