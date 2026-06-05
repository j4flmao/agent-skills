# Network Topology Restrictions

## Subnet Isolation, Egress Gates, and Proxy Configs

Security-sensitive agent environments block raw ingress and egress connections. To prevent data exfiltration, system command control networks, or lateral movement inside internal VPC subnets, the runtime network harness blocks raw sockets and forces routing through gateway checkpoints.

```
+-------------------------------------------------------------+
|                     ISOLATED AGENT SUBNET                   |
|  - Blocks raw egress to 0.0.0.0/0 on TCP ports 80 and 443   |
|  - Blocks raw ingress to container ports                    |
+-------------------------------------------------------------+
                                │
               Routes all traffic via Proxy Endpoint
                                ▼
+-------------------------------------------------------------+
|                 SECURE GATEWAY FORWARD PROXY                |
|  - Inspects host headers                                    |
|  - Matches destination domains against authorization list   |
+-------------------------------------------------------------+
```

The system enforces these network rules:
1. **No Direct Socket Calls**: Block direct sockets (`import socket`) or configure IP-level firewall filters.
2. **Authorized Egress Targets**: Permit communication only to specific service endpoints (e.g., `api.openai.com`, `api.anthropic.com`).
3. **Internal Subnet Shielding**: Block agent access to internal metadata services (e.g., AWS IMDSv2 at `169.254.169.254`).

---

## VPC Routing Table & Gateway Policies

Network configurations are represented by this declarative routing rule model:

```
[Target Destination]        [Action]       [Routing Gateway]
--------------------        --------       -----------------
169.254.169.254/32          REJECT         None
10.0.0.0/8 (Internal)       REJECT         None
*.openai.com                ALLOW          Forward Proxy (Port 3128)
*.anthropic.com             ALLOW          Forward Proxy (Port 3128)
0.0.0.0/0 (Default Public)  REJECT         None
```

---

## Python Network Egress Validator

Below is a Python validation engine that checks active network environment variables, proxy setups, and runs destination audits.

```python
import os
import sys
import urllib.parse
import unittest
from typing import Dict, Any, Tuple

class NetworkEgressValidator:
    """
    Validates proxy variables and target destinations against egress rules.
    """
    def __init__(self, allowed_domains: list, forbidden_ips: list):
        self.allowed_domains = allowed_domains
        self.forbidden_ips = forbidden_ips

    def verify_proxy_configuration(self) -> Tuple[bool, str]:
        """Checks if HTTP_PROXY or HTTPS_PROXY environment variables are configured."""
        http_proxy = os.environ.get("HTTP_PROXY") or os.environ.get("http_proxy")
        https_proxy = os.environ.get("HTTPS_PROXY") or os.environ.get("https_proxy")
        
        if not http_proxy and not https_proxy:
            return False, "Egress violation: No proxy settings defined in environment."
        return True, "Proxy settings found."

    def validate_destination_url(self, url: str) -> Tuple[bool, str]:
        """Parses destination URL and evaluates access constraints."""
        parsed = urllib.parse.urlparse(url)
        hostname = parsed.hostname
        if not hostname:
            return False, f"Invalid URL structure: {url}"

        # 1. Block metadata services and internal subnets
        if hostname in self.forbidden_ips or hostname.startswith("10.") or hostname.startswith("192.168."):
            return False, f"Blocked target: Access to internal IP/metadata '{hostname}' is forbidden."

        # 2. Check domain authorization
        is_authorized = any(hostname == domain or hostname.endswith("." + domain) for domain in self.allowed_domains)
        if not is_authorized:
            return False, f"Blocked target: Domain '{hostname}' is not in the egress allowlist."

        return True, "Destination authorized."

class TestNetworkEgressValidator(unittest.TestCase):
    """Unit test suite for the NetworkEgressValidator class."""
    def setUp(self):
        self.validator = NetworkEgressValidator(
            allowed_domains=["openai.com", "anthropic.com"],
            forbidden_ips=["169.254.169.254", "localhost", "127.0.0.1"]
        )

    def test_forbidden_metadata_ip(self):
        valid, msg = self.validator.validate_destination_url("http://169.254.169.254/latest/meta-data")
        self.assertFalse(valid)
        self.assertIn("forbidden", msg)

    def test_unauthorized_domain(self):
        valid, msg = self.validator.validate_destination_url("https://malicious-site.net/steal-keys")
        self.assertFalse(valid)
        self.assertIn("not in the egress allowlist", msg)

    def test_authorized_domain(self):
        valid, msg = self.validator.validate_destination_url("https://api.openai.com/v1/chat/completions")
        self.assertTrue(valid)
        self.assertEqual(msg, "Destination authorized.")

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "test":
        unittest.main(argv=[sys.argv[0]])
    else:
        # Mock environment setup for local execution run
        os.environ["HTTP_PROXY"] = "http://proxy.internal:3128"
        validator = NetworkEgressValidator(
            allowed_domains=["openai.com"],
            forbidden_ips=["169.254.169.254"]
        )
        print(f"Proxy check: {validator.verify_proxy_configuration()}")
        print(f"Target check: {validator.validate_destination_url('https://api.openai.com')}")
```

---

## Detailed Rules & Constraints
1. **Always Enforce Metadata Protection**: Access to `169.254.169.254` must be blocked at the network interface layer.
2. **Domain Allowlist Matching**: Wildcard authorization matching must require exact subdomain validation boundary checks.
3. **No Unencrypted Traffic**: Enforce HTTPS for outgoing API calls; drop HTTP endpoints.

---

## Handoff & Related References
- Dependency Isolation Strategies: [dependency-isolation-strategies.md](dependency-isolation-strategies.md)
- Security Isolation Protocols: [security-isolation-protocols.md](security-isolation-protocols.md)

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive architectural references & code details preserved)
Strict compliance with OpenAPI, dynamic loops, and multi-agent coordination protocols.
-->
