# Data Replication Security

## Securing Data Replication

Data replication across environments and regions requires encryption, access control, and audit.

### Encryption in Transit

```python
class ReplicationEncryption:
    def __init__(self):
        self.tls_config = TLSConfig(
            min_version="TLSv1.2",
            preferred_ciphers=[
                "TLS_AES_256_GCM_SHA384",
                "TLS_CHACHA20_POLY1305_SHA256",
                "ECDHE-RSA-AES256-GCM-SHA384",
            ],
            certificate_renewal_days=90,
        )

    def configure_connector(self, connector: ReplicationConnector):
        connector.set_tls_config(self.tls_config)
        connector.enable_hostname_verification()
        connector.set_ca_certificate_path("/etc/ssl/certs/ca.pem")

    def validate_tls(self, connection_string: str) -> bool:
        import ssl
        import socket

        host, port = connection_string.split(":")
        context = ssl.create_default_context()
        context.check_hostname = True
        context.verify_mode = ssl.CERT_REQUIRED

        try:
            with socket.create_connection((host, int(port)), timeout=10) as sock:
                with context.wrap_socket(sock, server_hostname=host):
                    return True
        except ssl.SSLError:
            return False
```

### Access Control

```python
class ReplicationAccessControl:
    def __init__(self, vault: SecretManager):
        self.vault = vault
        self.credentials: dict[str, ReplicationCreds] = {}

    def create_replication_user(self, database: str, source: str, target: str):
        password = self._generate_strong_password()
        grants = self._build_replication_grants(source, target)

        query = f"""
        CREATE USER replication_user WITH PASSWORD '{password}';
        {grants}
        """
        self._execute_as_admin(database, query)
        self.vault.store(f"replication/{source}_{target}", {
            "username": "replication_user",
            "password": password,
        })

    def _build_replication_grants(self, source: str, target: str) -> str:
        return f"""
        GRANT USAGE ON SCHEMA public TO replication_user;
        GRANT SELECT ON ALL TABLES IN SCHEMA public TO replication_user;
        GRANT INSERT ON ALL TABLES IN SCHEMA public TO replication_user;
        ALTER DEFAULT PRIVILEGES IN SCHEMA public
          GRANT SELECT ON TABLES TO replication_user;
        """
```

## Audit Logging

```python
class ReplicationAudit:
    def __init__(self):
        self.events: list[ReplicationEvent] = []

    def log_event(self, event: ReplicationEvent):
        self.events.append(event)
        if event.type in ("failed", "security_violation"):
            self._alert(event)

    def query_logs(self, filter: AuditFilter) -> list[ReplicationEvent]:
        return [
            e for e in self.events
            if (not filter.source or e.source == filter.source)
            and (not filter.target or e.target == filter.target)
            and (not filter.type or e.type == filter.type)
        ]
```

## Key Points

- TLS 1.2+ minimum with strong cipher suites
- Certificate renewal every 90 days with automated rotation
- Hostname verification prevents man-in-the-middle
- Dedicated replication users with minimal required privileges
- Credentials stored in secret manager, never in config files
- Audit logging for all replication events
- Security violation alerts trigger immediate investigation
- Network isolation via private subnets and VPC peering
- IP allowlisting for replication source and target
- Regular penetration testing of replication infrastructure
