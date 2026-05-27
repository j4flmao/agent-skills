# Data Discovery & Classification

## Data Discovery Fundamentals

### Structured vs Unstructured Data

| Aspect | Structured Data | Unstructured Data |
|--------|----------------|-------------------|
| Format | Tables, rows, columns, fixed schema | Documents, images, emails, free text |
| Examples | Databases, spreadsheets, CSV files | PDFs, Word docs, images, audio files |
| Discovery | Schema scanning, table enumeration | Content crawling, text extraction |
| Metadata | Column names, data types, constraints | File properties, content analysis |
| Volume | Typically smaller, well-organized | Typically larger, varied formats |
| Searchability | SQL queries, indexed columns | Full-text search, OCR, NLP |

### On-Premise vs Cloud Discovery

| Dimension | On-Premise | Cloud |
|-----------|------------|-------|
| Access method | Network scanning, agent-based | API-based, service integrations |
| Discovery scope | Internal network boundaries | Multi-account, multi-region |
| Tooling | Varonis, Symantec, Spirion | AWS Macie, Azure Purview, Google DLP |
| Scalability | Limited by infrastructure | Elastic, auto-scaling |
| Shadow data detection | Network traffic analysis | API enumeration, permissions review |

### Shadow Data

Shadow data refers to information stored in unauthorized or unmanaged locations outside of sanctioned IT infrastructure.

```
Sources of Shadow Data:
├── Personal cloud storage (Google Drive, Dropbox, OneDrive personal)
├── Unsanctioned SaaS applications
├── Local drives and USB devices
├── Personal email accounts
├── DevOps tools (unsecured S3 buckets, pastebins)
└── Collaboration tools without IT oversight
```

Detection techniques:
- Network traffic analysis to identify unknown data flows
- Cloud API enumeration to discover resources without tags
- DLP agent telemetry from endpoints
- CASB integration for SaaS shadow IT discovery
- DNS log analysis for unknown service endpoints

## Discovery Techniques

### Network Scanning

```python
import nmap
import json

def scan_for_data_services(network_range: str) -> list:
    nm = nmap.PortScanner()
    nm.scan(
        hosts=network_range,
        arguments='-sV -p 1433,3306,5432,27017,9200,5984,6379'
    )
    services = []
    for host in nm.all_hosts():
        for proto in nm[host].all_protocols():
            ports = nm[host][proto].keys()
            for port in ports:
                service = nm[host][proto][port]
                services.append({
                    'host': host,
                    'port': port,
                    'name': service['name'],
                    'product': service['product'],
                    'version': service['version']
                })
    return services

# Common data service ports
DATABASE_PORTS = {
    1433: 'MSSQL',
    1521: 'Oracle',
    3306: 'MySQL',
    5432: 'PostgreSQL',
    27017: 'MongoDB',
    6379: 'Redis',
    9200: 'Elasticsearch',
    9042: 'Cassandra',
    5439: 'Redshift',
    8443: 'Snowflake'
}
```

### Database Scanning

```python
import sqlalchemy as sa
from sqlalchemy import inspect

def discover_database_schema(connection_string: str) -> dict:
    engine = sa.create_engine(connection_string)
    inspector = inspect(engine)
    schema = {}
    for table_name in inspector.get_table_names():
        columns = inspector.get_columns(table_name)
        schema[table_name] = [
            {
                'name': col['name'],
                'type': str(col['type']),
                'nullable': col.get('nullable', True),
                'primary_key': col.get('primary_key', False)
            }
            for col in columns
        ]
    return schema

def scan_for_sensitive_columns(connection_string: str, patterns: dict) -> list:
    engine = sa.create_engine(connection_string)
    inspector = inspect(engine)
    findings = []
    for table in inspector.get_table_names():
        for col in inspector.get_columns(table):
            col_lower = col['name'].lower()
            for category, keywords in patterns.items():
                if any(kw in col_lower for kw in keywords):
                    findings.append({
                        'table': table,
                        'column': col['name'],
                        'category': category,
                        'type': str(col['type'])
                    })
    return findings

SENSITIVE_COLUMN_PATTERNS = {
    'pii': ['ssn', 'social', 'passport', 'driver', 'license', 'national_id'],
    'financial': ['credit_card', 'cc_', 'card_number', 'cvv', 'cvc', 'account_num'],
    'phi': ['diagnosis', 'medical', 'patient', 'health', 'treatment', 'prescription'],
    'contact': ['email', 'phone', 'mobile', 'telephone', 'address', 'zip']
}
```

### File System Crawling

```python
import os
import re
import hashlib
from pathlib import Path

FILE_TYPE_PATTERNS = {
    'documents': ['.pdf', '.docx', '.doc', '.xlsx', '.pptx', '.txt'],
    'spreadsheets': ['.xls', '.xlsx', '.csv', '.tsv'],
    'code': ['.py', '.js', '.java', '.sql', '.yaml', '.json', '.xml'],
    'archives': ['.zip', '.tar', '.gz', '.rar', '.7z'],
    'images': ['.jpg', '.png', '.gif', '.tiff', '.bmp']
}

SENSITIVE_DATA_PATTERNS = {
    'ssn': r'\b\d{3}-\d{2}-\d{4}\b',
    'credit_card': r'\b(?:\d[ -]*?){13,16}\b',
    'email': r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
    'phone': r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b',
    'ip_address': r'\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b'
}

def crawl_file_system(root_path: str, max_depth: int = 5) -> list:
    findings = []
    root = Path(root_path)
    depth = 0
    for path in root.rglob('*'):
        if not path.is_file():
            continue
        rel_path = path.relative_to(root)
        depth = len(rel_path.parts)
        if depth > max_depth:
            continue
        ext = path.suffix.lower()
        size = path.stat().st_size
        finding = {
            'path': str(rel_path),
            'extension': ext,
            'size_bytes': size,
            'modified': path.stat().st_mtime,
            'hash': hashlib.sha256(path.read_bytes()).hexdigest()
        }
        findings.append(finding)
    return findings

def content_scan_for_sensitive_data(file_path: str) -> dict:
    sensitive_types = {}
    try:
        with open(file_path, 'r', errors='ignore') as f:
            content = f.read()
        for data_type, pattern in SENSITIVE_DATA_PATTERNS.items():
            matches = re.findall(pattern, content)
            if matches:
                sensitive_types[data_type] = len(matches)
    except Exception:
        pass
    return sensitive_types
```

### Cloud API Enumeration

```python
import boto3
from botocore.exceptions import ClientError

def enumerate_aws_data_resources(account_id: str) -> dict:
    resources = {
        's3_buckets': [],
        'rds_instances': [],
        'dynamodb_tables': [],
        'redshift_clusters': [],
        'glue_databases': []
    }
    s3 = boto3.client('s3')
    try:
        buckets = s3.list_buckets().get('Buckets', [])
        for bucket in buckets:
            try:
                tags = s3.get_bucket_tagging(Bucket=bucket['Name'])
                tag_dict = {t['Key']: t['Value'] for t in tags.get('TagSet', [])}
            except ClientError:
                tag_dict = {}
            resources['s3_buckets'].append({
                'name': bucket['Name'],
                'created': bucket['CreationDate'],
                'tags': tag_dict,
                'encryption': check_bucket_encryption(bucket['Name']),
                'public_access': check_bucket_public_access(bucket['Name'])
            })
    except ClientError as e:
        print(f'Access denied: {e}')
    return resources

def check_bucket_encryption(bucket_name: str) -> bool:
    s3 = boto3.client('s3')
    try:
        s3.get_bucket_encryption(Bucket=bucket_name)
        return True
    except ClientError:
        return False

def check_bucket_public_access(bucket_name: str) -> dict:
    s3 = boto3.client('s3')
    try:
        policy = s3.get_bucket_policy_status(Bucket=bucket_name)
        return policy.get('PolicyStatus', {}).get('IsPublic', False)
    except ClientError:
        return {'IsPublic': False}
```

## Structured Data Discovery

### SQL Databases

| Database | Discovery Method | Metadata Available |
|----------|-----------------|-------------------|
| PostgreSQL | `INFORMATION_SCHEMA`, `pg_catalog` | Tables, columns, types, constraints, views |
| MySQL | `INFORMATION_SCHEMA` | Tables, columns, indexes, foreign keys |
| SQL Server | `sys.objects`, `INFORMATION_SCHEMA` | Schemas, tables, stored procedures, triggers |
| Oracle | `ALL_TABLES`, `ALL_TAB_COLUMNS` | Tablespaces, partitions, indexes, sequences |

```sql
-- PostgreSQL schema discovery
SELECT
    table_schema,
    table_name,
    column_name,
    data_type,
    is_nullable,
    character_maximum_length
FROM information_schema.columns
WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
ORDER BY table_schema, table_name, ordinal_position;

-- Discover sensitive column names
SELECT
    table_schema,
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE LOWER(column_name) IN (
    'ssn', 'credit_card', 'card_number', 'cvv',
    'password', 'secret', 'token', 'pin',
    'passport_number', 'driver_license', 'bank_account',
    'routing_number', 'tax_id', 'ein', 'national_id'
);
```

### NoSQL Databases

```python
# MongoDB schema discovery
from pymongo import MongoClient

def discover_mongodb_schemas(uri: str) -> dict:
    client = MongoClient(uri)
    schemas = {}
    for db_name in client.list_database_names():
        db = client[db_name]
        for coll_name in db.list_collection_names():
            sample = db[coll_name].find_one()
            if sample:
                fields = {}
                def extract_fields(doc, prefix=''):
                    for key, value in doc.items():
                        full_key = f'{prefix}.{key}' if prefix else key
                        fields[full_key] = type(value).__name__
                        if isinstance(value, dict):
                            extract_fields(value, full_key)
                        elif isinstance(value, list) and len(value) > 0:
                            if isinstance(value[0], dict):
                                extract_fields(value[0], f'{full_key}[]')
                extract_fields(sample)
                schemas[f'{db_name}.{coll_name}'] = fields
    return schemas
```

### Data Warehouses

| Platform | Discovery Approach | Key Considerations |
|----------|-------------------|-------------------|
| Snowflake | `INFORMATION_SCHEMA`, `ACCOUNT_USAGE` | Virtual warehouses, data sharing, stages |
| Redshift | `PG_TABLE_DEF`, `SVV_COLUMNS` | Sort keys, distribution styles, compression |
| BigQuery | `INFORMATION_SCHEMA`, Data Catalog | Partitioning, clustering, authorized views |
| Synapse | `sys.objects`, `INFORMATION_SCHEMA` | Distribution, partitions, materialized views |

### Data Lakes

```python
def catalog_data_lake(bucket_uri: str) -> dict:
    import boto3
    s3 = boto3.client('s3')
    bucket = bucket_uri.replace('s3://', '').split('/')[0]
    prefix = '/'.join(bucket_uri.replace('s3://', '').split('/')[1:])
    catalog = {
        'tables': [],
        'formats': set(),
        'partitions': [],
        'total_size_bytes': 0
    }
    paginator = s3.get_paginator('list_objects_v2')
    for page in paginator.paginate(Bucket=bucket, Prefix=prefix, Delimiter='/'):
        if 'CommonPrefixes' in page:
            for p in page['CommonPrefixes']:
                catalog['partitions'].append(p['Prefix'])
        if 'Contents' in page:
            for obj in page['Contents']:
                ext = obj['Key'].split('.')[-1].lower()
                catalog['formats'].add(ext)
                catalog['total_size_bytes'] += obj['Size']
    catalog['formats'] = list(catalog['formats'])
    return catalog
```

## Unstructured Data Discovery

### File Shares

SMB and NFS shares are common repositories for unstructured sensitive data.

```python
import smbclient

def scan_smb_share(share_path: str, username: str, password: str) -> list:
    smbclient.register_session(share_path.split('\\')[0], username=username, password=password)
    files = []
    def walk(path):
        for entry in smbclient.listdir(path):
            full_path = f'{path}\\{entry}'
            try:
                stat = smbclient.stat(full_path)
                files.append({
                    'path': full_path,
                    'size': stat.st_size,
                    'modified': stat.st_mtime,
                    'is_directory': stat.st_mode & 0x4000 != 0
                })
                if stat.st_mode & 0x4000 != 0:
                    walk(full_path)
            except Exception:
                pass
    walk(share_path)
    return files
```

### SharePoint and Microsoft 365

```python
from office365.sharepoint.client_context import ClientContext
from office365.runtime.auth.client_credential import ClientCredential

def discover_sharepoint_data(site_url: str, client_id: str, client_secret: str) -> list:
    credentials = ClientCredential(client_id, client_secret)
    ctx = ClientContext(site_url).with_credentials(credentials)
    web = ctx.web
    ctx.load(web)
    ctx.execute_query()
    libraries = []
    lists = web.lists
    ctx.load(lists)
    ctx.execute_query()
    for lst in lists:
        if lst.base_template == 101:
            items = lst.items
            ctx.load(items)
            ctx.execute_query()
            libraries.append({
                'title': lst.title,
                'item_count': lst.item_count,
                'items': [{'id': i.id, 'title': i.properties.get('Title', '')} for i in items]
            })
    return libraries
```

### Email Discovery

```python
import imaplib
import email
from email.utils import parsedate_to_datetime

def scan_mailbox(server: str, username: str, password: str, folder: str = 'INBOX') -> list:
    mail = imaplib.IMAP4_SSL(server)
    mail.login(username, password)
    mail.select(folder)
    _, message_ids = mail.search(None, 'ALL')
    messages = []
    for mid in message_ids[0].split()[-100:]:
        _, data = mail.fetch(mid, '(RFC822)')
        raw_email = email.message_from_bytes(data[0][1])
        messages.append({
            'from': raw_email['From'],
            'to': raw_email['To'],
            'subject': raw_email['Subject'],
            'date': str(parsedate_to_datetime(raw_email['Date'])),
            'has_attachments': raw_email.get_content_maintype() == 'multipart'
        })
    return messages
```

## Cloud Data Discovery

### AWS Macie

```python
import boto3

def aws_macie_discovery(bucket_names: list) -> dict:
    macie2 = boto3.client('macie2')
    results = {}
    for bucket in bucket_names:
        try:
            job = macie2.create_classification_job(
                name=f'discovery-{bucket}',
                jobType='ONE_TIME',
                s3JobDefinition={
                    'bucketDefinitions': [{
                        'accountId': boto3.client('sts').get_caller_identity()['Account'],
                        'buckets': [bucket]
                    }]
                }
            )
            results[bucket] = {'job_id': job['jobId'], 'status': 'CREATED'}
        except Exception as e:
            results[bucket] = {'error': str(e)}
    return results

def get_macie_findings() -> list:
    macie2 = boto3.client('macie2')
    findings = []
    paginator = macie2.get_paginator('list_findings')
    for page in paginator.paginate():
        if page.get('findingIds'):
            for finding_id in page['findingIds']:
                finding = macie2.get_finding(findingId=finding_id)
                findings.append({
                    'id': finding_id,
                    'type': finding.get('classificationDetails', {}).get('result', {}).get('sensitiveData', []),
                    'severity': finding.get('severity', {}).get('description'),
                    'bucket': finding.get('resourcesAffected', {}).get('s3Bucket', {}).get('name'),
                    'key': finding.get('resourcesAffected', {}).get('s3Object', {}).get('key')
                })
    return findings
```

### Azure Purview

```python
from azure.identity import DefaultAzureCredential
from azure.mgmt.purview import PurviewManagementClient
from azure.mgmt.purview.models import *

def discover_azure_data_sources(subscription_id: str, resource_group: str, purview_account: str) -> dict:
    credential = DefaultAzureCredential()
    client = PurviewManagementClient(credential, subscription_id)
    sources = {}
    account = client.accounts.get(resource_group, purview_account)
    sources['account'] = {
        'name': account.name,
        'location': account.location,
        'sku': account.sku.name if account.sku else None
    }
    return sources
```

### Google Cloud DLP

```python
from google.cloud import dlp_v2

def inspect_gcs_bucket(project_id: str, bucket_name: str) -> list:
    dlp = dlp_v2.DlpServiceClient()
    parent = f'projects/{project_id}/locations/global'
    inspect_config = {
        'info_types': [
            {'name': 'CREDIT_CARD_NUMBER'},
            {'name': 'EMAIL_ADDRESS'},
            {'name': 'US_SOCIAL_SECURITY_NUMBER'},
            {'name': 'PHONE_NUMBER'},
            {'name': 'PERSON_NAME'},
            {'name': 'US_BANK_ACCOUNT_NUMBER'},
            {'name': 'US_INDIVIDUAL_TAXPAYER_IDENTIFICATION_NUMBER'},
            {'name': 'MEDICAL_RECORD_NUMBER'},
            {'name': 'US_HEALTHCARE_NPI'},
            {'name': 'LOCATION'},
            {'name': 'DATE_OF_BIRTH'}
        ],
        'min_likelihood': dlp_v2.Likelihood.POSSIBLE,
        'include_quoting': True
    }
    storage_config = {
        'cloud_storage_options': {
            'file_set': {
                'url': f'gs://{bucket_name}/*'
            }
        }
    }
    job = dlp.create_dlp_job(
        request={
            'parent': parent,
            'inspect_job': {
                'inspect_config': inspect_config,
                'storage_config': storage_config
            }
        }
    )
    return job

def inspect_bigquery_table(project_id: str, dataset_id: str, table_id: str) -> dict:
    dlp = dlp_v2.DlpServiceClient()
    parent = f'projects/{project_id}/locations/global'
    inspect_config = {
        'info_types': [{'name': 'US_SOCIAL_SECURITY_NUMBER'}],
        'min_likelihood': dlp_v2.Likelihood.LIKELY
    }
    storage_config = {
        'big_query_options': {
            'table_reference': {
                'project_id': project_id,
                'dataset_id': dataset_id,
                'table_id': table_id
            }
        }
    }
    job = dlp.create_dlp_job(
        request={
            'parent': parent,
            'inspect_job': {
                'inspect_config': inspect_config,
                'storage_config': storage_config
            }
        }
    )
    return job
```

## Data Classification Taxonomy

### Classification Levels

| Level | Label | Definition | Examples | Handling Requirements |
|-------|-------|------------|----------|-----------------------|
| 1 | Public | No harm if disclosed | Press releases, job postings, marketing materials | No special controls |
| 2 | Internal | Limited harm | Internal policies, org charts, project plans | Access control, no external sharing |
| 3 | Confidential | Significant harm | Financial results, customer lists, strategic plans | Encryption, access control, audit logging |
| 4 | Restricted | Severe harm | PII, PHI, payment data, trade secrets | Encryption, strict access, masking, monitoring |

### Regulatory Data Categories

| Category | Regulation | Examples | Classification Level |
|----------|------------|----------|---------------------|
| PII | GDPR, CCPA, LGPD | Name, email, IP address, SSN | Restricted |
| PHI | HIPAA, HITECH | Medical records, diagnoses, prescriptions | Restricted |
| PCI | PCI DSS | Credit card numbers, CVV, track data | Restricted |
| IP | Trade secret laws | Source code, patents, formulas | Confidential/Restricted |
| Financial | SOX, GLBA | Bank accounts, transaction records | Confidential |
| Education | FERPA | Student records, grades, transcripts | Restricted |
| Children | COPPA | Data from children under 13 | Restricted |

### Sensitive Data Types Reference

```
PII (Personally Identifiable Information):
├── Direct identifiers: SSN, passport number, driver's license, national ID
├── Contact info: email, phone number, physical address
├── Digital identifiers: IP address, device ID, cookies, location data
├── Biometric: fingerprints, facial recognition data, voiceprints
└── Financial identifiers: bank account, credit card numbers

PHI (Protected Health Information):
├── Demographics: name, address, DOB, gender
├── Medical history: diagnoses, treatments, medications
├── Insurance: policy numbers, coverage details, claims
├── Clinical data: lab results, imaging, genetic information
└── Provider info: doctor names, facility names, dates of service

PCI (Payment Card Industry):
├── Cardholder data: PAN, cardholder name, expiration, service code
├── Sensitive authentication: CVV, PIN, full track data
└── Transaction data: amounts, merchant IDs, authorization codes
```

## Classification Criteria

### Regulatory Requirements

| Regulation | Classification Requirement | Enforcement |
|------------|--------------------------|-------------|
| GDPR Art. 9 | Special categories of personal data | Fines up to 4% of global turnover |
| CCPA Sec. 1798.100 | Categories of personal information collected | Civil penalties per violation |
| HIPAA Privacy Rule 45 CFR 164 | Individually identifiable health information | Fines up to $1.5M per violation |
| PCI DSS Req. 9 | Cardholder data environment scope | Fines up to $500K per incident |

### Business Impact Criteria

```
Classification Decision Matrix:

Is the data subject to regulation?
    ├── Yes → Minimum classification: Restricted
    ├── No → Continue
Would disclosure cause financial harm?
    ├── Yes → Minimum classification: Confidential
    ├── No → Continue
Would disclosure cause reputational harm?
    ├── Yes → Minimum classification: Internal
    ├── No → Classification: Public
```

### Data Sensitivity Factors

| Factor | Low Sensitivity | Medium Sensitivity | High Sensitivity |
|--------|----------------|-------------------|------------------|
| Aggregation | Individual non-sensitive | Aggregates of PII | Raw PII |
| Identifiability | Anonymized | Pseudonymized | Direct identifiers |
| Context | Public knowledge | Internal use only | Confidential |
| Volume | Single record | Limited set | Full dataset |
| Source | Public source | Internal source | Regulated source |

### Access Scope Criteria

- **Public**: No authentication required, accessible to anyone
- **Internal**: Authenticated employees, standard NDAs
- **Confidential**: Role-based access, business need-to-know
- **Restricted**: Named individuals, explicit approval, just-in-time access

## Automated Classification

### Content Inspection

```python
import re
import json

class ContentClassifier:
    def __init__(self):
        self.patterns = {
            'credit_card': re.compile(
                r'\b(?:4[0-9]{12}(?:[0-9]{3})?|'
                r'5[1-5][0-9]{14}|'
                r'3[47][0-9]{13}|'
                r'6(?:011|5[0-9]{2})[0-9]{12})\b'
            ),
            'ssn': re.compile(r'\b(?!000|666|9\d{2})\d{3}-(?!00)\d{2}-(?!0000)\d{4}\b'),
            'email': re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'),
            'phone_us': re.compile(r'\b\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b'),
            'ip_address': re.compile(r'\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b'),
            'medical_record': re.compile(r'\bMRN[-\s]?\d{6,10}\b', re.IGNORECASE),
            'passport': re.compile(r'\b[A-Z]{1,2}\d{6,9}\b'),
            'drivers_license': re.compile(r'\b[A-Z]\d{3,8}[A-Z0-9]{0,4}\b')
        }

    def classify_content(self, text: str) -> dict:
        findings = {}
        for data_type, pattern in self.patterns.items():
            matches = pattern.findall(text)
            if matches:
                findings[data_type] = {
                    'count': len(matches),
                    'samples': list(set(matches))[:3],
                    'confidence': self._calculate_confidence(data_type, matches)
                }
        return findings

    def _calculate_confidence(self, data_type: str, matches: list) -> str:
        if data_type == 'credit_card':
            valid = [m for m in matches if self._luhn_check(m.replace('-', '').replace(' ', ''))]
            if valid:
                return 'HIGH'
        if data_type == 'email':
            return 'HIGH'
        return 'MEDIUM'

    def _luhn_check(self, card_number: str) -> bool:
        digits = [int(d) for d in card_number]
        checksum = 0
        for i, digit in enumerate(reversed(digits)):
            if i % 2 == 1:
                digit *= 2
                if digit > 9:
                    digit -= 9
            checksum += digit
        return checksum % 10 == 0
```

### Regex Patterns Library

```python
SENSITIVE_DATA_PATTERNS = {
    'US_SSN': r'\b(?!000|666|9\d{2})\d{3}-(?!00)\d{2}-(?!0000)\d{4}\b',
    'US_ITIN': r'\b9\d{2}-7\d-\d{4}\b',
    'US_EIN': r'\b\d{2}-\d{7}\b',
    'CREDIT_CARD_VISA': r'\b4[0-9]{12}(?:[0-9]{3})?\b',
    'CREDIT_CARD_MC': r'\b5[1-5][0-9]{14}\b',
    'CREDIT_CARD_AMEX': r'\b3[47][0-9]{13}\b',
    'CREDIT_CARD_DISCOVER': r'\b6(?:011|5[0-9]{2})[0-9]{12}\b',
    'EMAIL': r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
    'PHONE_US': r'\b\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b',
    'PHONE_INTL': r'\b\+?\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}\b',
    'IP_ADDRESS': r'\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b',
    'MAC_ADDRESS': r'\b([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})\b',
    'DATE_OF_BIRTH': r'\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b',
    'PASSPORT_US': r'\b\d{9}\b',
    'BANK_ACCOUNT_US': r'\b\d{8,17}\b',
    'ROUTING_NUMBER_US': r'\b\d{9}\b',
    'DRIVERS_LICENSE_US': r'\b[A-Z]\d{3,8}[A-Z0-9]{0,4}\b',
    'MEDICAL_RECORD': r'\bMRN[-\s]?\d{6,10}\b',
    'HEALTH_INSURANCE_ID': r'\b\d{3}-\d{2}-\d{4}-\d{3}\b',
    'API_KEY': r'\b(?:api[_-]?key|apikey)[=:]["\']?[A-Za-z0-9_\-]{16,64}["\']?\b',
    'AWS_ACCESS_KEY': r'\bAKIA[0-9A-Z]{16}\b',
    'AWS_SECRET_KEY': r'(?i)aws(.{0,20})?(?-i)[''"\s][A-Za-z0-9\/+=]{40}[''"\s]',
    'PRIVATE_KEY': r'-----BEGIN\s?(RSA|DSA|EC|OPENSSH|PGP)?\s?PRIVATE KEY-----',
    'JWT_TOKEN': r'\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b',
    'STREET_ADDRESS': r'\b\d{1,5}\s[A-Za-z0-9\s.,#-]{5,100}\b',
    'ZIP_CODE_US': r'\b\d{5}(?:-\d{4})?\b',
    'LATITUDE_LONGITUDE': r'\b[-+]?\d{1,2}\.\d{4,},\s*[-+]?\d{1,3}\.\d{4,}\b',
    'USER_AGENT': r'\bMozilla/5\.0\s\([^)]+\)\s',
    'COOKIE_SESSION': r'(?:session|token|auth)[\s=:]["\']?[A-Za-z0-9%]{20,}["\']?',
    'GITHUB_TOKEN': r'\bgh[pousr]_[A-Za-z0-9_]{36,}\b',
    'SLACK_TOKEN': r'\bxox[baprs]-[A-Za-z0-9-]{10,}\b',
    'GOOGLE_API_KEY': r'\bAIza[0-9A-Za-z\-_]{35}\b',
    'PASSWORD_IN_TEXT': r'(?:password|passwd|pwd)\s*[=:]\s*\S+'
}
```

### Machine Learning Classifiers

```python
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier
import joblib

class MLDataClassifier:
    def __init__(self):
        self.vectorizer = TfidfVectorizer(max_features=5000, ngram_range=(1, 3))
        self.classifier = RandomForestClassifier(n_estimators=100, random_state=42)
        self.trained = False

    def train(self, documents: list, labels: list):
        features = self.vectorizer.fit_transform(documents)
        self.classifier.fit(features, labels)
        self.trained = True

    def classify(self, document: str) -> tuple:
        if not self.trained:
            raise RuntimeError('Model not trained')
        features = self.vectorizer.transform([document])
        prediction = self.classifier.predict(features)[0]
        probabilities = self.classifier.predict_proba(features)[0]
        confidence = max(probabilities)
        return prediction, confidence

    def save_model(self, path: str):
        joblib.dump({'vectorizer': self.vectorizer, 'classifier': self.classifier}, path)

    def load_model(self, path: str):
        data = joblib.load(path)
        self.vectorizer = data['vectorizer']
        self.classifier = data['classifier']
        self.trained = True

# Example usage for NLP-based PII detection
def train_pii_classifier():
    samples = [
        ('My SSN is 123-45-6789 and I live at 123 Main St.', 'contains_pii'),
        ('The meeting is at 3 PM tomorrow.', 'no_pii'),
        ('Please send the report to john.doe@company.com.', 'contains_pii'),
        ('Quarterly revenue increased by 15%.', 'no_pii'),
    ]
    texts, labels = zip(*samples)
    classifier = MLDataClassifier()
    classifier.train(list(texts), list(labels))
    return classifier
```

### Fingerprinting

```python
import hashlib
import json

class DataFingerprinter:
    def __init__(self):
        self.fingerprints = {}

    def generate_column_fingerprint(self, values: list, algorithm: str = 'sha256') -> str:
        serialized = json.dumps(sorted(set(values)), sort_keys=True)
        return hashlib.new(algorithm, serialized.encode()).hexdigest()

    def generate_file_fingerprint(self, file_path: str) -> str:
        hasher = hashlib.sha256()
        with open(file_path, 'rb') as f:
            for chunk in iter(lambda: f.read(65536), b''):
                hasher.update(chunk)
        return hasher.hexdigest()

    def generate_schema_fingerprint(self, schema: dict) -> str:
        schema_str = json.dumps(schema, sort_keys=True)
        return hashlib.sha256(schema_str.encode()).hexdigest()

    def register_fingerprint(self, data_id: str, fingerprint: str, metadata: dict):
        self.fingerprints[data_id] = {
            'fingerprint': fingerprint,
            'metadata': metadata,
            'registered_at': __import__('datetime').datetime.utcnow().isoformat()
        }

    def find_matches(self, fingerprint: str, threshold: float = 1.0) -> list:
        matches = []
        for data_id, info in self.fingerprints.items():
            if info['fingerprint'] == fingerprint:
                matches.append(data_id)
        return matches
```

## Manual Classification

### Data Owner Assignment

```
Data Ownership Model:
├── Data Trustee (Executive)
│   └── Ultimate accountability for data assets
├── Data Steward (Business)
│   └── Defines classification, quality rules, usage policies
├── Data Custodian (Technical)
│   └── Implements controls, manages access, ensures protection
└── Data Owner (Creator/Collector)
    └── Assigns initial classification, manages within business context
```

### User-Based Labeling

```python
class ManualClassificationWorkflow:
    def __init__(self):
        self.classification_options = {
            'public': {'sensitivity': 1, 'controls': []},
            'internal': {'sensitivity': 2, 'controls': ['access_control']},
            'confidential': {'sensitivity': 3, 'controls': ['access_control', 'encryption', 'audit']},
            'restricted': {'sensitivity': 4, 'controls': ['access_control', 'encryption', 'audit', 'masking', 'mfa']}
        }

    def prompt_classification(self, data_context: dict) -> str:
        print(f'Data: {data_context.get("name")}')
        print(f'Source: {data_context.get("source")}')
        print('Select classification level:')
        for level, info in self.classification_options.items():
            print(f'  {level} Sensitivity={info["sensitivity"]}')
        choice = input('Classification: ').strip().lower()
        if choice in self.classification_options:
            return choice
        return 'internal'

    def record_classification(self, data_id: str, level: str, user: str, justification: str):
        return {
            'data_id': data_id,
            'classification': level,
            'classified_by': user,
            'justification': justification,
            'timestamp': __import__('datetime').datetime.utcnow().isoformat()
        }
```

### Workflow-Based Classification

```
Classification Workflow:
1. Data Creation
   ├── Auto-tag based on source system
   └── Default classification: Internal
2. Review Period
   ├── Data owner reviews within 30 days
   ├── Adjust classification if needed
   └── Add regulatory tags if applicable
3. Approval
   ├── Data steward validates classification
   ├── Compliance reviews regulatory tags
   └── Classification locked after approval
4. Periodic Review
   ├── Annual reclassification review
   ├── Triggered by regulation changes
   └── Data owner must confirm or update
```

## Classification Tools

### Tool Comparison

| Tool | Capabilities | Deployment | Use Case |
|------|-------------|------------|----------|
| Boldon James | Email classification, document labeling | On-prem, Cloud | Enterprise classification |
| Titus | Email, documents, files classification | On-prem, Cloud | Microsoft 365 integration |
| Varonis | Data discovery, classification, access analytics | On-prem, Cloud | File shares, SharePoint |
| BigID | Automated discovery, ML classification, DSPM | SaaS | Privacy, compliance, security |
| Spirion | Endpoint discovery, sensitive data scanning | On-prem | Endpoint data discovery |
| Microsoft MIP | Unified labeling, Azure Information Protection | Cloud | Microsoft 365 ecosystem |
| AWS Macie | S3 discovery, ML-based classification | Cloud | AWS native classification |
| Azure Purview | Data map, catalog, classification | Cloud | Azure data landscape |
| Google DLP | Content inspection, classification API | Cloud | GCP native, API-driven |
| SecureTrust | Database discovery, classification | On-prem, Cloud | Enterprise databases |
| PKWARE | Compression-encryption-classification | On-prem, Cloud | Mainframe, file systems |
| Nightfall | API-based classification, dev workflow | SaaS | Developer platforms, SaaS |

### Boldon James Configuration

```xml
<!-- Sample classification rule -->
<ClassificationRule name="Email Sensitivity">
  <Conditions>
    <Contains field="subject" value="Confidential" />
    <Contains field="body" value="PRIVILEGED" />
  </Conditions>
  <Actions>
    <SetClassification value="Confidential" />
    <AddHeader name="x-classification" value="CONFIDENTIAL" />
    <Encrypt enabled="true" />
  </Actions>
</ClassificationRule>
```

### Microsoft Information Protection

```powershell
# PowerShell: Configure MIP sensitivity labels
Set-Label -Identity "Confidential" `
    -DisplayName "Confidential" `
    -Tooltip "Sensitive business data" `
    -AdvancedSettings @{color="#FF0000"} `
    -EncryptionEnabled $true `
    -EncryptionProtectionType "Template" `
    -EncryptionTemplateId "c0e6d1f0-3e50-4e3b-9d8a-4b5f2e1c7a3b" `
    -ContentMarkingHeadersEnabled $true `
    -ContentMarkingHeaders "CONFIDENTIAL" `
    -SiteAndGroupProtectionEnabled $true

# Apply label automatically
Add-AutoLabelingRule -Name "PCI Data Detection" `
    -Pattern "Credit Card: \d{16}" `
    -Label "Confidential" `
    -Site $true `
    -Group $true
```

## Labeling and Tagging

### Metadata Tagging

```json
{
  "classification": {
    "level": "confidential",
    "category": "pii",
    "regulatory": ["gdpr", "ccpa"],
    "owner": "data-security-team",
    "retention_days": 365,
    "encryption_required": true,
    "masking_required": true,
    "access_scope": "restricted",
    "data_quality": "verified"
  },
  "discovery": {
    "source": "postgresql://prod-db:5432/customers",
    "discovered_at": "2025-01-15T10:30:00Z",
    "discovered_by": "aws-macie-v2",
    "last_verified": "2025-06-01T00:00:00Z"
  },
  "governance": {
    "data_steward": "jane.doe@company.com",
    "data_owner": "marketing-team",
    "approved_uses": ["marketing_campaigns", "customer_analytics"],
    "prohibited_uses": ["third_party_sharing", "advertising"]
  }
}
```

### Cloud Resource Tags

```hcl
# Terraform: Tag AWS resources with classification
resource "aws_s3_bucket" "data_lake" {
  bucket = "company-data-lake-prod"
  tags = {
    Environment       = "production"
    Classification    = "confidential"
    DataCategory      = "customer-pii"
    Regulatory        = "gdpr,ccpa"
    DataOwner         = "data-engineering"
    RetentionPeriod   = "365"
    EncryptionRequired = "true"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "data_lake" {
  bucket = aws_s3_bucket.data_lake.id
  rule {
    id     = "expire-old-data"
    status = "Enabled"
    expiration {
      days = 365
    }
  }
}
```

```python
# Azure: Tag resources programmatically
from azure.identity import DefaultAzureCredential
from azure.mgmt.resource import ResourceManagementClient

def apply_classification_tags(subscription_id: str, resource_id: str, classification: dict):
    credential = DefaultAzureCredential()
    client = ResourceManagementClient(credential, subscription_id)
    client.tags.create_or_update_at_scope(
        scope=resource_id,
        parameters={
            'properties': {
                'tags': {
                    'classification': classification['level'],
                    'data_category': classification.get('category', 'general'),
                    'regulation': classification.get('regulatory', ''),
                    'owner': classification.get('owner', ''),
                    'retention': str(classification.get('retention_days', ''))
                }
            }
        }
    )
```

```python
# GCP: Label BigQuery tables
from google.cloud import bigquery

def label_bigquery_table(project: str, dataset: str, table: str, labels: dict):
    client = bigquery.Client(project=project)
    table_ref = client.dataset(dataset).table(table)
    table_obj = client.get_table(table_ref)
    table_obj.labels = {
        'classification': labels.get('level', 'internal'),
        'data_type': labels.get('type', 'general'),
        'regulation': labels.get('regulatory', ''),
        'data_owner': labels.get('owner', '')
    }
    client.update_table(table_obj, ['labels'])
```

## Data Lineage

### Lineage Tracking

```python
import json
from datetime import datetime

class DataLineageTracker:
    def __init__(self):
        self.lineage_graph = {}

    def register_source(self, source_id: str, metadata: dict):
        self.lineage_graph[source_id] = {
            'metadata': metadata,
            'transformed_to': [],
            'transformed_from': [],
            'downstream': [],
            'upstream': []
        }

    def register_transformation(self, transformation_id: str, inputs: list, outputs: list, logic: str):
        entry = {
            'transformation_id': transformation_id,
            'inputs': inputs,
            'outputs': outputs,
            'logic': logic,
            'timestamp': datetime.utcnow().isoformat()
        }
        for inp in inputs:
            if inp in self.lineage_graph:
                self.lineage_graph[inp]['downstream'].append(transformation_id)
        for out in outputs:
            if out in self.lineage_graph:
                self.lineage_graph[out]['upstream'].append(transformation_id)

    def trace_downstream(self, data_id: str, depth: int = 3) -> list:
        if depth == 0 or data_id not in self.lineage_graph:
            return []
        results = []
        for downstream in self.lineage_graph[data_id].get('downstream', []):
            results.append(downstream)
            results.extend(self.trace_downstream(downstream, depth - 1))
        return results

    def trace_upstream(self, data_id: str, depth: int = 3) -> list:
        if depth == 0 or data_id not in self.lineage_graph:
            return []
        results = []
        for upstream in self.lineage_graph[data_id].get('upstream', []):
            results.append(upstream)
            results.extend(self.trace_upstream(upstream, depth - 1))
        return results

    def impact_analysis(self, data_id: str) -> dict:
        return {
            'upstream_sources': self.trace_upstream(data_id, 5),
            'downstream_consumers': self.trace_downstream(data_id, 5),
            'direct_transformers': self.lineage_graph.get(data_id, {}).get('transformed_to', [])
        }
```

### Data Flow Mapping

```
Data Flow Documentation Template:
Source System: [System name, database, table]
├── Data elements: [List of fields/columns]
├── Classification: [Public/Internal/Confidential/Restricted]
├── Volume: [Records, size, growth rate]
├── Owner: [Team or individual]
└── PII present: [Yes/No, types]
    ↓
Extract/Transform: [ETL job, pipeline name]
├── Logic: [SQL, transformation rules]
├── Frequency: [Real-time, batch, schedule]
├── Masking applied: [Yes/No, method]
└── Encryption: [Yes/No, key used]
    ↓
Destination System: [Target system, database, table]
├── Usage: [Reporting, API, analytics, ML]
├── Retention: [Duration, archival policy]
├── Access pattern: [Read/Write, users]
└── Downstream dependencies: [List of systems]
```

### Transformation Tracking

```python
def audit_column_transformation(original_table: str, original_col: str,
                                target_table: str, target_col: str,
                                transformation_sql: str) -> dict:
    return {
        'source': f'{original_table}.{original_col}',
        'target': f'{target_table}.{target_col}',
        'transformation': transformation_sql,
        'classification_propagated': True,
        'pseudonymization_applied': False,
        'aggregation_level': 'row_level',
        'verified_at': datetime.utcnow().isoformat()
    }

# Audit lineage for downstream PII propagation
def propagate_pii_classification(lineage: dict, pii_columns: list) -> list:
    warnings = []
    for source_col in pii_columns:
        for entry in lineage.get('edges', []):
            if entry['source'] == source_col:
                if not entry.get('masked') and not entry.get('anonymized'):
                    warnings.append({
                        'source': source_col,
                        'downstream': entry['target'],
                        'risk': 'PII propagated without masking',
                        'recommendation': 'Apply masking or anonymization'
                    })
    return warnings
```

## Data Inventory

### Data Asset Register

```python
class DataAssetRegister:
    def __init__(self):
        self.assets = []

    def register_asset(self, asset: dict):
        required_fields = ['name', 'type', 'location', 'owner', 'classification']
        for field in required_fields:
            if field not in asset:
                raise ValueError(f'Missing required field: {field}')
        asset['registered_at'] = datetime.utcnow().isoformat()
        asset['asset_id'] = hashlib.sha256(
            f'{asset["name"]}{asset["location"]}'.encode()
        ).hexdigest()[:16]
        self.assets.append(asset)

    def query_assets(self, filters: dict) -> list:
        results = self.assets
        for key, value in filters.items():
            results = [a for a in results if a.get(key) == value]
        return results

    def generate_inventory_report(self) -> dict:
        report = {
            'total_assets': len(self.assets),
            'by_classification': {},
            'by_type': {},
            'by_owner': {},
            'unclassified': []
        }
        for asset in self.assets:
            level = asset.get('classification', 'unclassified')
            report['by_classification'][level] = report['by_classification'].get(level, 0) + 1
            atype = asset.get('type', 'unknown')
            report['by_type'][atype] = report['by_type'].get(atype, 0) + 1
            owner = asset.get('owner', 'unassigned')
            report['by_owner'][owner] = report['by_owner'].get(owner, 0) + 1
            if level == 'unclassified':
                report['unclassified'].append(asset['name'])
        return report
```

### Data Catalog Integration

```python
# OpenMetadata or Apache Atlas integration
def push_to_data_catalog(assets: list, catalog_api: str, auth_token: str) -> dict:
    import requests
    headers = {'Authorization': f'Bearer {auth_token}', 'Content-Type': 'application/json'}
    results = {'created': 0, 'updated': 0, 'failed': 0}
    for asset in assets:
        response = requests.post(
            f'{catalog_api}/api/v1/entities',
            headers=headers,
            json={
                'entityType': 'dataAsset',
                'qualifiedName': asset['name'],
                'name': asset['name'],
                'description': asset.get('description', ''),
                'owner': asset.get('owner', ''),
                'classification': asset.get('classification', 'internal'),
                'tags': asset.get('tags', []),
                'customProperties': {
                    'source': asset.get('location', ''),
                    'regulation': asset.get('regulation', ''),
                    'retention': asset.get('retention_days', 0),
                    'encryption': asset.get('encryption_enabled', False)
                }
            }
        )
        if response.status_code == 200 or response.status_code == 201:
            results['created'] += 1
        elif response.status_code == 409:
            results['updated'] += 1
        else:
            results['failed'] += 1
    return results
```

## Data Retention

### Retention Policy Framework

```yaml
retention_policies:
  customer_pii:
    category: pii
    retention_period: 365 days
    legal_hold: true
    archival_after: 180 days
    deletion_method: secure_delete
    compliance_basis: gdpr_article_5_1_e

  financial_records:
    category: financial
    retention_period: 7 years
    legal_hold: false
    archival_after: 3 years
    deletion_method: purge_with_certificate
    compliance_basis: sox_sec_802

  employee_records:
    category: hr
    retention_period: 5 years
    legal_hold: false
    archival_after: 2 years
    deletion_method: anonymize
    compliance_basis: local_law

  logs_and_audit:
    category: security
    retention_period: 90 days
    legal_hold: false
    archival_after: 30 days
    deletion_method: rotate
    compliance_basis: pci_dss_req_10
```

### Auto-Deletion Implementation

```python
from datetime import datetime, timedelta

class RetentionEnforcer:
    def __init__(self, policies: dict):
        self.policies = policies

    def calculate_expiry(self, asset: dict) -> datetime:
        created_at = datetime.fromisoformat(asset['created_at'])
        policy = self.policies.get(asset.get('category', ''), {})
        retention_days = policy.get('retention_period', 365)
        if asset.get('legal_hold'):
            return datetime.max
        return created_at + timedelta(days=retention_days)

    def find_expired_assets(self, assets: list) -> list:
        now = datetime.utcnow()
        expired = []
        for asset in assets:
            expiry = self.calculate_expiry(asset)
            if now >= expiry:
                expired.append(asset)
        return expired

    def execute_deletion(self, asset: dict) -> dict:
        policy = self.policies.get(asset.get('category', ''), {})
        deletion_method = policy.get('deletion_method', 'secure_delete')
        result = {
            'asset_id': asset.get('asset_id'),
            'name': asset.get('name'),
            'deletion_method': deletion_method,
            'status': 'pending'
        }
        if deletion_method == 'secure_delete':
            result['status'] = self._secure_delete(asset)
        elif deletion_method == 'anonymize':
            result['status'] = self._anonymize(asset)
        elif deletion_method == 'purge_with_certificate':
            result['status'] = self._purge_with_cert(asset)
        else:
            result['status'] = self._soft_delete(asset)
        return result

    def _secure_delete(self, asset: dict) -> str:
        return 'deleted'

    def _anonymize(self, asset: dict) -> str:
        return 'anonymized'

    def _purge_with_cert(self, asset: dict) -> str:
        return 'purged with certificate'

    def _soft_delete(self, asset: dict) -> str:
        return 'soft_deleted'
```

## Data Discovery for Compliance

### GDPR ROPA Mapping

```python
GDPR_ROPA_TEMPLATE = {
    'processing_activity': {
        'name': '',
        'purpose': '',
        'lawful_basis': '',
        'controller': '',
        'joint_controllers': []
    },
    'data_categories': {
        'data_subjects': [],
        'personal_data_categories': [],
        'special_categories': [],
        'retention_period': ''
    },
    'data_flows': {
        'sources': [],
        'recipients': [],
        'third_country_transfers': [],
        'safeguards': ''
    },
    'technical_measures': {
        'pseudonymization': False,
        'encryption': False,
        'access_controls': False,
        'audit_logging': False
    },
    'data_subject_rights': {
        'access_procedure': '',
        'rectification_procedure': '',
        'erasure_procedure': '',
        'portability_procedure': ''
    }
}

def map_data_to_ropa(data_discovery_results: dict) -> list:
    ropa_entries = []
    for asset in data_discovery_results:
        entry = dict(GDPR_ROPA_TEMPLATE)
        entry['processing_activity']['name'] = asset['name']
        entry['processing_activity']['purpose'] = asset.get('purpose', '')
        entry['data_categories']['personal_data_categories'] = asset.get('pii_types', [])
        entry['data_categories']['retention_period'] = asset.get('retention_days', 0)
        entry['technical_measures']['encryption'] = asset.get('encryption_enabled', False)
        entry['technical_measures']['access_controls'] = asset.get('access_controlled', False)
        ropa_entries.append(entry)
    return ropa_entries
```

### CCPA Data Mapping

```python
CCPA_DATA_MAPPING_TEMPLATE = {
    'business_purpose': '',
    'personal_information_categories': [],
    'sources': [],
    'third_party_sharing': [],
    'sold_to': [],
    'retention': '',
    'sensitive_pi': False
}

def map_data_for_ccpa(data_assets: list) -> dict:
    mapping = {}
    for asset in data_assets:
        category = asset.get('ccpa_category', 'unknown')
        if category not in mapping:
            mapping[category] = []
        mapping[category].append({
            'asset_name': asset['name'],
            'business_purpose': asset.get('purpose', ''),
            'shared_with': asset.get('third_parties', []),
            'sold': asset.get('sold', False),
            'retention': asset.get('retention_days', 0)
        })
    return mapping
```

### HIPAA Inventory

```python
HIPAA_ASSET_INVENTORY = {
    'e_phi_systems': [],
    'baa_required': [],
    'access_logs': [],
    'security_measures': {
        'administrative': [],
        'physical': [],
        'technical': []
    }
}

def generate_hipaa_inventory(discovered_phi_assets: list) -> dict:
    inventory = dict(HIPAA_ASSET_INVENTORY)
    for asset in discovered_phi_assets:
        if asset.get('contains_phi'):
            inventory['e_phi_systems'].append(asset['name'])
            if asset.get('vendor_managed'):
                inventory['baa_required'].append(asset['name'])
            inventory['access_logs'].append({
                'system': asset['name'],
                'logging_enabled': asset.get('audit_logging', False),
                'retention_days': asset.get('log_retention', 90)
            })
    return inventory
```

## Remediation

### Overexposed Data Remediation

```python
class DataExposureRemediator:
    def __init__(self):
        self.remediation_actions = []

    def assess_exposure(self, asset: dict) -> list:
        findings = []
        if asset.get('publicly_accessible') and asset.get('classification') in ['confidential', 'restricted']:
            findings.append({
                'asset': asset['name'],
                'risk': 'PUBLIC_ACCESS',
                'severity': 'CRITICAL',
                'recommendation': 'Remove public access immediately',
                'remediation': self._block_public_access
            })
        if not asset.get('encryption_enabled') and asset.get('classification') == 'restricted':
            findings.append({
                'asset': asset['name'],
                'risk': 'NO_ENCRYPTION',
                'severity': 'HIGH',
                'recommendation': 'Enable encryption at rest',
                'remediation': self._enable_encryption
            })
        if asset.get('excessive_permissions'):
            findings.append({
                'asset': asset['name'],
                'risk': 'OVER_PERMISSIONED',
                'severity': 'HIGH',
                'recommendation': 'Apply least privilege access',
                'remediation': self._restrict_access
            })
        return findings

    def remediate(self, findings: list) -> list:
        results = []
        for finding in findings:
            try:
                finding['remediation'](finding['asset'])
                results.append({'asset': finding['asset'], 'status': 'remediated', 'action': finding['recommendation']})
            except Exception as e:
                results.append({'asset': finding['asset'], 'status': 'failed', 'error': str(e)})
        return results

    def _block_public_access(self, asset_name: str):
        pass

    def _enable_encryption(self, asset_name: str):
        pass

    def _restrict_access(self, asset_name: str):
        pass
```

### Orphaned Data Handling

```
Orphaned Data Detection:
├── Asset has no assigned owner for > 90 days
├── No access logs in > 180 days
├── No dependent ETL/process references
├── Created by terminated employee
└── No metadata in data catalog

Remediation Workflow:
├── Quarantine orphaned data (revoke all write access)
├── Notify potential stakeholders (30-day hold)
├── Archive if no response received
├── Delete after archival period (90 days)
└── Generate deletion certificate
```

### Redundant Data Elimination

```python
def find_redundant_data(data_catalog: list) -> list:
    redundancy_findings = []
    seen_fingerprints = {}
    for asset in data_catalog:
        fp = asset.get('fingerprint')
        if fp:
            if fp in seen_fingerprints:
                redundancy_findings.append({
                    'original': seen_fingerprints[fp],
                    'duplicate': asset['name'],
                    'similarity': 1.0,
                    'action': 'consolidate or delete duplicate'
                })
            else:
                seen_fingerprints[fp] = asset['name']
    return redundancy_findings
```

## Monitoring

### Ongoing Discovery

```python
class ContinuousDiscoveryMonitor:
    def __init__(self, baseline: dict):
        self.baseline = baseline
        self.current_state = {}
        self.changes = []

    def snapshot(self, assets: list):
        self.current_state = {}
        for asset in assets:
            key = f'{asset["type"]}:{asset["location"]}'
            self.current_state[key] = {
                'fingerprint': asset.get('fingerprint'),
                'size': asset.get('size'),
                'classification': asset.get('classification'),
                'last_modified': asset.get('last_modified'),
                'checksum': asset.get('checksum')
            }

    def detect_changes(self) -> list:
        self.changes = []
        for key, current in self.current_state.items():
            baseline = self.baseline.get(key)
            if not baseline:
                self.changes.append({'type': 'NEW_ASSET', 'key': key, 'details': current})
            elif current['fingerprint'] != baseline['fingerprint']:
                self.changes.append({'type': 'MODIFIED', 'key': key, 'details': current})
            elif current['checksum'] != baseline['checksum']:
                self.changes.append({'type': 'CONTENT_CHANGED', 'key': key, 'details': current})

        for key in self.baseline:
            if key not in self.current_state:
                self.changes.append({'type': 'DELETED', 'key': key, 'details': self.baseline[key]})
        return self.changes

    def alert_on_new_sensitive_data(self, new_assets: list, sensitive_patterns: list) -> list:
        alerts = []
        for asset in new_assets:
            if any(pattern in asset.get('name', '').lower() for pattern in sensitive_patterns):
                alerts.append({
                    'severity': 'HIGH',
                    'message': f'New sensitive data detected: {asset["name"]}',
                    'asset': asset,
                    'timestamp': __import__('datetime').datetime.utcnow().isoformat()
                })
        return alerts
```

### Baseline Comparison

```python
def compare_baselines(previous: dict, current: dict) -> dict:
    return {
        'added': [k for k in current if k not in previous],
        'removed': [k for k in previous if k not in current],
        'modified': [
            k for k in current if k in previous and current[k] != previous[k]
        ],
        'unchanged': [
            k for k in current if k in previous and current[k] == previous[k]
        ],
        'classification_changes': [
            k for k in current if k in previous
            and current[k].get('classification') != previous[k].get('classification')
        ],
        'total_previous': len(previous),
        'total_current': len(current),
        'delta': len(current) - len(previous)
    }
```

## DSPM Integration

### Data Security Posture Management

| Capability | Description | Key Features |
|------------|-------------|--------------|
| Discovery | Continuous asset discovery across multi-cloud | Automated crawlers, API integrations |
| Classification | ML-powered sensitive data identification | Content inspection, context analysis |
| Risk Assessment | Exposure and misconfiguration analysis | Public access, encryption, permissions |
| Remediation | Automated fix for common issues | Policy-as-code, runbooks |
| Monitoring | Change detection and alerting | Real-time monitoring, drift detection |
| Reporting | Compliance and risk dashboards | Pre-built frameworks, custom reports |

### DSPM Tool Integration

```python
class DSPMOrchestrator:
    def __init__(self):
        self.data_sources = []
        self.classifiers = []
        self.remediators = []

    def register_data_source(self, source: dict):
        self.data_sources.append(source)

    def register_classifier(self, classifier: object):
        self.classifiers.append(classifier)

    def run_discovery_cycle(self) -> dict:
        results = {'discovered': 0, 'classified': 0, 'risks': [], 'remediated': 0}
        for source in self.data_sources:
            discovered = source.get('discover', lambda: [])()
            results['discovered'] += len(discovered)
        return results

    def generate_posture_report(self) -> dict:
        report = {
            'total_data_assets': 0,
            'classified_assets': 0,
            'unclassified_assets': 0,
            'risk_distribution': {'critical': 0, 'high': 0, 'medium': 0, 'low': 0},
            'compliance_status': {},
            'remediation_rate': 0.0
        }
        return report
```

## Reporting

### Data Map Report

```python
def generate_data_map(assets: list) -> dict:
    data_map = {
        'systems': {},
        'data_flows': [],
        'classifications': {},
        'regulatory_coverage': {}
    }
    for asset in assets:
        system = asset.get('system', 'unknown')
        if system not in data_map['systems']:
            data_map['systems'][system] = {
                'total_assets': 0,
                'sensitive_assets': 0,
                'databases': [],
                'files': [],
                'api_endpoints': []
            }
        data_map['systems'][system]['total_assets'] += 1
        if asset.get('classification') in ['confidential', 'restricted']:
            data_map['systems'][system]['sensitive_assets'] += 1
        data_map['systems'][system][asset.get('type', 'files')].append(asset['name'])
    return data_map
```

### Risk Heat Map

```python
def generate_risk_heatmap(assets: list) -> dict:
    heatmap_data = {
        'axes': {
            'x': 'Data Sensitivity',
            'y': 'Exposure Level'
        },
        'grid': {
            'high_high': [], 'high_medium': [], 'high_low': [],
            'medium_high': [], 'medium_medium': [], 'medium_low': [],
            'low_high': [], 'low_medium': [], 'low_low': []
        },
        'risk_score': 0.0
    }
    for asset in assets:
        sensitivity = asset.get('classification', 'internal')
        exposure = asset.get('exposure_level', 'low')
        key = f'{sensitivity}_{exposure}'
        if key == 'restricted_high':
            heatmap_data['grid']['high_high'].append(asset['name'])
        elif key == 'confidential_medium':
            heatmap_data['grid']['medium_medium'].append(asset['name'])
        elif key == 'public_low':
            heatmap_data['grid']['low_low'].append(asset['name'])
    return heatmap_data
```

### Compliance Dashboard

```python
COMPLIANCE_DASHBOARD_METRICS = {
    'gdpr': [
        'discovery_complete_pct',
        'classified_assets_pct',
        'ropa_coverage_pct',
        'dsar_completion_rate',
        'breach_notification_time'
    ],
    'hipaa': [
        'phi_assets_identified',
        'encryption_enabled_pct',
        'baa_covered_vendors',
        'audit_log_coverage',
        'access_review_completion'
    ],
    'pci_dss': [
        'cardholder_data_scope',
        'segmentation_verified',
        'quarterly_scans_passed',
        'saq_completion',
        'asv_validation'
    ],
    'ccpa': [
        'data_inventory_complete',
        'opt_out_requests_processed',
        'deletion_requests_completed',
        'data_sharing_mapped',
        'third_party_assessments'
    ]
}

def generate_compliance_summary(metrics: dict, framework: str) -> dict:
    summary = {
        'framework': framework,
        'overall_score': 0.0,
        'controls': {},
        'findings': [],
        'remediation_priority': []
    }
    for control, value in metrics.items():
        score = min(value / 100.0, 1.0)
        summary['controls'][control] = {
            'score': score,
            'status': 'compliant' if score >= 0.8 else ('partial' if score >= 0.5 else 'non_compliant')
        }
        if score < 0.8:
            summary['findings'].append(f'{control} below threshold ({score:.0%})')
    if summary['controls']:
        summary['overall_score'] = sum(
            c['score'] for c in summary['controls'].values()
        ) / len(summary['controls'])
    return summary
```

## Best Practices

### Data Minimization

- Collect only data that is directly relevant and necessary for the specified purpose
- Avoid collecting sensitive data when anonymized or aggregated data suffices
- Implement field-level collection controls rather than bulk data capture
- Regularly review data collections for continued necessity
- Design forms and APIs to request minimum required fields
- Use data inventory to identify and eliminate redundant collections

### Purpose Limitation

- Document the specific purpose for each data collection point
- Implement purpose-based access controls that restrict data usage
- Flag data assets with their authorized use cases
- Monitor data access patterns for purpose drift
- Require re-authorization for new data use cases
- Audit data usage against stated purposes

### Privacy by Design Integration

- Incorporate data discovery into the SDLC requirements phase
- Classify data at the point of creation in development pipelines
- Automate classification validation in CI/CD gates
- Include data discovery in change management processes
- Design labels and tags to survive data transformations
- Integrate classification into data catalog and lineage systems
- Apply retention policies automatically based on classification
- Monitor for classification drift in production data

### Continuous Improvement

```
Maturity Model:
├── Level 1: Ad-hoc
│   ├── Manual classification
│   ├── No automated discovery
│   └── Spreadsheet-based inventory
├── Level 2: Defined
│   ├── Automated discovery for critical systems
│   ├── Classification policy defined
│   └── Basic tagging implemented
├── Level 3: Managed
│   ├── Multi-cloud discovery automated
│   ├── ML-based classification active
│   ├── Data lineage tracked
│   └── Remediation workflows automated
├── Level 4: Measured
│   ├── Continuous monitoring across all data
│   ├── Risk scoring and prioritization
│   ├── Compliance mapping automated
│   └── Metrics-driven improvement
└── Level 5: Optimized
    ├── Predictive risk analysis
    ├── Auto-remediation for common patterns
    ├── Integrated DSPM
    └── Self-healing data security posture
```

## Automation Tools

### Scheduled Discovery Runner

```python
import schedule
import time
import logging

class DiscoveryScheduler:
    def __init__(self):
        self.jobs = []
        logging.basicConfig(level=logging.INFO)

    def add_discovery_job(self, name: str, function, cron_schedule: str):
        self.jobs.append({'name': name, 'function': function, 'schedule': cron_schedule})

    def run_all(self):
        for job in self.jobs:
            logging.info(f'Running discovery job: {job["name"]}')
            try:
                job['function']()
                logging.info(f'Completed: {job["name"]}')
            except Exception as e:
                logging.error(f'Failed: {job["name"]}: {e}')

    def schedule_jobs(self):
        for job in self.jobs:
            schedule.every().day.at('02:00').do(job['function'])
        while True:
            schedule.run_pending()
            time.sleep(60)

# Example usage
scheduler = DiscoveryScheduler()
scheduler.add_discovery_job('aws_s3_scan', enumerate_aws_data_resources, '0 2 * * *')
scheduler.add_discovery_job('db_schema_scan', discover_database_schema, '0 3 * * *')
scheduler.add_discovery_job('file_share_scan', scan_smb_share, '0 4 * * *')
```

### Alerting on New Sensitive Data

```python
import smtplib
import json
from email.mime.text import MIMEText

class SensitiveDataAlert:
    def __init__(self, alert_config: dict):
        self.config = alert_config

    def send_alert(self, finding: dict):
        message = MIMEText(
            f'New Sensitive Data Detected\n'
            f'Asset: {finding.get("name")}\n'
            f'Type: {finding.get("type")}\n'
            f'Location: {finding.get("location")}\n'
            f'Sensitive Types: {", ".join(finding.get("sensitive_types", []))}\n'
            f'Classification: {finding.get("classification")}\n'
            f'Discovered At: {finding.get("timestamp")}'
        )
        message['Subject'] = f'[SECURITY] New sensitive data: {finding.get("name")}'
        message['To'] = self.config['notification_email']
        message['From'] = self.config['from_email']

        with smtplib.SMTP(self.config['smtp_server'], self.config['smtp_port']) as server:
            if self.config.get('use_tls'):
                server.starttls()
            server.send_message(message)

    def send_slack_alert(self, finding: dict, webhook_url: str):
        import requests
        payload = {
            'text': f'*New Sensitive Data Detected*\n'
                    f'Asset: {finding.get("name")}\n'
                    f'Type: {finding.get("type")}\n'
                    f'Location: {finding.get("location")}\n'
                    f'Classification: {finding.get("classification")}'
        }
        requests.post(webhook_url, json=payload)
```

## Key Points

- Data discovery must span structured and unstructured data across on-premise and cloud environments
- Classification taxonomy provides consistent labeling from public to restricted
- Automated classification uses regex, ML, and fingerprinting for scalable identification
- Manual classification relies on data owners and workflow-based assignment
- Data lineage tracks provenance and downstream impact for risk assessment
- Data inventory serves as the single source of truth for data assets
- Retention policies enforce lifecycle management with legal hold support
- Compliance discovery maps data to GDPR, CCPA, HIPAA, and PCI requirements
- Remediation addresses overexposed, orphaned, redundant, and stale data
- Continuous monitoring with baseline comparison detects drift and new sensitive data
- DSPM integration provides unified data security posture management
- Reporting generates data maps, risk heat maps, and compliance dashboards
- Data minimization and purpose limitation are foundational privacy principles
- Privacy by design should be integrated into the SDLC from requirements onward
