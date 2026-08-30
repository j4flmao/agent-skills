# Cloud Security Offensive (Educational)

> [!WARNING]
> **DISCLAIMER: EDUCATIONAL & DEFENSIVE PURPOSES ONLY**
> Cloud attack paths are discussed purely to understand cloud misconfigurations and improve IAM/Resource policies.

## 1. Skill Context
**Focus**: Cloud-specific attack vectors, IAM abuse, metadata APIs, serverless exploitation.
**Triggers**: aws privilege escalation, cloud metadata attack, exploit s3 bucket, azure managed identity

## 2. Cloud Attack Vectors
Cloud security differs heavily from on-premise. The perimeter is Identity (IAM). The agent explains how misconfigurations lead to full cloud compromise.

### IAM Privilege Escalation (AWS)
- **`iam:PassRole` & `ec2:RunInstances`**: An attacker with these permissions can spawn an EC2 instance, attach an administrative IAM role to it, log into the instance, and inherit the admin permissions.
- **`iam:PutUserPolicy`**: An attacker can attach an inline policy granting `AdministratorAccess` to their own compromised, low-privileged user account.

### Instance Metadata Service (IMDS) Abuse
- **SSRF to IMDS**: If a cloud-hosted web application has an SSRF vulnerability, attackers can query `http://169.254.169.254/latest/meta-data/` to retrieve temporary STS credentials of the IAM role attached to the compute instance.
- **Mitigation**: Migrating to IMDSv2, which requires a `PUT` request with specific headers to initiate a session, defeating standard SSRF.

### Serverless Exploitation
- **Lambda Environment Variables**: Exploiting injection vulnerabilities in Lambda functions to dump `process.env` which often contains database connection strings or third-party API keys.
- **Persistence**: Modifying Lambda functions to include malicious code that executes alongside legitimate invocations.

## 3. Output Format
- Detail the cloud misconfiguration mechanically.
- Diagram the attack path (e.g., Compromised Dev User -> Assumes Role -> Modifies Policy).
- Provide the exact defensive remediation (e.g., applying IAM Conditions, SCPs).
