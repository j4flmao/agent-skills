# Warehouse Data Sharing

## Sharing Data Across Warehouses

Modern data warehouses support direct data sharing without data copying.

### Data Sharing Models

```python
from enum import Enum
from dataclasses import dataclass

class SharingModel(Enum):
    DIRECT_SHARE = "direct_share"         # Same platform sharing
    READER_ACCOUNT = "reader_account"     # Cross-account sharing
    MARKETPLACE = "marketplace"           # Public listing
    SECURE_VIEW = "secure_view"           # View-based sharing

@dataclass
class ShareConfiguration:
    model: SharingModel
    provider: str
    consumer: str
    objects: list[str]    # Tables/views to share
    sharing_grants: list[str]  # SELECT, REFERENCE
    secure: bool = True

class DataSharingManager:
    def __init__(self, warehouse: WarehouseClient):
        self.warehouse = warehouse

    def create_share(self, config: ShareConfiguration):
        if config.model == SharingModel.DIRECT_SHARE:
            return self._create_direct_share(config)
        elif config.model == SharingModel.READER_ACCOUNT:
            return self._create_reader_account(config)

    def _create_direct_share(self, config: ShareConfiguration):
        for obj in config.objects:
            self.warehouse.execute(f"""
                CREATE OR REPLACE SHARE {config.consumer}_share
                USING DATABASE {config.provider};
                GRANT SELECT ON {obj} TO SHARE {config.consumer}_share;
            """)
```

### Cross-Platform Sharing

```python
class CrossPlatformSharing:
    def setup_delta_sharing(self, table_path: str, recipients: list[str]):
        config = {
            "shareCredentialsVersion": 1,
            "endpoint": "https://sharing.example.com/delta-sharing",
            "shares": [{
                "name": "analytics_share",
                "schemas": [{
                    "name": "public",
                    "tables": [{
                        "name": table_path.split("/")[-1],
                        "location": table_path,
                        "id": str(uuid.uuid4()),
                    }],
                }],
            }],
        }

        for recipient in recipients:
            config["shares"][0]["recipients"] = [{
                "identifier": recipient,
                "token": self._generate_access_token(recipient),
            }]

        return config
```

## Key Points

- Four sharing models: direct share, reader account, marketplace, secure view
- Direct share for same-platform sharing (Snowflake, BigQuery)
- Reader accounts for cross-organization sharing
- Delta Sharing enables cross-platform sharing
- Secure views restrict data at row/column level
- Share can include tables, views, and materialized views
- Grants can be SELECT, REFERENCE, or custom
- Cost billed to provider for compute, consumer for storage
- Shares are real-time with no data copying
- Revocable at any time with immediate effect
