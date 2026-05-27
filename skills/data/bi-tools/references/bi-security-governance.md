# BI Security and Governance

## Governance Framework
BI governance ensures that data access, content management, and usage comply with organizational policies and regulatory requirements.

## Row-Level Security

### Tableau RLS
```yaml
# Tableau row-level security configuration
permissions:
  - table: orders
    user_column: sales_rep_id
    mapping:
      - user: "alice@company.com"
        value: 123
      - user: "bob@company.com"
        value: 456

  - table: customers
    user_column: region
    mapping:
      - group: "us_team"
        value: "North America"
      - group: "eu_team"
        value: "Europe"
      - group: "management"
        all: true
```

### Looker Access Grants
```lookml
# Looker access grant
access_grant: company_region {
  user_attribute: region
  allowed_values: ["North America", "Europe", "Asia Pacific"]
}

view: orders {
  sql_table_name: analytics.orders ;;

  dimension: region {
    type: string
    sql: ${TABLE}.region ;;
  }

  # Apply access filter
  access_filter: {
    field: region
    user_attribute: region
  }

  measure: total_revenue {
    type: sum
    sql: ${TABLE}.total_amount ;;
  }
}
```

## Content Governance

### Content Certification
```python
class ContentCertification:
    def __init__(self, bi_service):
        self.service = bi_service

    def certify_content(self, content_id, certifier_id, checks_passed):
        certification = {
            "content_id": content_id,
            "certifier": certifier_id,
            "certified_at": datetime.utcnow().isoformat(),
            "certification_type": "certified",
            "checks": checks_passed,
            "expires_at": (datetime.utcnow() + timedelta(days=180)).isoformat()
        }

        self.service.set_content_certification(
            content_id=content_id,
            certification=certification
        )
        return certification

    def verify_certification_status(self, content_id):
        cert = self.service.get_content_certification(content_id)
        if not cert:
            return {"status": "uncertified"}
        if datetime.fromisoformat(cert["expires_at"]) < datetime.utcnow():
            return {"status": "expired", "certification": cert}
        return {"status": cert["certification_type"], "certification": cert}
```

## Key Points
- Implement row-level security based on user attributes and roles
- Certify dashboards and reports for production usage
- Set up content approval workflows for changes
- Audit all data access and content changes
- Implement granular permission models (viewer, editor, admin)
- Enforce data source certification and approval
- Monitor for unusual access patterns and data exfiltration
- Support data masking for sensitive fields
- Implement session timeout and IP-based restrictions
- Regular governance reviews and access audits
