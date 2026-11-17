# Security Policies for Cost Governance

Cost and security overlap in two directions. First, billing data and purchase rights are sensitive and need least-privilege access. Second, many security incidents surface as cost incidents: leaked credentials used for cryptomining, abused public endpoints, or data exfiltration through egress. This reference defines the guardrails that protect both the bill and the environment.

## Billing Access Control

| Role | Can | Should not |
|------|-----|------------|
| Cost viewer (engineers, team leads) | Read cost reports for their scope | See organization-wide invoices or payment methods |
| FinOps analyst | Read all cost data, manage budgets and anomaly monitors | Purchase commitments without approval |
| FinOps purchaser | Buy Savings Plans / RIs / reservations / CUDs | Change payment methods |
| Billing administrator (finance) | Payment methods, invoices, tax settings | Day-to-day engineering access |

### AWS

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ReadCostData",
      "Effect": "Allow",
      "Action": ["ce:Get*", "ce:Describe*", "ce:List*", "budgets:ViewBudget",
                 "cur:DescribeReportDefinitions", "bcm-data-exports:Get*", "bcm-data-exports:List*"],
      "Resource": "*"
    },
    {
      "Sid": "DenyCommitmentPurchases",
      "Effect": "Deny",
      "Action": ["savingsplans:CreateSavingsPlan", "ec2:PurchaseReservedInstancesOffering",
                 "rds:PurchaseReservedDBInstancesOffering"],
      "Resource": "*"
    }
  ]
}
```

Grant billing console access to IAM principals only after enabling "IAM user and role access to Billing information" in the management account. Restrict the management account itself to billing and organization administration; run no workloads there.

### Azure and GCP

- Azure: assign `Cost Management Reader` at the subscription or management group scope for viewers; `Cost Management Contributor` for budget owners; reservation purchase requires Owner or Reservation Purchaser on the subscription/billing scope.
- GCP: `roles/billing.viewer` for read, `roles/billing.costsManager` for budgets and exports, `roles/billing.admin` restricted to finance. Billing export datasets in BigQuery inherit dataset IAM; restrict `bigquery.dataViewer` on them.

## Preventive Guardrails That Limit Blast Radius

These policies cap what an attacker (or a mistake) can spend:

| Guardrail | Mechanism | Purpose |
|-----------|-----------|---------|
| Deny unused regions | AWS SCP `aws:RequestedRegion`, Azure `Allowed locations`, GCP `gcp.resourceLocations` | Attackers often launch in regions you do not monitor |
| Restrict GPU / large instance families | SCP on `ec2:InstanceType`, Azure allowed SKUs, GCP custom constraints | Cryptomining favors GPU and large CPU instances |
| Service quotas sized to need | Quotas / limits per account | Hard ceiling on instance counts |
| No long-lived access keys | SCP denying `iam:CreateAccessKey` except break-glass, OIDC federation for CI | Leaked keys are the top cause of abuse bills |
| Public endpoint protection | WAF rate limits, API Gateway throttling, CDN in front of origins | Request-priced services can be abused |
| Concurrency limits | Lambda reserved concurrency, max replicas on autoscalers | Stops runaway scaling |

```json
{
  "Sid": "DenyUnapprovedRegions",
  "Effect": "Deny",
  "NotAction": ["iam:*", "organizations:*", "sts:*", "support:*", "budgets:*", "ce:*",
                "cloudfront:*", "route53:*", "waf:*", "health:*"],
  "Resource": "*",
  "Condition": {
    "StringNotEquals": {"aws:RequestedRegion": ["eu-central-1", "eu-west-1"]},
    "ArnNotLike": {"aws:PrincipalARN": "arn:aws:iam::*:role/BreakGlassAdmin"}
  }
}
```

The `NotAction` list exempts global services that are called through `us-east-1`; review it against the services you use before attaching.

## Detection: Cost Signals of Compromise

| Signal | Possible incident |
|--------|-------------------|
| Compute in a region with no workloads | Compromised credentials, cryptomining |
| Sudden GPU instance usage | Cryptomining |
| Egress spike from storage | Data exfiltration or public bucket abuse |
| Request charges spike on object storage or API Gateway | Scraping, DDoS against request-priced endpoints, or SMS/email pumping via your app |
| New IAM users/keys followed by cost increase | Account takeover |

Enable the security services that detect these directly (AWS GuardDuty, Microsoft Defender for Cloud, Security Command Center) and connect cost anomaly alerts to the security on-call path, not only to FinOps.

## Incident Response for Cost Abuse

1. Treat as a security incident; follow the incident response plan.
2. Contain: disable or rotate the compromised credentials; apply a deny-all SCP or policy to the affected account if necessary.
3. Inventory resources created by the attacker (CloudTrail / Activity Log / Audit Logs by principal and time); stop and preserve evidence (snapshots, logs) before deleting.
4. Check for persistence: new IAM users, roles, access keys, Lambda functions, scheduled tasks.
5. Contact the provider's support; providers have processes for reviewing charges from confirmed compromise, but credits are not guaranteed.
6. Post-incident: add the missing guardrail (region deny, key restrictions, alerts).

## Data Protection for Billing Exports

- Billing exports include account IDs, resource names and tags that can reveal internal structure; tags must never contain secrets or personal data.
- Encrypt export buckets/datasets (default encryption plus KMS keys where policy requires); block public access.
- Apply retention matching financial record requirements; restrict delete permissions.
- Sharing with third-party FinOps tools: use read-only, scoped roles (cross-account role with external ID on AWS), review the vendor's data handling, and revoke on contract end.

## Secure Automation

Cost automation (schedulers, cleanup jobs) often has broad permissions.

- Scope roles to tagged resources (`aws:ResourceTag/environment` = `dev`) so a cleanup job cannot touch production.
- Run destructive automation in dry-run mode first and log every action.
- Require approval for deletion outside sandbox accounts.
- Store automation code in version control with review.

```json
{
  "Effect": "Allow",
  "Action": ["ec2:StopInstances", "ec2:StartInstances"],
  "Resource": "arn:aws:ec2:*:*:instance/*",
  "Condition": {"StringEquals": {"aws:ResourceTag/environment": ["dev", "sandbox"]}}
}
```

## Checklist

- [ ] Billing roles separated: viewer, analyst, purchaser, billing admin
- [ ] Commitment purchase rights restricted and audited
- [ ] Region, SKU and quota guardrails in place
- [ ] No long-lived keys; CI uses OIDC federation
- [ ] Cost anomalies route to security on-call for suspicious patterns
- [ ] Billing exports encrypted, private, retention-controlled
- [ ] Cost automation scoped by tags and logged
