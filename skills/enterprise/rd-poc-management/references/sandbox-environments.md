# Sandbox Environments & Cloud Isolation

## 1. The Blast Radius Problem
An R&D Department is, by definition, writing experimental, unoptimized, and potentially dangerous code. If a PoC connects to the shared Global Staging or Production databases, a single unindexed query or infinite loop can bring down the entire company's infrastructure. 

To innovate safely, R&D requires a restricted **Blast Radius**.

## 2. Ephemeral Cloud Environments
Instead of sharing environments, modern R&D teams utilize **Ephemeral (Short-lived) Environments**.

### AWS Organizations / GCP Folders
- Do not let R&D teams launch instances in the main AWS account.
- Use AWS Organizations to spin up a completely isolated AWS Account specifically for the PoC.
- Apply strict Service Control Policies (SCPs) limiting the maximum instance sizes (e.g., block `p4d.24xlarge` to prevent massive billing accidents).
- When the PoC timebox expires, run a script to completely nuke the AWS account. Zero zombie resources left behind.

### Kubernetes Namespaces
If provisioning full cloud accounts is too slow, utilize Kubernetes logical isolation.
- Create a dynamic namespace: `kubectl create namespace rd-poc-departmentx`.
- **Resource Quotas**: Apply hard limits to the namespace.
  ```yaml
  apiVersion: v1
  kind: ResourceQuota
  metadata:
    name: poc-quota
    namespace: rd-poc-departmentx
  spec:
    hard:
      requests.cpu: "4"
      requests.memory: 8Gi
      limits.cpu: "8"
      limits.memory: 16Gi
  ```
- If the PoC has a memory leak, Kubernetes will OOMKill the PoC pods, but the Global services running in the `default` namespace remain perfectly healthy.

## 3. Data Anonymization
R&D PoCs often need realistic data to test performance. However, giving an experimental PoC access to Real Production Data violates GDPR, HIPAA, and internal security policies.
- **Never connect a PoC to a production replica.**
- Use automated data scrubbing pipelines to generate an anonymized database dump (e.g., replacing real emails with `user1@example.com`, scrambling credit card hashes). Load this scrubbed dump into the isolated Sandbox environment.
