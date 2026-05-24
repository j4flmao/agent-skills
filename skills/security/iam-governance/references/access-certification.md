# Access Certification

## Overview

Access certification (also called access review or recertification) is the process of periodically verifying that users have appropriate access rights. It ensures compliance with regulations (SOX, SOC 2, PCI DSS, HIPAA) and reduces risk from excessive permissions.

## Certification Campaign Management

### Campaign Types
```yaml
campaign_types:
  manager_attestation:
    description: "Managers review their direct reports' access"
    frequency: Quarterly
    scope: All users in manager's org hierarchy
    effort: High (manager involvement)
    best_for: "User-to-application access"

  role_based_certification:
    description: "Access owners review role memberships"
    frequency: Annual
    scope: All role assignments
    effort: Medium
    best_for: "Directory groups and application roles"

  entitlement_certification:
    description: "Application owners review who has access"
    frequency: Semi-annual
    scope: All application entitlements
    effort: Medium-High
    best_for: "SaaS applications, custom apps"

  risk_based_certification:
    description: "High-risk access reviewed more frequently"
    frequency: Monthly/Quarterly for high risk
    scope: Tiered by risk score
    effort: Low (automated risk scoring)
    best_for: "Privileged access, sensitive data access"

  continuous_certification:
    description: "Real-time access verification triggers"
    frequency: Continuous
    scope: Changes trigger review
    effort: Low (automated)
    best_for: "Dynamic environments, cloud IAM"
```

### Campaign Lifecycle
```yaml
campaign_lifecycle:
  planning:
    - "Define campaign scope (users, apps, groups)"
    - "Set review frequency and deadlines"
    - "Assign reviewers (managers, app owners, data owners)"
    - "Configure risk scoring rules"
    - "Define escalation paths for non-responsive reviewers"

  preparation:
    - "Extract current access data from IdP and apps"
    - "Build review packages per reviewer"
    - "Apply risk scores to each access item"
    - "Generate certification reports and dashboards"
    - "Send preview to stakeholders"

  execution:
    - "Send notification to reviewers"
    - "Reviewers: Approve / Revoke / Don't Know"
    - "Track progress: % complete, overdue items"
    - "Auto-escalate after 7 days without action"
    - "Provide reviewer support (chat/email/training)"

  remediation:
    - "Auto-revoke access marked for removal"
    - "Apply changes during maintenance window"
    - "Notify affected users of access changes"
    - "Handle appeals (user disputes revocation)"
    - "Log all remediation actions for audit"

  reporting:
    - "Campaign completion report"
    - "Risk reduction metrics"
    - "Non-compliant items and exceptions"
    - "Reviewer performance metrics"
    - "Evidence package for auditors"
```

### Certification Campaign Configuration
```json
{
  "campaign": {
    "name": "Q2 2026 Manager Access Certification",
    "type": "manager_attestation",
    "scope": {
      "applications": ["all_entra_id_apps", "salesforce", "workday"],
      "users": "active_employees",
      "exclude": ["service_accounts", "break_glass_accounts"]
    },
    "reviewers": "manager",
    "review_period": {
      "start": "2026-04-01",
      "end": "2026-04-21",
      "reminders": [7, 3, 1]
    },
    "risk_scoring": {
      "high_risk_roles": ["Global Administrator", "Domain Admin"],
      "high_risk_apps": ["financial_systems", "hr_systems"],
      "days_since_last_review_weight": 0.3,
      "permission_count_weight": 0.2,
      "role_sensitivity_weight": 0.5
    },
    "escalation": {
      "first_escalation": {"after_days": 7, "to": "manager's_manager"},
      "second_escalation": {"after_days": 14, "to": "compliance_team"}
    },
    "auto_remediate": {
      "after_campaign_end": true,
      "revoke_unreviewed": false,
      "revoke_denied": true
    }
  }
}
```

## Manager Attestation

### Attestation Email Template
```
Subject: Action Required: Access Certification for Your Team — Q2 2026

Dear [Manager Name],

You have been assigned as the access reviewer for [N] team members.

Please review the access packages linked below and certify that each
team member's access is appropriate for their role.

Review Deadline: [Date]

Review Link: [URL]

By certifying, you confirm:
1. All listed users currently report to you (or have left the team)
2. Their application access is appropriate for their job function
3. Any access that should be removed is marked for revocation

If you have questions, contact: access-certification@example.com

Thank you,
Identity Governance Team
```

### Attestation Decision Options
```yaml
decision_options:
  certify:
    action: "Approve all access"
    meaning: "Manager confirms access is appropriate"

  revoke:
    action: "Mark for removal"
    risks:
      - "User no longer needs this application"
      - "User transferred to different role"
      - "User's permissions exceed requirements"

  certify_with_exception:
    action: "Approve with comment"
    usage: "Some access is borderline but needed temporarily"
    exception_expiry: "90 days (requires re-certification)"

  don't_know:
    action: "Escalate to next reviewer level"
    usage: "Manager unsure about access needs"
    escalation: "Sent to application owner or security team"
```

## Automated Remediation

### Post-Campaign Auto-Remediation
```python
import requests
from datetime import datetime, timedelta

class CertificationRemediation:
    def __init__(self, idp_client, ticketing_client):
        self.idp = idp_client
        self.tickets = ticketing_client
    
    def process_campaign_results(self, campaign_id):
        # Get all items marked for revocation
        revocations = self.get_revocation_items(campaign_id)
        
        for item in revocations:
            if self.can_auto_remediate(item):
                self.remediate(item)
            else:
                self.create_ticket(item)
    
    def can_auto_remediate(self, item):
        # Auto-remediate if:
        # 1. User is terminated (already in HRIS)
        # 2. Access is non-privileged
        # 3. Manager explicitly chose "Revoke"
        return (
            item["risk_level"] != "critical" and
            item["decision"] == "revoke" and
            self.is_user_terminated(item["user_id"])
        )
    
    def remediate(self, item):
        # Remove group membership in IdP
        self.idp.remove_group_member(
            group_id=item["group_id"],
            user_id=item["user_id"]
        )
        
        # Log remediation
        self.audit_log(
            action="access_revoked",
            user=item["user_id"],
            resource=item["group_id"],
            source="access_certification",
            campaign=item["campaign_id"]
        )
    
    def create_ticket(self, item):
        ticket = self.tickets.create_ticket(
            summary=f"Access Remediation: Remove {item['user']} from {item['group']}",
            description=(
                f"Access certification campaign {item['campaign_id']} "
                f"identified this access as needing removal.\n\n"
                f"User: {item['user']} ({item['user_email']})\n"
                f"Access: {item['group']}\n"
                f"Reviewer: {item['reviewer']}\n"
                f"Decision: {item['decision']}\n"
                f"Risk Level: {item['risk_level']}"
            ),
            priority="medium" if item["risk_level"] == "medium" else "low",
            assignee=self.get_access_owner(item["resource_id"])
        )
        
        return ticket["id"]
```

## Risk-Based Certification

### Risk Scoring Model
```python
def calculate_access_risk(user, entitlement):
    score = 0
    
    # Role sensitivity
    role_weights = {
        "Global Administrator": 100,
        "Domain Admin": 90,
        "Application Admin": 70,
        "User": 10
    }
    score += role_weights.get(entitlement["role"], 10)
    
    # Days since last review
    days_since_review = (datetime.now() - entitlement["last_reviewed"]).days
    if days_since_review > 365:
        score += 30
    elif days_since_review > 180:
        score += 15
    
    # Number of direct reports (managers = better oversight)
    if entitlement["reviewer_type"] == "manager":
        score -= 5  # Manager review is more reliable
    
    # Resource sensitivity
    if entitlement["contains_pii"]:
        score += 20
    if entitlement["contains_financial_data"]:
        score += 20
    if entitlement["contains_phi"]:
        score += 25
    
    # User tenure (newer users = higher risk)
    if user["tenure_days"] < 30:
        score += 20
    elif user["tenure_days"] < 90:
        score += 10
    
    return min(score, 100)
```

### Risk-Based Review Frequency
```yaml
review_frequency:
  by_risk_score:
    - score: "80-100 (Critical)"
      frequency: Monthly
      reviewer: Security Team
      auto_remediate: false

    - score: "60-79 (High)"
      frequency: Quarterly
      reviewer: Manager + Security
      auto_remediate: manager_approval

    - score: "30-59 (Medium)"
      frequency: Semi-annual
      reviewer: Manager
      auto_remediate: true

    - score: "0-29 (Low)"
      frequency: Annual
      reviewer: Auto-certify with sampling
      auto_remediate: true
```

## Compliance Mapping

```yaml
compliance_mappings:
  soc2_cc6_2:
    description: "Access rights are reviewed at regular intervals"
    implementation: "Quarterly access certification campaigns with manager attestation"
    evidence: "Campaign reports, reviewer decisions, remediation logs"

  sox_404:
    description: "Access to financial systems is reviewed"
    implementation: "Semi-annual SOX-specific campaigns for ERP systems"
    evidence: "SOX campaign reports, change logs, access owner sign-off"

  pci_dss_7_2_1:
    description: "Access is reviewed at least every 6 months"
    implementation: "Biannual certification for CDE systems"
    evidence: "Cashletter system access reports, reviewer attestations"

  hipaa_164_308_a_1_ii_b:
    description: "Access authorization is reviewed"
    implementation: "Quarterly certification for systems with ePHI"
    evidence: "ePHI system access reviews, contractor access reviews"
```

## Metrics and Reporting

| Metric | Target | Calculation |
|--------|--------|-------------|
| Campaign completion rate | > 95% | Reviews completed / Total reviews |
| On-time completion rate | > 90% | Reviews completed by deadline |
| Revocation rate | 5-15% | Access items revoked / Total items |
| Reviewer accuracy | > 95% | Items correctly classified |
| Risk score reduction | 10% per cycle | Avg risk score before - after |
| Days to remediate | < 7 days | Time from campaign end to revocation |
| Reviewer satisfaction | > 80% | Survey responses |
