# IBM Cloud Advanced Topics

Production patterns on IBM Cloud beyond single-account basics: enterprise account structure, infrastructure as code at scale (Schematics, Projects, deployable architectures), secrets and key management, zero-trust access with context-based restrictions, multi-zone and multi-region resilience, hybrid connectivity, compliance automation, and observability.

## Enterprise Account Structure

```text
Enterprise
 ├─ Account group: platform
 │    ├─ account: shared-services   (Transit Gateway hub, DNS, Secrets Manager, logging)
 │    └─ account: security          (Security and Compliance Center, audit log archive)
 ├─ Account group: workloads-prod
 │    └─ account: app-prod
 └─ Account group: workloads-nonprod
      ├─ account: app-dev
      └─ account: app-test
```

- Accounts are hard IAM and billing boundaries; resource groups are soft boundaries inside an account. Separate production from non-production at the account level.
- Use enterprise-managed IAM templates (access group and trusted profile templates assigned from the enterprise) to keep policies consistent across child accounts.
- Centralize audit events from all accounts into a security account via Activity Tracker Event Routing targets (IBM Cloud Logs, COS, Event Streams).

## Infrastructure as Code at Scale

| Option | Use |
|--------|-----|
| Terraform + remote backend | Teams already standardized on Terraform tooling |
| Schematics workspaces | IBM-managed Terraform runs and state, IAM-controlled, integrates with Secrets Manager |
| Projects + deployable architectures | Catalog-published, versioned Terraform solutions (landing zones) with configuration and compliance validation |

Practices:
- Compose stacks from modules in `terraform-ibm-modules` (IBM-maintained modules for VPC, IKS/ROKS, COS, KMS, observability) rather than writing every resource.
- One state per environment and layer (network, platform, application) to limit blast radius.
- Run `terraform plan` in CI with a read-only service ID; apply with a separate, approval-gated identity.

```bash
ibmcloud schematics workspace new --file workspace.json
ibmcloud schematics plan  --id "$WS_ID"
ibmcloud schematics apply --id "$WS_ID" --force
ibmcloud schematics logs  --id "$WS_ID"
```

## Secrets and Keys

| Service | Purpose |
|---------|---------|
| Secrets Manager | Arbitrary secrets, IAM credentials (dynamic, short-lived API keys), certificates (public via ACME, private CA), username/password with rotation |
| Key Protect | Multi-tenant KMS with FIPS 140-2 Level 3 HSMs; root keys for envelope encryption of COS, ICD, block storage |
| Hyper Protect Crypto Services | Dedicated HSM with Keep Your Own Key (customer-controlled master key ceremony) |

Patterns:
- Envelope encryption: services encrypt data keys with your root key; rotating the root key re-wraps data keys without re-encrypting data.
- IAM credentials secrets in Secrets Manager generate service-ID API keys with a TTL; workloads fetch them at runtime instead of storing static keys.
- Kubernetes: External Secrets Operator (`external-secrets.io/v1` API) with the IBM Secrets Manager provider syncs secrets into clusters.

```yaml
apiVersion: external-secrets.io/v1
kind: SecretStore
metadata:
  name: ibm-sm
  namespace: app
spec:
  provider:
    ibm:
      serviceUrl: https://<instance-id>.us-south.secrets-manager.appdomain.cloud
      auth:
        secretRef:
          secretApiKeySecretRef:
            name: ibm-sm-apikey
            key: apikey
```

Prefer a trusted-profile (container auth) configuration over an API-key secret where the provider and cluster support it.

## Zero-Trust Access: Context-Based Restrictions

CBR adds network context to IAM: even a valid token is rejected if the request does not come from an allowed zone.

```bash
# network zone: prod VPC
ibmcloud cbr zone-create --name prod-vpc --vpc "$PROD_VPC_CRN"

# rule: COS in the prod resource group only reachable from that zone over private endpoints
ibmcloud cbr rule-create --description "COS prod from prod VPC" \
  --service-name cloud-object-storage \
  --context-attributes "networkZoneId=$ZONE_ID,endpointType=private" \
  --resource-group-id "$PROD_RG_ID" \
  --enforcement-mode report
```

Start in `report` mode, review denied-event logs, then switch to `enabled`.

## Resilience

### Multi-zone
- VPC subnets in each of the three zones; spread VSIs/worker pools across zones; regional load balancers (ALB/NLB).
- ICD deployments are multi-zone by default in MZRs.
- COS regional or cross-region buckets.

### Multi-region DR
| Tier | Pattern | Notes |
|------|---------|-------|
| Backup & restore | Backups and IaC in a second region | Highest RTO, lowest cost |
| Pilot light | Data replicated, minimal compute in DR | Scale up on failover |
| Warm standby | Reduced-capacity full stack in DR | DNS/global load balancer failover |
| Active-active | Both regions serve traffic | Requires data layer designed for multi-region writes |

- Global load balancing via IBM Cloud Internet Services (CIS) with health checks across origins.
- Replicate data: COS replication rules, database read replicas in another region where the service supports them, application-level replication otherwise.
- Rehearse failover; measure actual RTO/RPO.

## Hybrid and Multi-Account Connectivity

| Need | Service |
|------|---------|
| Connect VPCs across accounts/regions, classic infrastructure | Transit Gateway (local or global routing) |
| Dedicated link to on-premises | Direct Link (Dedicated or Connect) |
| IPsec to on-premises | VPN for VPC (site-to-site), client-to-site VPN |
| Private access to IBM services | Virtual Private Endpoints (VPE) |
| Run IBM Cloud services on your infrastructure | IBM Cloud Satellite locations |

Design an address plan before creating VPCs: overlapping prefixes block Transit Gateway connections later.

## Compliance Automation

- Security and Compliance Center (SCC): attach profiles (e.g. IBM Cloud Framework for Financial Services, CIS benchmarks) to scopes (accounts, resource groups) and schedule scans.
- Deployable architectures validated against SCC profiles before deployment through Projects.
- Evidence: SCC results, Activity Tracker events, IaC history in Git.

## Observability

| Signal | Service |
|--------|---------|
| Logs | IBM Cloud Logs (replaced Log Analysis) |
| Platform audit | Activity Tracker Event Routing → Cloud Logs / COS / Event Streams |
| Metrics | IBM Cloud Monitoring (Sysdig-based, Prometheus-compatible) |
| Platform metrics routing | Metrics Routing |

Enable platform logs and metrics per region; use agents (logging agent, Sysdig agent) on VSIs and clusters; define alerts on SLO indicators rather than raw resource metrics only.

## Operations Checklist

- [ ] Production isolated in its own account; enterprise IAM templates applied
- [ ] IaC with modules, per-layer state, approval-gated apply
- [ ] Secrets in Secrets Manager; dynamic IAM credentials; root keys in Key Protect/HPCS
- [ ] CBR rules for data services, enforced after report-mode review
- [ ] Multi-zone everywhere; tested multi-region DR for critical systems
- [ ] Non-overlapping address plan; Transit Gateway / Direct Link / VPE for private paths
- [ ] SCC scans scheduled; audit events centralized
- [ ] Cloud Logs and Monitoring with SLO-based alerts
