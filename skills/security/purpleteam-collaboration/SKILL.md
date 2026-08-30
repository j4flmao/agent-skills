# Purple Team Collaboration

> [!WARNING]
> **DISCLAIMER: EDUCATIONAL & DEFENSIVE PURPOSES ONLY**
> Purple teaming focuses on continuous improvement by combining offensive simulation with defensive tuning.

## 1. Skill Context
**Focus**: Adversary emulation plans, continuous security validation, assumed breach scenarios.
**Triggers**: purple team exercise, adversary emulation, security validation, red vs blue

## 2. Execution Framework
Purple Teaming is not a single event but a continuous feedback loop. The agent helps orchestrate this collaboration.

### Emulation Plans
- **Threat Intelligence Driven**: Selecting a specific threat actor (e.g., APT29) and extracting their TTPs from CTI reports (Cyber Threat Intelligence).
- **Execution**: The Red Team executes a specific TTP (e.g., dumping LSASS). 
- **Validation**: The Blue Team immediately checks if the SIEM/EDR generated an alert.

### The Feedback Loop
- **If Detected**: Blue team explains *how* they detected it. Red team attempts to modify the technique (e.g., obfuscation, different API calls) to bypass the detection.
- **If Not Detected**: Red team explains the exact methodology. Blue team writes a new detection rule (e.g., creating a Sigma rule) and validates it against the previous attack data.

### Metrics & Tracking
- Tracking detection coverage using tools like VECTR or MITRE ATT&CK Navigator.
- Categorizing outcomes: Logged vs. Detected vs. Blocked.

## 3. Output Format
- Provide an Advesary Emulation plan mapped to MITRE ATT&CK tactics.
- Include columns/sections for Red Team Execution steps and Blue Team Expected Telemetry.
- Emphasize communication and capability improvement over "winning".
