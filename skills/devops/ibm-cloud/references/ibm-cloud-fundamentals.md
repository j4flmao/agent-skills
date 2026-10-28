# IBM Cloud Fundamentals

Core concepts for working on IBM Cloud: account and resource hierarchy, regions and zones, IAM (access groups, service IDs, trusted profiles), the CLI and its plugins, Terraform provider basics, and the main service families. Compute, networking, Kubernetes and data services have their own references in this skill.

## Account and Resource Hierarchy

```text
Enterprise (optional)            consolidated billing, account groups
 └─ Account                      IAM boundary, billing unit
     ├─ Resource groups          logical grouping for access and billing (cannot be nested)
     │    └─ Resources           service instances, VPCs, clusters, buckets ...
     ├─ Access groups            IAM policies granted to users / service IDs / trusted profiles
     └─ Account settings         MFA, IP allow-lists, context-based restrictions
```

| Concept | Notes |
|---------|-------|
| Resource group | Assigned at creation; most resources cannot move to another group later. Plan groups per environment/team up front |
| CRN | Cloud Resource Name, the global identifier used in IAM policies and APIs (`crn:v1:bluemix:public:<service>:<region>:a/<account>:<instance>::`) |
| Tags | User tags for cost/ownership; access management tags for IAM policies |

## Regions and Zones

- Multizone regions (MZRs) such as `us-south` (Dallas), `us-east` (Washington DC), `eu-de` (Frankfurt), `eu-gb` (London), `eu-es` (Madrid), `jp-tok`, `jp-osa`, `au-syd`, `ca-tor`, `br-sao` have three zones (`us-south-1`, `-2`, `-3`).
- Spread production workloads across zones; some services also offer cross-region options.
- Some services are global (IAM, COS instances, DNS Services); data location is still chosen at the bucket/resource level.

## Identity and Access Management

| Principal | Use |
|-----------|-----|
| User | Humans, ideally federated via an IdP (App ID / SAML / OIDC) |
| Service ID | Applications and automation outside IBM Cloud; authenticates with API keys |
| Trusted profile | Workloads running on IBM Cloud (VSIs, IKS/ROKS pods, Code Engine) or federated users assume a profile without long-lived keys |
| Access group | Collection of principals with shared policies |

Roles:
- **Platform roles** (Viewer, Operator, Editor, Administrator) control management of the resource (create, delete, configure).
- **Service roles** (Reader, Writer, Manager, plus service-specific roles) control use of the service's data plane.

```bash
# login: SSO for humans, API key for automation
ibmcloud login --sso
ibmcloud login --apikey "$IBMCLOUD_API_KEY" -r us-south

# target region and resource group
ibmcloud target -r us-south -g prod

# access group with least-privilege policy on VPC infrastructure in one resource group
ibmcloud iam access-group-create vpc-operators -d "Operate prod VPC"
ibmcloud iam access-group-policy-create vpc-operators \
  --roles Operator,Viewer --service-name is --resource-group-name prod
ibmcloud iam access-group-user-add vpc-operators alice@example.com

# service ID + API key for CI
ibmcloud iam service-id-create ci-deployer -d "CI pipeline deployer"
ibmcloud iam access-group-service-id-add vpc-operators ci-deployer
ibmcloud iam service-api-key-create ci-deployer-key ci-deployer --file ci-key.json
```

Store API keys in a secret manager; rotate them; prefer trusted profiles for workloads running inside IBM Cloud so no key exists.

### Account security settings
- Enforce MFA for users (account-level MFA setting).
- Restrict API key creation and user invitations to administrators.
- Context-based restrictions (CBR): rules limiting access to services from allowed network zones (IP ranges, VPCs, service references).
- Audit with Activity Tracker Event Routing to IBM Cloud Logs or COS.

## CLI

```bash
curl -fsSL https://clis.cloud.ibm.com/install/linux | sh     # see docs for macOS/Windows installers
ibmcloud plugin repo-plugins                                  # list available plugins
ibmcloud plugin install vpc-infrastructure container-service cloud-object-storage cloud-databases code-engine
ibmcloud resource service-instances --type service_instance
ibmcloud resource search 'service_name:cloud-object-storage AND region:us-south'
```

| Plugin | Command prefix | Area |
|--------|----------------|------|
| vpc-infrastructure | `ibmcloud is` | VPC, VSIs, subnets, security groups |
| container-service | `ibmcloud ks` / `ibmcloud oc` | IKS and Red Hat OpenShift on IBM Cloud |
| code-engine | `ibmcloud ce` | Serverless containers, jobs, functions |
| cloud-object-storage | `ibmcloud cos` | Buckets and objects |
| cloud-databases | `ibmcloud cdb` | ICD deployments |
| schematics | `ibmcloud schematics` | Managed Terraform |

## Terraform Provider Basics

```hcl
terraform {
  required_providers {
    ibm = {
      source  = "IBM-Cloud/ibm"
      version = "~> 1.70"
    }
  }
}

provider "ibm" {
  region = "us-south"
  # IC_API_KEY / IBMCLOUD_API_KEY read from the environment
}

data "ibm_resource_group" "prod" {
  name = "prod"
}
```

Pin a provider version range that you have tested; IBM releases provider versions frequently. Use IBM Cloud Schematics if you want IBM-hosted Terraform state and runs, or a standard remote backend (e.g. COS via the S3-compatible backend) for self-managed state.

## Service Families

| Need | Service |
|------|---------|
| Virtual servers, networking | VPC Infrastructure (VSIs, bare metal on VPC, load balancers) |
| Kubernetes | IBM Cloud Kubernetes Service (IKS), Red Hat OpenShift on IBM Cloud (ROKS) |
| Serverless | Code Engine (apps, jobs, functions; IBM Cloud Functions is discontinued) |
| Object storage | Cloud Object Storage |
| Managed databases | IBM Cloud Databases (PostgreSQL, MySQL, MongoDB, Redis/Valkey, Elasticsearch, etcd, EDB), Db2 |
| Secrets & keys | Secrets Manager, Key Protect, Hyper Protect Crypto Services |
| Logging & monitoring | IBM Cloud Logs, IBM Cloud Monitoring (Sysdig), Activity Tracker Event Routing |
| Regulated workloads | IBM Cloud for Financial Services framework, Security and Compliance Center |

IBM Log Analysis and the classic Activity Tracker hosted event search were replaced by IBM Cloud Logs and Activity Tracker Event Routing; plan new designs on the replacements.

## Cost Basics

- Pricing per service plan (Lite plans are free with limits; one Lite instance per service per account in many cases).
- Use resource groups and tags for cost attribution; review usage in Billing and usage dashboards.
- Set spending notifications; delete unused instances (Lite instances may be deleted after inactivity).

## Checklist

- [ ] Resource groups planned per environment before provisioning
- [ ] Users federated with MFA; access via access groups, least privilege
- [ ] Service IDs for external automation; trusted profiles for workloads on IBM Cloud
- [ ] CBR rules and account security settings applied
- [ ] Terraform provider version pinned; state stored remotely
- [ ] Logging/auditing on IBM Cloud Logs / Event Routing
