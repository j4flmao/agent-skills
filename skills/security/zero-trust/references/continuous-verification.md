# Continuous Verification

## Overview

Continuous verification ensures that access decisions are re-evaluated throughout a session — not just at login. It combines user behavior analytics, risk scoring, conditional access, device trust monitoring, and automated response into a real-time security feedback loop.

## UBA (User Behavior Analytics)

### Behavioral Baselines
Establish baselines for:
- Login times and geographic locations
- Resources accessed and access patterns
- Data volume transferred (upload/download)
- API call frequency and endpoints
- Admin actions and privilege usage
- Peer group comparison (same role/department)

### Anomaly Detection Methods

**Statistical Analysis:**
```python
# Example: Time-based anomaly detection
from scipy import stats
import numpy as np

def detect_time_anomaly(login_hour, user_median_hour, threshold=3):
    zscore = abs(login_hour - user_median_hour) / user_std_hour
    return zscore > threshold

def detect_volume_spike(bytes_downloaded, user_daily_avg, threshold_multiplier=5):
    return bytes_downloaded > (user_daily_avg * threshold_multiplier)
```

**Machine Learning Models:**
- **Isolation Forest** — Unsupervised anomaly detection for access patterns
- **LSTM Networks** — Time-series prediction for user behavior sequences
- **XGBoost Classification** — Supervised detection of known attack patterns
- **Autoencoders** — Reconstruction error for novel anomaly detection

### Alert Thresholds
| Anomaly Type | Severity | Action |
|-------------|----------|--------|
| Impossible travel (< 1hr between far locations) | Critical | Block access, alert SOC |
| Unusual login time (3+ std from baseline) | Medium | Step-up MFA |
| Mass download (10x normal volume) | Critical | Block, isolate, alert |
| New device/location | Low | Notify user, log |
| Privilege escalation attempt | High | Block if unauthorized |
| Lateral movement detected | Critical | Block, terminate sessions |

## Risk Scoring

### Real-Time Risk Calculation
```python
# Risk scoring engine
RISK_WEIGHTS = {
    "device_not_managed": 30,
    "unknown_location": 20,
    "off_hours_access": 15,
    "sensitive_resource": 25,
    "new_device": 10,
    "weak_authentication": 20,
    "recent_failed_logins": 25,
    "vpn_from_high_risk_country": 40,
    "behavioral_anomaly": 35,
    "outdated_os": 15,
    "disabled_edr": 50
}

def calculate_session_risk(context):
    risk_score = 0
    signals = []

    if not context["device_managed"]:
        risk_score += RISK_WEIGHTS["device_not_managed"]
        signals.append("unmanaged_device")

    if context["location_risk"] > 0.7:
        risk_score += RISK_WEIGHTS["unknown_location"]
        signals.append("high_risk_location")

    if context["hour"] not in context["user_working_hours"]:
        risk_score += RISK_WEIGHTS["off_hours_access"]
        signals.append("off_hours")

    if context["behavioral_anomaly_score"] > 0.8:
        risk_score += RISK_WEIGHTS["behavioral_anomaly"]
        signals.append("behavioral_anomaly")

    return min(risk_score, 100), signals
```

### Risk-Based Access Policy
```yaml
access_policies:
  - risk_range: [0, 20]
    action: allow
    session_duration: 8h

  - risk_range: [21, 50]
    action: step_up_mfa
    session_duration: 4h
    session_constraints:
      download_limit: 100MB
      copy_paste: disabled

  - risk_range: [51, 75]
    action: require_approval
    session_duration: 1h
    session_constraints:
      read_only: true
      screenshots: blocked

  - risk_range: [76, 100]
    action: block
    response: alert_soc
    logging: full_session_record
```

## Conditional Access (Azure AD / Entra ID)

### Policy Configuration
```json
{
  "displayName": "Block legacy authentication + Require MFA for admins",
  "conditions": {
    "applications": {
      "includeApplications": ["All"]
    },
    "users": {
      "includeRoles": [
        "Global Administrator",
        "Security Administrator",
        "Exchange Administrator"
      ]
    },
    "clientAppTypes": ["exchangeActiveSync", "otherClients"],
    "locations": {
      "includeLocations": ["All"],
      "excludeLocations": ["Trusted IPs"]
    }
  },
  "grantControls": {
    "builtInControls": [
      "mfa",
      "compliantDevice"
    ],
    "termsOfUse": ["terms-of-use-v1"]
  },
  "sessionControls": {
    "signInFrequency": {
      "value": 4,
      "type": "hours"
    },
    "applicationEnforcedRestrictions": {
      "isEnabled": true
    },
    "cloudAppSecurity": {
      "cloudAppSecurityType": "monitorOnly"
    }
  }
}
```

### Google Workspace Context-Aware Access
```yaml
access_levels:
  - name: trusted_employee
    conditions:
      - ip_subnet:
          - 203.0.113.0/24
          - 198.51.100.0/24
      - device_policy:
          os_version:
            - android: ">=12"
            - ios: ">=17"
            - windows: ">=10.0.19045"
            - macos: ">=14"
          is_company_owned: true
          is_disk_encrypted: true
      - session_required_mfa: true
```

## Device Trust Monitoring

### Device Health Attestation

**Windows (TPM-based):**
```powershell
# Check device health status
Get-WmiObject -Namespace root\Microsoft\Passport\DeviceHealth -Class DeviceHealthStatus

# Verify TPM presence
Get-Tpm | Select-Object TpmReady, TpmEnabled, TpmActivated

# Check BitLocker status
Get-BitLockerVolume -MountPoint C: | Select-Object VolumeStatus, EncryptionPercentage
```

**macOS:**
```bash
# Check FileVault status
fdesetup status

# Verify SIP
csrutil status

# Check Gatekeeper
spctl --status

# Check XProtect version
system_profiler SPInstallHistoryDataType | grep XProtect
```

**Linux:**
```bash
# Verify disk encryption
sudo cryptsetup status /dev/mapper/root

# Check auditd running
sudo systemctl status auditd

# Verify firewall
sudo ufw status
```

### Device Trust Signals API
```json
{
  "device_id": "device-uuid-1234",
  "device_trust_score": 85,
  "signals": {
    "disk_encrypted": true,
    "firewall_enabled": true,
    "os_patch_level": "2026-05-15",
    "edr_running": true,
    "edr_agent_version": "7.3.1",
    "antimalware_enabled": true,
    "jailbroken": false,
    "screensaver_lock": true,
    "screen_lock_timeout_seconds": 300,
    "browser_version": "Chrome 125.0.6422.76",
    "certificate_valid": true,
    "last_checkin": "2026-05-24T09:15:30Z"
  }
}
```

## Session Monitoring

### Real-Time Session Monitoring
```python
# Session monitoring rules
session_rules = {
    "concurrent_sessions": {
        "max": 3,
        "action": "alert",
        "description": "Multiple concurrent sessions from different IPs"
    },
    "idle_timeout": {
        "max_seconds": 900,
        "action": "terminate",
        "description": "Idle session timeout"
    },
    "download_velocity": {
        "max_bytes_per_second": 104857600,
        "action": "block_download",
        "description": "Abnormal download speed"
    },
    "resource_escalation": {
        "check": "session.access_sensitive != user.typical_access",
        "action": "step_up_auth",
        "description": "Attempting to access unusual sensitive resource"
    }
}
```

## Automated Response

### Response Actions by Severity
```yaml
severity_response:
  critical:
    actions:
      - terminate_session
      - revoke_tokens
      - disable_account
      - isolate_device
      - alert_soc_immediate
      - create_incident_ticket
    channels: [pagerduty, slack-critical, email-ciso]

  high:
    actions:
      - step_up_mfa
      - restrict_to_read_only
      - limit_downloads
      - alert_security_team
      - log_full_session
    channels: [slack-security, email-soc-lead]

  medium:
    actions:
      - log_detailed
      - notify_user
      - require_accept_risk
    channels: [email]

  low:
    actions:
      - log_event
    channels: [siem_feed]
```

### Automated SOAR Playbook Integration
```yaml
playbook:
  name: "High-Risk Access Response"
  trigger:
    event: access.risk_score >= 75
  steps:
    - action: block_ip
      target: firewall
      duration: 1h
    - action: invalidate_sessions
      target: identity_provider
    - action: notify
      target: user
      message: "Your account activity has been restricted due to unusual behavior"
    - action: create_case
      target: servicenow
      priority: P2
    - action: enrich
      target: siem
      data: correlated_events
    - action: check
      condition: user_responds == "I am traveling"
      then:
        - action: whitelist_location
          duration: 7d
        - action: notify_manager
