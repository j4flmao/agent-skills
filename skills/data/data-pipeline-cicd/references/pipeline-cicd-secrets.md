# Pipeline CI/CD Secrets Management

## Managing Secrets in Data Pipelines

Data pipelines require secure handling of database credentials, API keys, and service account tokens.

### Secret Storage

```python
class SecretManager:
    def __init__(self, backend: SecretBackend):
        self.backend = backend

    def get_connection_string(self, env: str, database: str) -> str:
        secret_path = f"{env}/databases/{database}"
        creds = self.backend.get_secret(secret_path)
        return self._build_connection_string(creds)

    def rotate_credentials(self, env: str, database: str):
        new_password = self._generate_password()
        self.backend.update_secret(
            f"{env}/databases/{database}",
            {"password": new_password},
        )
        self._update_service(env, database, new_password)

    def _build_connection_string(self, creds: dict) -> str:
        return f"postgresql://{creds['username']}:{creds['password']}@" \
               f"{creds['host']}:{creds['port']}/{creds['database']}"
```

### CI/CD Secret Injection

```yaml
# .github/workflows/data-pipeline.yml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1

      - name: Fetch database secrets
        run: |
          echo "DB_URL=$(aws secretsmanager get-secret-value \
            --secret-id ${{ env.ENVIRONMENT }}/database/url \
            --query SecretString --output text)" >> $GITHUB_ENV

      - name: Run dbt
        run: dbt run --profiles-dir . --target ${{ env.ENVIRONMENT }}
        env:
          DBT_USER: ${{ steps.secrets.outputs.DB_USER }}
          DBT_PASSWORD: ${{ steps.secrets.outputs.DB_PASSWORD }}
```

## Secret Rotation

```python
class AutomaticSecretRotation:
    def __init__(self, schedule: str = "0 0 1 * *"):
        self.schedule = schedule
        self.rotation_log: list[RotationEvent] = []

    def rotate_all(self):
        for secret in self._list_secrets():
            if self._should_rotate(secret):
                old_version = secret.current_version
                new_version = self.backend.rotate(secret.path)
                self._test_new_credentials(secret.path, new_version)
                self.rotation_log.append(RotationEvent(
                    secret=secret.path,
                    old_version=old_version,
                    new_version=new_version,
                    timestamp=datetime.utcnow(),
                ))

    def _should_rotate(self, secret: Secret) -> bool:
        age = datetime.utcnow() - secret.last_rotated
        return age.days >= 90
```

## Key Points

- Never hardcode secrets in pipeline code or configuration
- Use cloud secret managers: AWS Secrets Manager, GCP Secret Manager, Azure Key Vault
- Inject secrets as environment variables at CI/CD runtime
- Automatic rotation every 90 days for database credentials
- Test new credentials before removing old ones
- Audit log for all secret access and rotation events
- Role-based access to secrets with least privilege
- Separate secrets per environment (dev/staging/prod)
- Encrypt secrets at rest and in transit
- Emergency rotation procedure for compromised secrets
