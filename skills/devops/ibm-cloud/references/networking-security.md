# IBM Cloud Networking and Security

## VPC Infrastructure
IBM Cloud VPC: software-defined network, subnets, public gateways. Virtual Private Endpoint for private access to IBM services. Security groups: stateful, instance-level, allow rules only. Network ACLs: stateless, subnet-level, allow/deny rules. Floating IPs: static public IP for VSI access. Load Balancer: public/private, layer 4/7, health checks.

## IAM and Access Control
IBM Cloud IAM: users, access groups, trusted profiles. Resource groups: organize resources for access control. Authorizations: service-to-service access grants. API keys: per-user or per-service ID, rotate regularly. Access policies: viewer, operator, editor, administrator roles. Enterprise management: multi-account governance.

## Kubernetes Service (IKS)
IBM Cloud Kubernetes Service: managed control plane, worker node pools. VPC Gen2 cluster: private-only worker nodes. Ingress: ALB (Application Load Balancer) with TLS. IBM Cloud Container Registry: image storage, vulnerability scanning. Service binding: IAM service credentials for cluster. Logging and monitoring: Log Analysis, Monitoring with Sysdig.

## Cloud Databases
IBM Cloud Databases for PostgreSQL, MySQL, etcd, Redis, Elasticsearch. Deployment: single node or HA with replica. Backups: automated daily, 30-day retention, cross-region. Encryption: KMS-managed keys for etc and backup. Auto-scaling: disk and memory based on utilization.

## Security and Compliance
Hyper Protect Services: FIPS 140-2 Level 4, confidential computing. Key Protect: manage customer root keys for encryption. Certificate Manager: TLS/SSL certificate management. Secrets Manager: rotate and manage credentials. Security and Compliance Center: posture management, rules.

## Automation and DevOps
IBM Cloud Schematics: Terraform automation. Code Engine: serverless container platform. Continuous Delivery: Tekton-based pipelines, toolchain integration. Event Notifications: alerts for resource events. VPC Infrastructure: provision with Terraform, IBM Cloud CLI.

## References
- ibm-cloud-fundamentals.md -- Fundamentals
- vpc-compute.md -- VPC and Compute
- ibm-kubernetes.md -- Kubernetes
- cos-databases.md -- Storage and Databases
- cloud-foundry.md -- Cloud Foundry
