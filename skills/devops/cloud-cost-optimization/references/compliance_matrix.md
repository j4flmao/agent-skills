# FinOps Governance and Compliance Matrix

Maps cost-governance requirements to concrete controls in AWS, Azure and GCP, with the evidence an auditor or FinOps lead can check. Use it to turn a cost policy ("every resource is tagged", "no GPU in dev") into enforced, measurable controls. Tagging conventions and budgets are detailed in `cost-allocation.md`.

## Control Types

| Type | Acts | Example |
|------|------|---------|
| Preventive | Before the resource exists | SCP denies large instance types in sandbox accounts |
| Detective | After creation, reports drift | AWS Config rule flags untagged resources |
| Corrective | Fixes or removes drift | Scheduled Lambda stops untagged dev instances |
| Directive | Policy and process | Commitment purchase approval workflow |

Prefer preventive controls for hard limits, detective controls for conventions that need exceptions.

## Control Matrix

| ID | Requirement | AWS | Azure | GCP | Evidence |
|----|-------------|-----|-------|-----|----------|
| FG-01 | Mandatory cost tags/labels on supported resources | Tag Policies (Organizations) + `aws:RequestTag` conditions in SCP; Config `required-tags` | Azure Policy `Require a tag on resources` (deny) and `Inherit a tag from the resource group` (modify) | Org Policy custom constraint on labels; Config Validator / policy-as-code in CI | % of spend tagged, monthly |
| FG-02 | Region restriction | SCP with `aws:RequestedRegion` | Policy `Allowed locations` | Org Policy `gcp.resourceLocations` | Policy assignment, denied-request logs |
| FG-03 | Restrict expensive SKUs in non-prod | SCP on `ec2:InstanceType`, `rds:DatabaseClass` | Policy `Allowed virtual machine size SKUs` | Org Policy custom constraint on machine type | Policy definition, violation report |
| FG-04 | Budgets per account/subscription/project | AWS Budgets | Cost Management budgets | Cloud Billing budgets | Budget list vs account inventory |
| FG-05 | Anomaly detection with owner routing | Cost Anomaly Detection monitors + SNS | Cost anomaly alerts | Billing anomaly detection / budget Pub/Sub | Alert subscriptions, response log |
| FG-06 | Billing data exported and retained | Data Exports (CUR 2.0/FOCUS) to S3 | Scheduled exports to Storage | BigQuery billing export | Export config, retention policy |
| FG-07 | Least-privilege billing access | IAM `ce:*`/`billing` read roles; restrict `aws-portal`/`purchase-orders` | Cost Management Reader vs Contributor | `roles/billing.viewer` vs `billing.admin` | Access review records |
| FG-08 | Commitment purchases approved | Restrict `savingsplans:CreateSavingsPlan`, `ec2:PurchaseReservedInstancesOffering` to FinOps role | Reservation purchase via Billing role only | CUD purchase restricted to billing admins | Approval tickets per purchase |
| FG-09 | Non-prod shutdown schedules | Instance Scheduler on AWS / EventBridge Scheduler | Automation / AKS stop-start / VM auto-shutdown | Instance schedules (resource policies) | Schedule coverage report |
| FG-10 | Orphaned resource cleanup | Config + Trusted Advisor / Cost Optimization Hub | Advisor + Resource Graph queries | Recommender (idle resources) | Monthly cleanup log |
| FG-11 | Cost visibility per team | Cost categories, cost allocation tags | Cost allocation rules | Labels + BigQuery views | Showback report published |
| FG-12 | Unit cost KPIs tracked | CUR + business metrics | Exports + business metrics | BigQuery + business metrics | KPI dashboard, trend review |

## Example Preventive Controls

### AWS SCP: deny untagged EC2 launches and large instances in sandbox OU

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "RequireCostCenterTagOnRunInstances",
      "Effect": "Deny",
      "Action": "ec2:RunInstances",
      "Resource": "arn:aws:ec2:*:*:instance/*",
      "Condition": {"Null": {"aws:RequestTag/cost-center": "true"}}
    },
    {
      "Sid": "DenyLargeInstancesInSandbox",
      "Effect": "Deny",
      "Action": "ec2:RunInstances",
      "Resource": "arn:aws:ec2:*:*:instance/*",
      "Condition": {
        "ForAnyValue:StringNotLike": {"ec2:InstanceType": ["t3.*", "t4g.*", "m7g.large", "m7i.large"]}
      }
    }
  ]
}
```

Test SCPs in a non-critical OU first; they apply to every principal in the account including administrators (not the management account).

### Azure Policy: allowed VM SKUs (assignment)

```bash
az policy assignment create \
  --name allowed-vm-skus-dev \
  --scope "/subscriptions/$DEV_SUB" \
  --policy "cccc23c7-8427-4f53-ad12-b6a63eb452b3" \
  --params '{"listOfAllowedSKUs":{"value":["Standard_B2s","Standard_D2s_v5","Standard_D4s_v5"]}}'
```

The GUID is the built-in "Allowed virtual machine size SKUs" definition; confirm with `az policy definition list --query "[?displayName=='Allowed virtual machine size SKUs']"`.

### GCP Org Policy: restrict resource locations

```bash
gcloud resource-manager org-policies allow gcp.resourceLocations \
  in:eu-locations --organization=$ORG_ID
```

## Mapping to External Frameworks

Cost controls overlap with security and compliance frameworks; reuse evidence instead of duplicating work.

| FinOps control | Related framework area |
|----------------|------------------------|
| FG-02 region restriction | Data residency (GDPR transfer rules), SOC 2 CC6 logical access scope |
| FG-06 billing export retention | Financial record retention, SOX IT general controls (where billing feeds financial reporting) |
| FG-07 billing access | SOC 2 CC6.1/CC6.3 access management, ISO/IEC 27001 Annex A access control |
| FG-08 approval of purchases | Procurement controls, segregation of duties |
| FG-05 anomaly response | Incident management process (abuse often shows first as a cost spike) |

Confirm the exact control IDs with your auditor; frameworks are revised periodically.

## FinOps Framework Alignment

The FinOps Foundation framework groups work into domains (understand usage and cost, quantify business value, optimize usage and cost, manage the FinOps practice) and maturity stages Crawl, Walk, Run. A practical progression:

| Stage | Controls in place |
|-------|-------------------|
| Crawl | FG-04, FG-06, tagging convention documented, monthly review |
| Walk | FG-01 enforced, FG-05 routed to owners, FG-09, FG-11 showback |
| Run | FG-03, FG-08 workflow, FG-12 unit economics drive planning, policy-as-code in CI |

## Exceptions Process

1. Request records resource, control ID, justification, owner, expiry date.
2. Approver is the budget owner, not the requester.
3. Exceptions are implemented as scoped tags or policy exemptions (`az policy exemption create`, SCP condition on a tag), never by removing the control globally.
4. Expired exceptions are reported automatically.

## Checklist

- [ ] Every control has an owner, enforcement mechanism and evidence source
- [ ] Preventive controls tested in a sandbox OU/subscription/folder
- [ ] Tagged-spend percentage tracked and trending up
- [ ] Commitment purchases restricted to a FinOps role with approval trail
- [ ] Exceptions time-boxed and reviewed
