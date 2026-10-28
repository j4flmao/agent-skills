# Streaming Platform Security

Securing Kafka-based streaming platforms: encryption in transit, authentication (mTLS, SASL/SCRAM, OAUTHBEARER), authorization with ACLs, securing Connect, Schema Registry and Flink, and protecting sensitive data in events.

## Layers

| Layer | Control |
|-------|---------|
| Network | Private networking, security groups, no public brokers unless required |
| Transport | TLS on all listeners, including inter-broker and controller |
| Authentication | mTLS, SASL/SCRAM-SHA-512, SASL/OAUTHBEARER (OIDC), SASL/GSSAPI (Kerberos) |
| Authorization | Kafka ACLs (`StandardAuthorizer` in KRaft) or platform RBAC |
| Data | Field-level encryption/masking, PII minimization, retention limits |
| Audit | Authorizer logs, Connect REST audit, schema changes |

## TLS Listeners

```properties
listeners=INTERNAL://:9092,EXTERNAL://:9094,CONTROLLER://:9093
listener.security.protocol.map=INTERNAL:SASL_SSL,EXTERNAL:SASL_SSL,CONTROLLER:SSL
ssl.keystore.type=PKCS12
ssl.keystore.location=/etc/kafka/tls/broker.p12
ssl.keystore.password=${file:/etc/kafka/secrets.properties:keystore_password}
ssl.truststore.location=/etc/kafka/tls/truststore.p12
ssl.endpoint.identification.algorithm=https
ssl.enabled.protocols=TLSv1.3,TLSv1.2
```

- Certificates must contain the advertised hostnames as SANs; hostname verification is on by default for clients.
- Automate rotation (cert-manager on Kubernetes, Strimzi-managed CAs, or an internal PKI); Kafka can reload keystores dynamically via `kafka-configs.sh` per listener.

## Authentication Options

| Mechanism | Strengths | Considerations |
|-----------|-----------|----------------|
| mTLS | Strong, no passwords | Certificate lifecycle; principal mapping via `ssl.principal.mapping.rules` |
| SASL/SCRAM-SHA-512 | Simple username/password, stored salted in metadata | Rotate credentials; always over TLS |
| SASL/OAUTHBEARER | Central identity (OIDC), short-lived tokens | Configure JWKS validation on brokers (`sasl.oauthbearer.jwks.endpoint.url`, expected audience/issuer) |
| SASL/PLAIN | Only with external credential store and TLS | Avoid static plain passwords in JAAS files |

```bash
bin/kafka-configs.sh --bootstrap-server kafka:9092 --command-config admin.properties \
  --alter --add-config 'SCRAM-SHA-512=[password=<generated>]' --entity-type users --entity-name orders-service
```

Client side:

```properties
security.protocol=SASL_SSL
sasl.mechanism=SCRAM-SHA-512
sasl.jaas.config=org.apache.kafka.common.security.scram.ScramLoginModule required username="orders-service" password="${env:KAFKA_PASSWORD}";
```

One identity per application (not per team or shared), so ACLs and quotas are meaningful.

## Authorization with ACLs

```properties
authorizer.class.name=org.apache.kafka.metadata.authorizer.StandardAuthorizer
allow.everyone.if.no.acl.found=false
super.users=User:admin;User:CN=kafka-broker
```

```bash
# Producer: write to its own topics
bin/kafka-acls.sh --bootstrap-server kafka:9092 --command-config admin.properties --add \
  --allow-principal User:orders-service --operation Write --operation Describe \
  --topic billing.order. --resource-pattern-type prefixed

# Consumer: read topic + use its group
bin/kafka-acls.sh --bootstrap-server kafka:9092 --command-config admin.properties --add \
  --allow-principal User:analytics --operation Read --operation Describe \
  --topic billing.order.created.v1
bin/kafka-acls.sh --bootstrap-server kafka:9092 --command-config admin.properties --add \
  --allow-principal User:analytics --operation Read --group analytics-

# Transactional producer
bin/kafka-acls.sh ... --allow-principal User:enricher --operation Write --operation Describe --transactional-id enricher-
bin/kafka-acls.sh ... --allow-principal User:enricher --operation IdempotentWrite --cluster
```

- Prefixed resource patterns follow topic naming conventions (`<domain>.`), keeping ACLs manageable.
- Manage ACLs as code (Strimzi `KafkaUser`, Terraform, or GitOps tooling).
- Deny topic creation to applications; platform pipelines create topics.

## Kafka Connect Security

- The Connect REST API can create connectors that read databases or files; never expose it without authentication. Use a REST extension for auth, a reverse proxy with auth, or managed Connect.
- Restrict which connector plugins are installed; some connectors can execute code or read arbitrary files.
- Set `connector.client.config.override.policy=None` (or `Principal`) so connectors cannot override client security settings.
- Secrets via config providers; the REST API returns stored configs.

## Schema Registry Security

- TLS + authentication; restrict who can register or delete subjects (RBAC or a proxy).
- Set compatibility per subject and lock important subjects against deletion.
- Producers in production should not auto-register schemas.

## Flink and Stream Processors

- Flink REST/web UI can submit jobs (code execution); require authentication and keep it on private networks. Disable web submission (`web.submit.enable: false`) in production.
- Enable internal TLS for Flink (`security.ssl.internal.enabled: true`) where clusters span untrusted networks.
- Credentials for sources/sinks from secret stores; avoid baking them into job JARs.

## Protecting Sensitive Data in Events

| Technique | When |
|-----------|------|
| Do not publish PII unless needed | Default stance; publish IDs and let consumers look up details under access control |
| Field-level encryption (client-side) | Sensitive fields readable only by authorized consumers; key per field/tenant in KMS |
| Masking/tokenization in CDC (SMTs) | Strip columns before data leaves the source |
| Separate topics by sensitivity | Simpler ACLs and retention |
| Retention and compaction tombstones | Delete data after its purpose; crypto-shredding (delete key) for erasure requests in immutable logs |

Broker disk encryption (cloud volume encryption, LUKS) protects at rest but not against authorized clients.

## Monitoring and Audit

- Enable authorizer logging for denied operations; alert on spikes.
- Track authentication failures per principal and source IP.
- Audit ACL changes, connector config changes, and schema deletions.

## Pitfalls

- `allow.everyone.if.no.acl.found=true` left from development.
- PLAINTEXT listener still open "for internal use".
- Shared credentials across services, making revocation impossible.
- Connect REST API reachable from the corporate network without auth.

## Checklist

- [ ] TLS on every listener; certificate rotation automated
- [ ] Per-application identities (mTLS, SCRAM, or OAuth)
- [ ] Default-deny ACLs with prefixed patterns, managed as code
- [ ] Connect, Schema Registry, Flink UIs authenticated and private
- [ ] PII minimized; field encryption or masking where required
- [ ] Denied-operation and auth-failure alerts
