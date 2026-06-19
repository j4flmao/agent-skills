# Penetration Testing Advanced Topics

## Introduction
Advanced penetration testing covers red team operations, cloud penetration testing, API-specific testing automation, CI/CD pipeline security testing, and active directory attack path analysis.

## Red Team Operations
Red team operations simulate advanced persistent threats (APTs) with long-duration, stealthy, multi-vector attacks:
- **Duration**: 2-6 weeks (vs pentest 1-2 weeks)
- **Goal**: Test detection and response capabilities, not just find vulnerabilities
- **Attack vectors**: Spear phishing, physical access, social engineering, supply chain
- **Stealth**: Avoid detection by blue team and security controls
- **Scope**: Full kill chain from initial access to data exfiltration
- **Reporting**: Focus on detection gaps and response improvement

## Cloud Penetration Testing
### AWS Pentest Checklist
```yaml
aws_pentest:
  iam:
    - "Overly permissive roles/policies"
    - "Cross-account access without proper controls"
    - "Unused roles and credentials"
    - "Privilege escalation paths (iam:PassRole + ec2:RunInstances)"
  s3:
    - "Publicly accessible buckets"
    - "Bucket without encryption"
    - "Bucket without logging"
  ec2:
    - "Public-facing instances with open ports"
    - "Instances without latest patches"
    - "Unencrypted EBS volumes"
    - "Instances with instance metadata service v1 (SSRF risk)"
  rds:
    - "Publicly accessible databases"
    - "Databases without encryption"
    - "Default/admin credentials"
  lambda:
    - "Overly permissive execution roles"
    - "Hardcoded secrets in environment variables"
    - "Vulnerable dependencies"
```

## Active Directory Attack Path Analysis
- BloodHound maps AD attack paths
- Common attack paths: Kerberoasting, AS-REP roasting, DCSync, ACL abuse, Group Policy modification
- Identify: users with excessive privileges, group nesting issues, legacy protocol usage
- Remediation: reduce attack surface, implement tiered administration, disable weak protocols

## CI/CD Pipeline Security Testing
- Test for secrets in CI artifacts, build logs, and container images
- Verify build isolation — can one build job access another's secrets?
- Check CI/CD system configuration — overly permissive access to pipelines
- Test artifact integrity — can artifacts be modified after build?

## Key Points
- Red team operations test detection and response over extended periods
- Cloud pentesting requires cloud-specific methodology (IAM, S3, EC2, RDS)
- AD attack path analysis with BloodHound identifies privilege escalation routes
- CI/CD pipeline security testing validates build and deployment integrity
- Always obtain written authorization for any security testing
- Testing in AWS requires AWS authorization for certain services (EC2, RDS, API Gateway)
- Chain low-severity findings to demonstrate real-world attack impact
- Purple team exercises combine red and blue teams for collaborative improvement
