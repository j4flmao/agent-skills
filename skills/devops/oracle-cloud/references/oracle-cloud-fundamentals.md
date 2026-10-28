# Oracle Cloud Infrastructure (OCI) Fundamentals

The building blocks every OCI deployment uses: tenancy and region structure, compartments, identity and policy syntax, core networking, tooling (Console, CLI, Terraform), and cost basics. Service-specific details are in `core-services.md`, `database-services.md`, `oke-kubernetes.md`, `security-iam.md`, and `serverless-integration.md`.

## 1. Resource Hierarchy and Geography

| Concept | Description |
|---|---|
| Tenancy | Root account; the root compartment |
| Region | Geographic area; home region holds IAM master data |
| Availability Domain (AD) | Isolated data center in a region; many regions have one AD |
| Fault Domain (FD) | Three per AD; anti-affinity groups for hardware/maintenance |
| Compartment | Logical container for resources and policies; nestable up to six levels |
| OCID | Unique resource identifier: `ocid1.<type>.<realm>.<region>.<id>` |

In single-AD regions, spread instances across fault domains for resilience; in multi-AD regions, across ADs.

## 2. Compartment Design

```
root (tenancy)
├── shared-network        # VCNs, DRG, firewalls (network team)
├── security              # Vault, Cloud Guard targets, logging (security team)
├── prod
│   ├── app-a
│   └── app-b
├── nonprod
│   ├── dev
│   └── test
└── sandbox
```

- Compartments are the unit for policies, quotas, budgets, and cost tracking.
- Resources can move between compartments, but policies change with them; design early.
- Tag namespaces (defined tags) for cost centre, environment, owner.

## 3. Identity and Policies

Identity domains (IAM with Identity Domains) hold users, groups, and federation (SAML/OIDC with Entra ID, Okta, etc.).

Policy syntax:

```
Allow <subject> to <verb> <resource-type> in <location> [where <conditions>]
```

| Verb | Grants |
|---|---|
| `inspect` | List resources, no contents |
| `read` | Inspect + get details |
| `use` | Read + work with existing resources (varies by type) |
| `manage` | All permissions including create/delete |

```
Allow group 'Default'/'NetworkAdmins' to manage virtual-network-family in compartment shared-network
Allow group 'Default'/'AppADevelopers' to manage instance-family in compartment prod:app-a
Allow group 'Default'/'AppADevelopers' to use virtual-network-family in compartment shared-network
Allow group 'Default'/'Auditors' to read all-resources in tenancy
Allow dynamic-group 'Default'/'app-a-instances' to read secret-bundles in compartment security
  where target.vault.id = 'ocid1.vault.oc1.eu-frankfurt-1.<id>'
```

- Resource families (`virtual-network-family`, `instance-family`, `database-family`, `object-family`) group related types.
- Dynamic groups match resources (instances, functions) by rules; they authenticate as **instance principals** or **resource principals** instead of using API keys. OKE workloads can use **workload identity**.
- Policies attached at a compartment apply to it and its children.

## 4. Networking Basics

| Component | Purpose |
|---|---|
| VCN | Private network (one or more CIDR blocks) in a region |
| Subnet | Regional (recommended) or AD-specific; public or private |
| Security list | Subnet-level stateful/stateless rules |
| Network security group (NSG) | Rules attached to VNICs; preferred for per-application rules |
| Internet Gateway | Public internet for public subnets |
| NAT Gateway | Outbound internet for private subnets |
| Service Gateway | Private access to Oracle services (Object Storage, etc.) without internet |
| Dynamic Routing Gateway (DRG) | On-premises (VPN, FastConnect), VCN-to-VCN and cross-region peering |

Typical pattern: public subnet only for load balancers/bastion; private subnets for compute and databases; NAT plus Service Gateway for egress.

## 5. Tooling

```bash
# CLI setup (API key auth) - creates ~/.oci/config
oci setup config

oci iam compartment list --compartment-id-in-subtree true --all \
  --query 'data[].{name:name,id:id}' --output table

oci compute instance list --compartment-id "$COMPARTMENT_ID" --lifecycle-state RUNNING
oci os object put --bucket-name artifacts --file build.tar.gz
```

- Cloud Shell in the Console has the CLI preauthenticated.
- Inside OCI, use `--auth instance_principal` or `resource_principal` instead of API keys.

Terraform:

```hcl
terraform {
  required_providers {
    oci = { source = "oracle/oci" }
  }
}

provider "oci" {
  region = var.region          # auth from ~/.oci/config, instance principal, or env vars
}

resource "oci_core_vcn" "main" {
  compartment_id = var.network_compartment_id
  cidr_blocks    = ["10.20.0.0/16"]
  display_name   = "prod-vcn"
  dns_label      = "prod"
}

resource "oci_core_subnet" "app" {
  compartment_id             = var.network_compartment_id
  vcn_id                     = oci_core_vcn.main.id
  cidr_block                 = "10.20.10.0/24"
  display_name               = "app-private"
  prohibit_public_ip_on_vnic = true
}
```

OCI Resource Manager runs Terraform as a managed service with state stored for you.

## 6. Compute Shapes

| Shape family | Notes |
|---|---|
| Flexible VM shapes (e.g. `VM.Standard.E5.Flex`, `VM.Standard.A1.Flex` Arm) | Choose OCPUs and memory independently |
| Bare metal (`BM.*`) | Whole server, no hypervisor |
| GPU (`BM.GPU.*`, `VM.GPU.*`) | AI/HPC |
| Burstable | Baseline fraction of OCPU for low-utilization workloads |

An OCPU is one physical core (two vCPUs on x86 with hyper-threading); compare carefully with other clouds' vCPU pricing.

## 7. Cost Basics

- Always Free resources include Arm Ampere A1 capacity, small AMD VMs, Autonomous Database instances, Object Storage and block volume allowances; check the current Free Tier page for exact limits.
- Outbound data transfer includes a monthly free allowance (10 TB in most regions at time of writing); inter-region and FastConnect pricing differ.
- Use budgets with alerts per compartment, quotas (`set compute-core quota ... in compartment ...`) to cap usage, and cost analysis with tags.

## Pitfalls

- Everything in the root compartment: no isolation of policies or costs.
- API keys on instances instead of instance principals.
- Security lists with broad rules shared by unrelated workloads; use NSGs.
- Single fault domain placement for HA pairs.

## Checklist

- [ ] Compartment structure and tag namespaces defined before workloads.
- [ ] Groups federated from the corporate IdP; least-privilege policies per compartment.
- [ ] Instance/resource principals or workload identity instead of API keys.
- [ ] Private subnets with NAT and Service Gateway; NSGs per application.
- [ ] Infrastructure in Terraform (CLI or Resource Manager).
- [ ] Budgets and quotas per compartment.
