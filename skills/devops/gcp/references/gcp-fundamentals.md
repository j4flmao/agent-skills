# GCP Fundamentals

## Overview
Google Cloud Platform (GCP) provides cloud computing services across compute, storage, databases, networking, data analytics, and machine learning. GCP leverages Google"s global network infrastructure and innovations in Kubernetes, BigQuery, and AI/ML.

## Core Concepts

### Project Organization
Resource hierarchy: Organization > Folders > Projects > Resources. Organization node: top-level, maps to company. Folders: departmental or team grouping. Projects: service and environment isolation. Resources: individual services. IAM policies and organization policies are inherited downward.

### Regions and Zones
GCP operates in 40+ regions, each with 3+ zones. Zones are isolated from each other within a region. Regional resources are replicated across zones. Multi-regional resources span geographic areas (us, eu, asia). Choose regions based on latency, compliance, and service availability.

### Service Accounts
Service accounts are identities for applications and VMs. Each service account has IAM roles assigned. Workload Identity binds Kubernetes service accounts to IAM service accounts. Automatic key rotation for GCP-managed service accounts. Avoid using user accounts for application authentication.

## Core Services

### Compute
Compute Engine: VMs with machine families (E2, N2, C2, M2, G2). GKE: managed Kubernetes with Autopilot and Standard modes. Cloud Run: serverless container platform, scale-to-zero. Cloud Functions: event-driven functions (2nd gen). App Engine: PaaS with automatic scaling.

### Storage
Cloud Storage: unified object storage with Standard, Nearline (30d), Coldline (90d), Archive (365d) tiers. Persistent Disk: block storage for Compute Engine and GKE. Filestore: managed NFS file storage. Local SSD: high-performance ephemeral storage.

### Database
Cloud SQL: managed MySQL, PostgreSQL, SQL Server (up to 10TB). Cloud Spanner: globally distributed, strongly consistent relational database. Firestore: serverless NoSQL document database. Bigtable: managed NoSQL wide-column database for large-scale analytics. Memorystore: managed Redis and Memcached.

### Data and Analytics
BigQuery: serverless data warehouse with SQL, ML, and BI. Pub/Sub: asynchronous messaging with exactly-once delivery. Dataflow: stream and batch data processing (Apache Beam). Dataproc: managed Spark and Hadoop. Looker: business intelligence and analytics.

### Networking
VPC: global virtual network with subnets, firewall rules, and routes. Cloud Load Balancing: global HTTP/S, TCP/UDP, internal load balancing. Cloud CDN: global content delivery with low latency. Cloud NAT: outbound internet for private instances. Cloud Interconnect: dedicated connectivity to on-premises. Cloud VPN: encrypted VPN tunnels.

### Security and Identity
Cloud IAM: fine-grained access control with roles and policies. Cloud KMS: key management and encryption. Cloud Armor: WAF and DDoS protection. Security Command Center: security and risk management. VPC Service Controls: data exfiltration prevention.

## Basic Operations
```bash
# Install gcloud and authenticate
gcloud auth login
gcloud config set project my-project
gcloud config set compute/region us-central1

# Compute
gcloud compute instances list
gcloud compute instances create my-vm --zone us-central1-a --machine-type e2-micro

# Storage
gcloud storage ls
gcloud storage cp file.txt gs://my-bucket/

# GKE
gcloud container clusters list
gcloud container clusters get-credentials my-cluster --region us-central1

# IAM
gcloud iam service-accounts list
gcloud projects add-iam-policy-binding my-project --member="user:dev@example.com" --role="roles/viewer"
```

## Best Practices
- Use resource hierarchy with folders and projects.
- Enable Cloud Audit Logs for all services.
- Use IAM least-privilege with custom roles.
- Enable VPC Service Controls for sensitive data.
- Use Cloud NAT for private GKE clusters.
- Set budget alerts before production deployments.
- Tag resources with labels for cost allocation.
- Use Workload Identity for GKE service accounts.

## References
- gcp-advanced.md -- Advanced GCP topics
- gcp-compute.md -- Compute Services
- gcp-infrastructure.md -- Network and Storage
- gcp-gke.md -- GKE
- gcp-serverless.md -- Cloud Run and Cloud Functions
