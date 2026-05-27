# Privacy by Design & Engineering

## Privacy by Design Principles

### Foundational Principles

Privacy by Design (PbD) is a framework developed by Dr. Ann Cavoukian that embeds privacy into the design and architecture of systems, processes, and technologies. It is a proactive approach that anticipates and prevents privacy invasive events before they occur.

| Principle | Description | Engineering Application |
|-----------|-------------|------------------------|
| Proactive not Reactive | Anticipate and prevent privacy risks before they materialize | Privacy impact assessments, threat modeling, privacy requirements in design phase |
| Privacy as Default | Personal data is automatically protected without user action | Opt-in consent, minimal data collection by default, privacy-preserving defaults |
| Privacy Embedded | Privacy is integral to system design, not a bolt-on | Privacy patterns in architecture, privacy APIs, data protection by design |
| Full Lifecycle | Privacy protection from data creation through deletion | Data lifecycle management, retention policies, secure deletion, archival controls |
| Visibility and Transparency | Operations are visible and verifiable to stakeholders | Audit logging, privacy dashboards, transparency reports, breach notifications |
| User-Centric | User privacy is prioritized with user-friendly controls | Consent UX, preference centers, DSAR portals, privacy self-service |

### GDPR Engineering Requirements

#### Data Protection by Design and Default (Article 25)

Article 25 of the GDPR mandates that data protection principles be implemented effectively and that necessary safeguards be integrated into processing activities.

```
Article 25 Requirements:
├── Art. 25(1) - Data protection by design
│   ├── Implement technical measures at design time
│   ├── Pseudonymization and data minimization
│   ├── Encryption and access controls
│   └── Processing only data necessary for purpose
└── Art. 25(2) - Data protection by default
    ├── Only process data necessary for specific purpose
    ├── Default settings preserve privacy
    ├── Limited collection and retention
    └── Restricted accessibility by default
```

```python
class DataProtectionByDesign:
    def __init__(self, processing_purpose: str):
        self.purpose = processing_purpose
        self.data_elements = []
        self.technical_measures = []
        self.default_settings = {}

    def register_data_element(self, name: str, required: bool, sensitivity: str, retention_days: int):
        self.data_elements.append({
            'name': name,
            'required': required,
            'sensitivity': sensitivity,
            'retention_days': retention_days,
            'pseudonymized': False,
            'encrypted': False
        })

    def apply_default_settings(self):
        # Article 25(2): Default settings must be most privacy-preserving
        self.default_settings = {
            'data_collection': 'minimal',
            'data_sharing': 'prohibited',
            'data_retention': 'minimum_required',
            'user_profile_creation': 'opt_in',
            'marketing_consent': 'not_obtained',
            'third_party_sharing': 'blocked_by_default',
            'analytics_tracking': 'disabled'
        }

    def assess_necessity(self) -> list:
        unnecessary = []
        for element in self.data_elements:
            if not element['required']:
                unnecessary.append({
                    'element': element['name'],
                    'risk': 'Data collection without clear necessity',
                    'recommendation': 'Remove or justify collection'
                })
        return unnecessary

    def generate_article_25_compliance_report(self) -> dict:
        return {
            'design_measures': [m for m in self.technical_measures if m.get('design_time')],
            'default_measures': self.default_settings,
            'data_minimization_score': sum(
                1 for e in self.data_elements if e['required']
            ) / max(len(self.data_elements), 1),
            'pseudonymization_applied': any(e['pseudonymized'] for e in self.data_elements),
            'encryption_applied': all(e['encrypted'] for e in self.data_elements if e['sensitivity'] == 'high')
        }
```

#### Privacy Impact Assessment (Article 35)

A Data Protection Impact Assessment (DPIA) is required when processing is likely to result in high risk to natural persons.

```python
class DPIA:
    def __init__(self, project_name: str, controller: str):
        self.project_name = project_name
        self.controller = controller
        self.processing_description = None
        self.necessity_assessment = None
        self.risk_assessment = None
        self.measures_planned = []

    def screening_check(self) -> dict:
        criteria = [
            'systematic_evaluation_of_individuals',
            'large_scale_special_category_data',
            'systematic_monitoring_of_public_area',
            'large_scale_processing_of_children_data',
            'innovative_technology_used',
            'data_combined_from_multiple_sources',
            'vulnerable_data_subjects',
            'cross_border_processing'
        ]
        triggered = []
        for criterion in criteria:
            response = input(f'Does processing involve {criterion}? (y/n): ')
            if response.lower() == 'y':
                triggered.append(criterion)
        return {
            'dpia_required': len(triggered) >= 2,
            'triggered_criteria': triggered,
            'recommendation': 'DPIA required' if len(triggered) >= 2 else 'DPIA recommended but not mandatory'
        }

    def describe_processing(self, description: dict):
        self.processing_description = {
            'purpose': description['purpose'],
            'lawful_basis': description['lawful_basis'],
            'data_categories': description['data_categories'],
            'data_subjects': description['data_subjects'],
            'recipients': description['recipients'],
            'retention_period': description['retention_period'],
            'technical_measures': description.get('technical_measures', [])
        }

    def assess_risks(self) -> list:
        risks = []
        for category in self.processing_description.get('data_categories', []):
            if category.get('sensitivity') == 'high':
                risks.append({
                    'source': category['name'],
                    'risk': 'Unauthorized access to sensitive data',
                    'severity': 'high',
                    'likelihood': 'possible',
                    'impact': 'severe_reputational_and_financial_harm'
                })
        return risks

    def document_measures(self, measures: list):
        self.measures_planned = [{
            'measure': m['name'],
            'addresses_risk': m['risk_ref'],
            'effectiveness': m.get('effectiveness', 'unknown'),
            'implementation_status': m.get('status', 'planned')
        } for m in measures]

    def generate_report(self) -> dict:
        return {
            'project': self.project_name,
            'controller': self.controller,
            'processing': self.processing_description,
            'risks': self.assess_risks(),
            'measures': self.measures_planned,
            'conclusion': {
                'residual_risk': 'acceptable' if len(self.assess_risks()) <= 3 else 'unacceptable',
                'recommendation': 'Proceed with processing' if len(self.assess_risks()) <= 3 else 'Consult DPO before processing',
                'review_date': '2026-06-01'
            }
        }
```

#### Data Protection Officer (Article 37)

The DPO is required for public authorities, large-scale monitoring, or large-scale special category data processing.

```
DPO Responsibilities:
├── Monitor GDPR compliance
├── Advise on DPIAs
├── Cooperate with supervisory authority
├── Act as contact point for data subjects
├── Maintain processing activity records
└── Provide privacy training
```

## Privacy Engineering Frameworks

### NIST Privacy Framework

The NIST Privacy Framework provides a common language for organizations to manage privacy risk. It aligns with the NIST Cybersecurity Framework.

| Function | Category | Example Controls |
|----------|----------|------------------|
| Identify-P | Inventory, governance, risk assessment | Data inventory, privacy policies, risk register |
| Govern-P | Policies, processes, oversight | Privacy program charter, roles and responsibilities |
| Control-P | Data processing policies, consent, access | Consent management, data retention, purpose limitation |
| Communicate-P | Transparency, notices, disclosures | Privacy notices, breach notifications, DSAR responses |
| Protect-P | Administrative, technical, physical safeguards | Encryption, access controls, anonymization |

```python
NIST_PRIVACY_CATEGORIES = {
    'identify': {
        'inventory': 'Maintain data inventory with processing purposes',
        'risk_assessment': 'Assess privacy risks for each processing activity',
        'legal_mapping': 'Map data flows to regulatory requirements'
    },
    'govern': {
        'policies': 'Establish privacy policies and procedures',
        'roles': 'Assign privacy roles and responsibilities',
        'oversight': 'Implement privacy oversight mechanisms'
    },
    'control': {
        'consent': 'Manage consent collection and withdrawal',
        'access': 'Control data access based on purpose',
        'retention': 'Enforce data retention and deletion schedules',
        'minimization': 'Implement data minimization controls'
    },
    'communicate': {
        'notices': 'Provide clear privacy notices at data collection',
        'transparency': 'Publish transparency reports',
        'breach_notification': 'Implement breach notification workflows',
        'dsar': 'Facilitate data subject access requests'
    },
    'protect': {
        'encryption': 'Encrypt personal data at rest and in transit',
        'anonymization': 'Apply anonymization where possible',
        'access_controls': 'Implement least-privilege access controls',
        'monitoring': 'Monitor for unauthorized access'
    }
}

def assess_nist_privacy_maturity(framework_data: dict) -> dict:
    scores = {}
    for function, categories in NIST_PRIVACY_CATEGORIES.items():
        implemented = 0
        total = len(categories)
        for category, control in categories.items():
            if framework_data.get(function, {}).get(category, {}).get('implemented'):
                implemented += 1
        scores[function] = implemented / total if total > 0 else 0
    return {
        'scores': scores,
        'overall': sum(scores.values()) / len(scores) if scores else 0,
        'weakest_area': min(scores, key=scores.get),
        'strongest_area': max(scores, key=scores.get)
    }
```

### ISO 27701

ISO 27701 extends ISO 27001 and ISO 27002 for privacy information management. It provides a PIMS (Privacy Information Management System) framework.

```
ISO 27701 Controls (PIMS):
├── PII Controllers
│   ├── Condition for collection and processing
│   ├── Obligation to inform
│   ├── PII principal rights
│   ├── PII breach notification
│   └── Privacy by design and default
└── PII Processors
    ├── Assisting with PII principal rights
    ├── PII breach notification
    ├── Sub-processor agreements
    ├── Cross-border data transfers
    └── Return, transfer, or disposal of PII
```

### ICO Guidance

The UK Information Commissioner's Office provides practical guidance for implementing privacy engineering:

- Privacy notices must be concise, transparent, intelligible, easily accessible
- Consent must be specific, informed, unambiguous, freely given
- DSARs must be responded to within one month
- DPIAs are mandatory for high-risk processing
- Data retention periods must be justified and documented
- International transfers require adequacy decisions or appropriate safeguards

### CNIL Guidelines

The French CNIL provides specific guidance on privacy engineering techniques:

- Pseudonymization guidance with technical requirements
- Guidelines on mobile app privacy
- Cloud computing privacy recommendations
- AI and privacy: guidelines for ethical AI development
- Cookie consent and tracking guidelines
- Data breach notification procedures

## Data Minimization

### Purpose Limitation

```python
class PurposeLimitationEnforcer:
    def __init__(self):
        self.registered_purposes = {}

    def register_purpose(self, purpose_id: str, description: str, data_elements: list):
        self.registered_purposes[purpose_id] = {
            'description': description,
            'authorized_data_elements': data_elements,
            'created_at': __import__('datetime').datetime.utcnow().isoformat(),
            'status': 'active'
        }

    def validate_data_access(self, purpose_id: str, requested_elements: list) -> dict:
        if purpose_id not in self.registered_purposes:
            return {'allowed': False, 'reason': 'Unknown purpose'}
        purpose = self.registered_purposes[purpose_id]
        unauthorized = [e for e in requested_elements if e not in purpose['authorized_data_elements']]
        if unauthorized:
            return {
                'allowed': False,
                'reason': 'Data elements not authorized for this purpose',
                'unauthorized_elements': unauthorized
            }
        return {'allowed': True}

    def deactivate_purpose(self, purpose_id: str):
        if purpose_id in self.registered_purposes:
            self.registered_purposes[purpose_id]['status'] = 'deactivated'
```

### Collection Limitation

```
Collection Limitation Rules:
├── Only collect data that is directly necessary
├── No blanket data collection
├── Specific consent for each data point
├── Pre-fill from existing data when possible
└── No collection for unspecified future purposes

Implementation Pattern:
├── Form design: show only required fields initially
├── API design: use granular scopes per endpoint
├── Database: nullable columns for optional data
└── Validation: reject unknown fields at boundary
```

```python
def validate_collection_request(request_data: dict, purpose: str, authorized_fields: set) -> dict:
    requested_fields = set(request_data.keys())
    unauthorized = requested_fields - authorized_fields
    if unauthorized:
        return {
            'accepted': False,
            'rejected_fields': list(unauthorized),
            'message': f'Fields {unauthorized} not authorized for purpose: {purpose}'
        }
    return {'accepted': True, 'fields': list(requested_fields)}
```

### Retention Limitation

```python
class RetentionPolicy:
    def __init__(self):
        self.policies = {}

    def add_policy(self, data_category: str, retention_days: int, legal_basis: str, auto_delete: bool = True):
        self.policies[data_category] = {
            'retention_days': retention_days,
            'legal_basis': legal_basis,
            'auto_delete': auto_delete
        }

    def get_expiry_date(self, data_category: str, collected_date: str) -> str:
        from datetime import datetime, timedelta
        policy = self.policies.get(data_category)
        if not policy:
            return None
        collected = datetime.fromisoformat(collected_date)
        expiry = collected + timedelta(days=policy['retention_days'])
        return expiry.isoformat()

    def should_delete(self, data_category: str, collected_date: str) -> bool:
        from datetime import datetime
        expiry = self.get_expiry_date(data_category, collected_date)
        if not expiry:
            return False
        return datetime.utcnow() >= datetime.fromisoformat(expiry)

RETENTION_POLICIES_EXAMPLE = {
    'account_data': {'retention_days': 365, 'auto_delete': True},
    'transaction_logs': {'retention_days': 1825, 'auto_delete': False},
    'session_data': {'retention_days': 30, 'auto_delete': True},
    'marketing_consent': {'retention_days': 730, 'auto_delete': True},
    'analytics_events': {'retention_days': 90, 'auto_delete': True},
    'support_tickets': {'retention_days': 1095, 'auto_delete': False},
    'backup_logs': {'retention_days': 30, 'auto_delete': True}
}
```

### Anonymization

Anonymization renders data irreversibly non-personal. Unlike pseudonymization, anonymized data falls outside GDPR scope.

```
Anonymization Techniques:
├── Randomization
│   ├── Noise addition (differential privacy)
│   ├── Permutation (shuffle values)
│   └── Unsubstantiation (generate synthetic values)
└── Generalization
    ├── Aggregation (summarize to groups)
    ├── k-anonymity (indistinguishable from k-1 others)
    ├── l-diversity (diverse sensitive values)
    └── t-closeness (distribution close to overall)
```

```python
import random

class Anonymizer:
    def __init__(self):
        self.techniques = {}

    def register_technique(self, name: str, func):
        self.techniques[name] = func

    def generalize_age(self, age: int, bucket_size: int = 5) -> str:
        lower = (age // bucket_size) * bucket_size
        return f'{lower}-{lower + bucket_size - 1}'

    def generalize_zip(self, zip_code: str, digits: int = 3) -> str:
        return zip_code[:digits] + 'X' * (len(zip_code) - digits)

    def mask_email(self, email: str) -> str:
        local, domain = email.split('@')
        masked_local = local[0] + '****' + local[-1]
        return f'{masked_local}@{domain}'

    def mask_phone(self, phone: str) -> str:
        return phone[:3] + '******' + phone[-2:]

    def randomize_value(self, value: str, replacement_list: list) -> str:
        return random.choice(replacement_list)

    def is_re_identification_risk(self, anonymized_data: list, quasi_identifiers: list) -> float:
        unique_combinations = set()
        for record in anonymized_data:
            key = tuple(record[q] for q in quasi_identifiers)
            unique_combinations.add(key)
        risk = len(unique_combinations) / len(anonymized_data)
        return risk
```

## Consent Management

### Consent Collection

```python
class ConsentManager:
    def __init__(self):
        self.consent_records = {}
        self.consent_templates = {}

    def define_consent_template(self, template_id: str, purpose: str, data_categories: list,
                                required: bool, withdrawal_method: str):
        self.consent_templates[template_id] = {
            'purpose': purpose,
            'data_categories': data_categories,
            'required': required,
            'withdrawal_method': withdrawal_method,
            'version': 1,
            'active': True
        }

    def record_consent(self, user_id: str, template_id: str, source: str, ip_address: str) -> dict:
        record = {
            'user_id': user_id,
            'template_id': template_id,
            'granted_at': __import__('datetime').datetime.utcnow().isoformat(),
            'source': source,
            'ip_address': ip_address,
            'status': 'active',
            'withdrawn_at': None
        }
        if user_id not in self.consent_records:
            self.consent_records[user_id] = []
        self.consent_records[user_id].append(record)
        return record

    def withdraw_consent(self, user_id: str, template_id: str) -> bool:
        for record in self.consent_records.get(user_id, []):
            if record['template_id'] == template_id and record['status'] == 'active':
                record['status'] = 'withdrawn'
                record['withdrawn_at'] = __import__('datetime').datetime.utcnow().isoformat()
                return True
        return False

    def check_consent(self, user_id: str, template_id: str) -> bool:
        for record in self.consent_records.get(user_id, []):
            if record['template_id'] == template_id and record['status'] == 'active':
                return True
        return False

    def get_active_consents(self, user_id: str) -> list:
        return [
            r for r in self.consent_records.get(user_id, [])
            if r['status'] == 'active'
        ]

    def consent_audit_trail(self, user_id: str) -> list:
        return sorted(
            self.consent_records.get(user_id, []),
            key=lambda r: r['granted_at'],
            reverse=True
        )
```

### Preference Storage

```json
{
  "user_id": "usr_8a3b2c1d",
  "consent_preferences": {
    "marketing_emails": {
      "granted": true,
      "granted_at": "2025-01-15T10:30:00Z",
      "source": "account_registration",
      "version": 2
    },
    "analytics_tracking": {
      "granted": false,
      "granted_at": "2025-01-15T10:30:00Z",
      "withdrawn_at": "2025-06-01T14:22:00Z",
      "source": "cookie_banner",
      "version": 1
    },
    "third_party_sharing": {
      "granted": false,
      "granted_at": null,
      "source": null,
      "version": 1
    }
  },
  "preference_version": 3,
  "last_updated": "2025-06-01T14:22:00Z"
}
```

### Withdrawal Mechanisms

```python
class ConsentWithdrawalHandler:
    def __init__(self, consent_manager: ConsentManager):
        self.manager = consent_manager

    def process_withdrawal(self, user_id: str, template_id: str, method: str) -> dict:
        success = self.manager.withdraw_consent(user_id, template_id)
        if not success:
            return {'status': 'error', 'message': 'No active consent found'}

        # Trigger downstream effects
        effects = []
        if template_id == 'marketing_emails':
            effects.append(self._remove_from_marketing_list(user_id))
        elif template_id == 'analytics_tracking':
            effects.append(self._disable_analytics(user_id))
        elif template_id == 'third_party_sharing':
            effects.append(self._notify_data_processors(user_id))

        return {
            'status': 'withdrawn',
            'template_id': template_id,
            'withdrawn_at': __import__('datetime').datetime.utcnow().isoformat(),
            'method': method,
            'downstream_effects': effects
        }

    def _remove_from_marketing_list(self, user_id: str) -> str:
        return 'marketing_opted_out'

    def _disable_analytics(self, user_id: str) -> str:
        return 'analytics_disabled'

    def _notify_data_processors(self, user_id: str) -> str:
        return 'processors_notified'

    def batch_process_withdrawals(self, user_id: str) -> list:
        results = []
        active = self.manager.get_active_consents(user_id)
        for consent in active:
            results.append(self.process_withdrawal(
                user_id, consent['template_id'], 'batch_account_deletion'
            ))
        return results
```

## Privacy Notices

### Layered Notices

```
Privacy Notice Structure:
├── Layer 1 (Short Notice)
│   ├── Who we are
│   ├── What data we collect
│   ├── Why we collect it
│   ├── Your rights
│   └── Contact information
└── Layer 2 (Full Notice)
    ├── Controller identity and contact
    ├── DPO contact details
    ├── Purposes and legal bases
    ├── Categories of personal data
    ├── Recipients and transfers
    ├── Retention periods
    ├── Data subject rights
    ├── Right to withdraw consent
    ├── Right to lodge complaint
    ├── Automated decision-making
    └── Policy version and date
```

### Just-in-Time Notices

```python
class JustInTimeNotice:
    def __init__(self):
        self.notices = {}

    def register_notice(self, data_point: str, purpose: str, notice_text: str, icon: str = None):
        self.notices[data_point] = {
            'purpose': purpose,
            'text': notice_text,
            'icon': icon
        }

    def get_notice(self, data_point: str, context: dict = None) -> dict:
        base = self.notices.get(data_point, {})
        if context:
            base['context_specific'] = self._tailor_notice(base, context)
        return base

    def _tailor_notice(self, notice: dict, context: dict) -> str:
        return notice.get('text', '').format(**context)

NOTICES = {
    'location': {
        'purpose': 'Navigation and personalized recommendations',
        'text': 'We use your location to show nearby restaurants and provide accurate delivery ETAs.',
        'icon': '📍'
    },
    'camera': {
        'purpose': 'Profile photo and identity verification',
        'text': 'We need camera access to take your profile photo. Photos are stored securely and not shared.',
        'icon': '📷'
    },
    'contacts': {
        'purpose': 'Friend discovery and referrals',
        'text': 'Access your contacts to find friends already using the app. We do not store your contact list.',
        'icon': '👥'
    },
    'microphone': {
        'purpose': 'Voice search and support calls',
        'text': 'Microphone access enables voice search. Voice data is processed in real-time and not stored.',
        'icon': '🎤'
    }
}
```

## User Rights Management

### DSAR Workflows

```python
class DataSubjectAccessRequest:
    def __init__(self):
        self.requests = {}

    def submit_request(self, requester_email: str, request_type: str, details: dict = None) -> str:
        import uuid
        request_id = str(uuid.uuid4())
        self.requests[request_id] = {
            'requester_email': requester_email,
            'type': request_type,
            'details': details or {},
            'status': 'submitted',
            'submitted_at': __import__('datetime').datetime.utcnow().isoformat(),
            'deadline': None,
            'verified': False,
            'completed_at': None,
            'response': None
        }
        return request_id

    def verify_identity(self, request_id: str, verification_data: dict) -> bool:
        request = self.requests.get(request_id)
        if not request:
            return False
        request['verified'] = True
        request['verification_method'] = verification_data.get('method', 'email')
        request['status'] = 'verifying'
        from datetime import datetime, timedelta
        request['deadline'] = (datetime.utcnow() + timedelta(days=30)).isoformat()
        return True

    def process_access_request(self, request_id: str, user_data: dict) -> dict:
        request = self.requests.get(request_id)
        if not request or not request['verified']:
            return {'error': 'Request not verified'}
        request['status'] = 'processing'
        response = {
            'request_id': request_id,
            'personal_data': user_data,
            'processing_purposes': user_data.get('processing_purposes', []),
            'recipients': user_data.get('recipients', []),
            'retention_periods': user_data.get('retention_periods', []),
            'data_sources': user_data.get('data_sources', []),
            'automated_decisions': user_data.get('automated_decisions', [])
        }
        request['response'] = response
        request['completed_at'] = __import__('datetime').datetime.utcnow().isoformat()
        request['status'] = 'completed'
        return response

    def process_deletion_request(self, request_id: str, delete_functions: dict) -> dict:
        request = self.requests.get(request_id)
        deletions = {}
        for system, delete_func in delete_functions.items():
            try:
                deletions[system] = delete_func(request_id)
            except Exception as e:
                deletions[system] = f'failed: {str(e)}'
        request['status'] = 'completed'
        request['completed_at'] = __import__('datetime').datetime.utcnow().isoformat()
        request['deletion_results'] = deletions
        return deletions

    def get_request_status(self, request_id: str) -> dict:
        request = self.requests.get(request_id)
        if not request:
            return {'error': 'Request not found'}
        return {
            'request_id': request_id,
            'type': request['type'],
            'status': request['status'],
            'submitted_at': request['submitted_at'],
            'deadline': request.get('deadline'),
            'completed_at': request.get('completed_at'),
            'days_remaining': self._calculate_days_remaining(request.get('deadline'))
        }

    def _calculate_days_remaining(self, deadline: str) -> int:
        if not deadline:
            return 30
        from datetime import datetime
        deadline_dt = datetime.fromisoformat(deadline)
        remaining = (deadline_dt - datetime.utcnow()).days
        return max(0, remaining)

    def list_pending_requests(self) -> list:
        return [
            r for r in self.requests.values()
            if r['status'] in ('submitted', 'verifying', 'processing')
        ]

    def generate_dsar_metrics(self) -> dict:
        total = len(self.requests)
        completed = sum(1 for r in self.requests.values() if r['status'] == 'completed')
        within_deadline = sum(
            1 for r in self.requests.values()
            if r.get('completed_at') and r.get('deadline') and
            r['completed_at'] <= r['deadline']
        )
        return {
            'total_requests': total,
            'completed': completed,
            'pending': total - completed,
            'within_deadline_pct': (within_deadline / completed * 100) if completed else 0,
            'avg_completion_days': 0,
            'by_type': self._group_by_type()
        }

    def _group_by_type(self) -> dict:
        types = {}
        for r in self.requests.values():
            t = r['type']
            if t not in types:
                types[t] = 0
            types[t] += 1
        return types
```

### Identity Verification

| Verification Method | Security Level | User Friction | Use Case |
|-------------------|---------------|---------------|----------|
| Email confirmation | Low | Low | Low-risk data |
| SMS OTP | Medium | Medium | Account data |
| Knowledge-based | Medium | High | Financial data |
| Document upload | High | High | Special category data |
| Video verification | Very High | Very High | High-risk requests |
| In-person | Maximum | Maximum | Legal proceedings |

```python
class IdentityVerification:
    def __init__(self):
        self.verification_methods = {
            'email': self._verify_email,
            'sms_otp': self._verify_sms,
            'knowledge_based': self._verify_kba,
            'document': self._verify_document,
            'video': self._verify_video
        }

    def verify(self, user_id: str, method: str, data: dict) -> dict:
        verifier = self.verification_methods.get(method)
        if not verifier:
            return {'verified': False, 'reason': 'Unknown verification method'}
        result = verifier(data)
        return {
            'verified': result['success'],
            'method': method,
            'timestamp': __import__('datetime').datetime.utcnow().isoformat(),
            'confidence': result.get('confidence', 0.0)
        }

    def _verify_email(self, data: dict) -> dict:
        token = data.get('token', '')
        stored = data.get('expected_token', '')
        return {'success': token == stored, 'confidence': 0.6}

    def _verify_sms(self, data: dict) -> dict:
        otp = data.get('otp', '')
        expected = data.get('expected_otp', '')
        return {'success': otp == expected, 'confidence': 0.7}

    def _verify_kba(self, data: dict) -> dict:
        correct = sum(1 for a in data.get('answers', []) if a.get('correct'))
        total = len(data.get('answers', []))
        return {'success': correct >= total * 0.7, 'confidence': 0.5 + 0.3 * (correct / total)}

    def _verify_document(self, data: dict) -> dict:
        return {'success': data.get('document_valid', False), 'confidence': 0.85}

    def _verify_video(self, data: dict) -> dict:
        return {'success': data.get('liveness_confirmed', False), 'confidence': 0.95}
```

## Right to Erasure

### Hard Delete vs Soft Delete

| Aspect | Hard Delete | Soft Delete |
|--------|-------------|-------------|
| Data recovery | Impossible | Possible (toggle flag) |
| GDPR compliance | Full compliance | Requires purge scheduling |
| Performance | Slow (vacuum, reindex) | Fast (update flag) |
| Audit trail | Lost | Preserved |
| Referential integrity | May break | Maintained |
| Default strategy | After grace period | Short-term (30 days) |
| Backup impact | Requires backup purging | Backup unaffected |

```python
class ErasureEngine:
    def __init__(self):
        self.systems = {}

    def register_system(self, name: str, hard_delete_func, soft_delete_func, purge_backup_func):
        self.systems[name] = {
            'hard_delete': hard_delete_func,
            'soft_delete': soft_delete_func,
            'purge_backup': purge_backup_func
        }

    def execute_right_to_erasure(self, user_id: str, strategy: str = 'hard') -> dict:
        results = {}
        for system_name, funcs in self.systems.items():
            try:
                if strategy == 'hard':
                    results[system_name] = funcs['hard_delete'](user_id)
                    if 'purge_backup' in funcs:
                        results[f'{system_name}_backup'] = funcs['purge_backup'](user_id)
                elif strategy == 'soft':
                    results[system_name] = funcs['soft_delete'](user_id)
                else:
                    results[system_name] = funcs['hard_delete'](user_id)
                    funcs['purge_backup'](user_id)
            except Exception as e:
                results[system_name] = f'failed: {str(e)}'
        return results

    def generate_erasure_certificate(self, user_id: str, results: dict) -> dict:
        return {
            'user_id': user_id,
            'request_type': 'right_to_erasure',
            'executed_at': __import__('datetime').datetime.utcnow().isoformat(),
            'systems_affected': list(results.keys()),
            'results': results,
            'all_successful': all('failed' not in str(v) for v in results.values()),
            'certificate_id': hashlib.sha256(user_id.encode()).hexdigest()[:16]
        }
```

### Cascade Deletion

```python
def cascade_delete(user_id: str, schema: dict, db_connection) -> list:
    deletions = []
    ordered_tables = _resolve_deletion_order(schema)
    for table in ordered_tables:
        related_tables = schema.get(table, {}).get('cascade_to', [])
        for related in related_tables:
            query = f'DELETE FROM {related} WHERE user_id = $1'
            db_connection.execute(query, (user_id,))
            deletions.append(f'{related}: cascaded')
        query = f'DELETE FROM {table} WHERE user_id = $1'
        db_connection.execute(query, (user_id,))
        deletions.append(f'{table}: deleted')
    return deletions

def _resolve_deletion_order(schema: dict) -> list:
    graph = {}
    for table, info in schema.items():
        graph[table] = info.get('cascade_to', [])
    visited = set()
    order = []
    def dfs(node):
        if node in visited:
            return
        visited.add(node)
        for dep in graph.get(node, []):
            dfs(dep)
        order.append(node)
    for node in graph:
        dfs(node)
    return order
```

### Backup Purging

```python
class BackupPurge:
    def __init__(self, retention_days: int = 30):
        self.retention_days = retention_days

    def purge_user_from_backups(self, user_id: str, backup_locations: list) -> list:
        results = []
        for location in backup_locations:
            try:
                if location['type'] == 's3':
                    result = self._purge_s3_backup(user_id, location)
                elif location['type'] == 'snapshot':
                    result = self._purge_db_snapshot(user_id, location)
                elif location['type'] == 'archive':
                    result = self._purge_archive(user_id, location)
                else:
                    result = 'unsupported_backup_type'
                results.append({'location': location['name'], 'result': result})
            except Exception as e:
                results.append({'location': location['name'], 'result': f'error: {str(e)}'})
        return results

    def _purge_s3_backup(self, user_id: str, location: dict) -> str:
        import boto3
        s3 = boto3.client('s3')
        objects = s3.list_objects_v2(Bucket=location['bucket'], Prefix=user_id)
        if 'Contents' in objects:
            s3.delete_objects(
                Bucket=location['bucket'],
                Delete={'Objects': [{'Key': obj['Key']} for obj in objects['Contents']]}
            )
        return 'purged_from_s3'

    def _purge_db_snapshot(self, user_id: str, location: dict) -> str:
        return 'snapshot_recreated_without_user'

    def _purge_archive(self, user_id: str, location: dict) -> str:
        return 'archive_rebuilt_excluding_user'
```

## Data Portability

### Export Formats

```python
class DataPortability:
    SUPPORTED_FORMATS = {
        'json': {
            'mime': 'application/json',
            'extension': '.json',
            'structure': 'nested_object'
        },
        'csv': {
            'mime': 'text/csv',
            'extension': '.csv',
            'structure': 'tabular'
        },
        'xml': {
            'mime': 'application/xml',
            'extension': '.xml',
            'structure': 'hierarchical'
        },
        'parquet': {
            'mime': 'application/parquet',
            'extension': '.parquet',
            'structure': 'columnar'
        }
    }

    def export_user_data(self, user_data: dict, format: str = 'json') -> dict:
        exporter = self._get_exporter(format)
        if not exporter:
            return {'error': 'Unsupported format'}
        exported = exporter(user_data)
        return {
            'format': format,
            'data': exported,
            'size_bytes': len(str(exported)),
            'created_at': __import__('datetime').datetime.utcnow().isoformat()
        }

    def _get_exporter(self, format: str):
        exporters = {
            'json': self._export_json,
            'csv': self._export_csv,
            'xml': self._export_xml
        }
        return exporters.get(format)

    def _export_json(self, data: dict) -> str:
        import json
        return json.dumps(data, indent=2, default=str)

    def _export_csv(self, data: dict) -> str:
        import csv
        import io
        output = io.StringIO()
        writer = csv.writer(output)
        for key, value in data.items():
            if isinstance(value, list):
                for item in value:
                    if isinstance(item, dict):
                        writer.writerow(item.keys())
                        writer.writerow(item.values())
            else:
                writer.writerow([key, str(value)])
        return output.getvalue()

    def _export_xml(self, data: dict) -> str:
        def dict_to_xml(d, root='data'):
            parts = [f'<{root}>']
            for key, value in d.items():
                if isinstance(value, dict):
                    parts.append(dict_to_xml(value, key))
                elif isinstance(value, list):
                    for item in value:
                        if isinstance(item, dict):
                            parts.append(dict_to_xml(item, key[:-1] if key.endswith('s') else key))
                        else:
                            parts.append(f'<{key}>{item}</{key}>')
                else:
                    parts.append(f'<{key}>{value}</{key}>')
            parts.append(f'</{root}>')
            return '\n'.join(parts)
        return dict_to_xml(data)
```

### Standardized Schemas

```python
PORTABILITY_SCHEMA = {
    'profile': {
        'type': 'object',
        'properties': {
            'user_id': {'type': 'string'},
            'email': {'type': 'string', 'format': 'email'},
            'display_name': {'type': 'string'},
            'locale': {'type': 'string'},
            'timezone': {'type': 'string'},
            'created_at': {'type': 'string', 'format': 'date-time'},
            'updated_at': {'type': 'string', 'format': 'date-time'}
        }
    },
    'activity': {
        'type': 'array',
        'items': {
            'type': 'object',
            'properties': {
                'timestamp': {'type': 'string', 'format': 'date-time'},
                'action': {'type': 'string'},
                'resource': {'type': 'string'},
                'details': {'type': 'object'}
            }
        }
    },
    'communications': {
        'type': 'array',
        'items': {
            'type': 'object',
            'properties': {
                'type': {'type': 'string', 'enum': ['email', 'notification', 'sms']},
                'sent_at': {'type': 'string', 'format': 'date-time'},
                'subject': {'type': 'string'},
                'body_preview': {'type': 'string'}
            }
        }
    }
}
```

## Privacy Impact Assessments (PIA/DPIA)

### Screening Methodology

```
DPIA Screening Criteria:
├── Does the project involve profiling or systematic evaluation?
├── Does it process special category data on a large scale?
├── Does it involve systematic monitoring of publicly accessible areas?
├── Does it use new technologies?
├── Does it combine datasets from different sources?
├── Does it involve vulnerable data subjects (children, employees)?
├── Does it involve cross-border data transfers?
├── Does it involve automated decision-making with legal effects?
└── Does it involve processing of location or behavioral data?

Decision:
├── 0 criteria triggered: No DPIA needed, document decision
├── 1-2 criteria triggered: DPIA recommended
└── 3+ criteria triggered: DPIA mandatory
```

### DPIA Documentation

```python
class DPIADocumenter:
    def __init__(self, project_name: str, version: str = '1.0'):
        self.project_name = project_name
        self.version = version
        self.sections = {
            '1_introduction': None,
            '2_processing_description': None,
            '3_necessity_assessment': None,
            '4_risk_assessment': None,
            '5_risk_treatment': None,
            '6_conclusion': None,
            '7_sign_off': None
        }

    def add_section(self, section_id: str, content: dict):
        if section_id in self.sections:
            self.sections[section_id] = content

    def generate_dpia_document(self) -> dict:
        return {
            'project': self.project_name,
            'version': self.version,
            'created_at': __import__('datetime').datetime.utcnow().isoformat(),
            'sections': {k: v for k, v in self.sections.items() if v is not None},
            'status': 'draft'
        }

    def sign_off(self, roles: list) -> dict:
        signatories = {}
        for role in roles:
            import uuid
            signatories[role['name']] = {
                'role': role['title'],
                'signed_at': __import__('datetime').datetime.utcnow().isoformat() if role.get('approved') else None,
                'status': 'approved' if role.get('approved') else 'pending'
            }
        all_approved = all(s['status'] == 'approved' for s in signatories.values())
        return {
            'signatories': signatories,
            'dpia_approved': all_approved,
            'next_review_date': '2026-06-01'
        }
```

## Privacy in System Architecture

### Data Flow Diagrams

```python
class DataFlowDiagram:
    def __init__(self, system_name: str):
        self.system_name = system_name
        self.entities = {}
        self.flows = []

    def add_entity(self, name: str, type: str, location: str, data_controller: bool = False):
        self.entities[name] = {
            'type': type,
            'location': location,
            'data_controller': data_controller,
            'data_processor': not data_controller and type != 'data_subject'
        }

    def add_flow(self, source: str, destination: str, data_categories: list, purpose: str,
                 encryption: bool, pseudonymized: bool):
        self.flows.append({
            'source': source,
            'destination': destination,
            'data_categories': data_categories,
            'purpose': purpose,
            'encryption': encryption,
            'pseudonymized': pseudonymized,
            'transfer_type': 'internal' if self._same_entity_scope(source, destination) else 'external'
        })

    def _same_entity_scope(self, source: str, destination: str) -> bool:
        src = self.entities.get(source, {})
        dst = self.entities.get(destination, {})
        return src.get('location') == dst.get('location')

    def identify_cross_border_flows(self) -> list:
        flows = []
        for flow in self.flows:
            src_location = self.entities.get(flow['source'], {}).get('location')
            dst_location = self.entities.get(flow['destination'], {}).get('location')
            if src_location and dst_location and src_location != dst_location:
                flows.append({
                    **flow,
                    'from': src_location,
                    'to': dst_location,
                    'safeguards_required': True
                })
        return flows

    def generate_report(self) -> dict:
        return {
            'system': self.system_name,
            'entities': list(self.entities.keys()),
            'total_flows': len(self.flows),
            'cross_border_flows': len(self.identify_cross_border_flows()),
            'unencrypted_flows': [f for f in self.flows if not f['encryption']],
            'flow_summary': {
                'internal': sum(1 for f in self.flows if f['transfer_type'] == 'internal'),
                'external': sum(1 for f in self.flows if f['transfer_type'] == 'external')
            }
        }
```

### Privacy Threat Modeling (LINDDUN)

LINDDUN is a privacy-specific threat modeling methodology that identifies privacy threats across seven categories:

| Threat | Acronym | Description | Example |
|--------|---------|-------------|---------|
| Linkability | L | Linking data to the same subject across domains | Cross-site tracking, data correlation |
| Identifiability | I | Identifying a subject from data | Re-identification attacks, fingerprinting |
| Non-repudiation | N | Inability to deny actions | Transaction logs linked to identity |
| Detectability | D | Determining if a subject exists in dataset | Membership inference, database queries |
| Disclosure | D | Unauthorized access to personal data | Data breach, insider threat |
| Unawareness | U | User not informed about data processing | Hidden tracking, dark patterns |
| Non-compliance | N | Processing outside legal/regulatory bounds | Missing consent, excessive collection |

```python
class LINDDUNThreatModel:
    def __init__(self, system_description: str):
        self.system = system_description
        self.threats = []
        self.mitigations = []

    def identify_threats(self, data_flows: list, data_stores: list, entities: list) -> list:
        threats = []
        for flow in data_flows:
            if not flow.get('encryption') and 'pii' in flow.get('data_categories', []):
                threats.append({
                    'type': 'L',
                    'name': 'Linkability via unencrypted PII',
                    'element': flow,
                    'risk': 'PII can be linked across systems during transmission',
                    'severity': 'high'
                })
        for store in data_stores:
            if store.get('contains_pii') and not store.get('pseudonymized'):
                threats.append({
                    'type': 'I',
                    'name': 'Identifiability of stored PII',
                    'element': store,
                    'risk': 'Direct identifiers enable re-identification',
                    'severity': 'high'
                })
            if store.get('logging_enabled') and store.get('log_linkable'):
                threats.append({
                    'type': 'N',
                    'name': 'Non-repudiation via logs',
                    'element': store,
                    'risk': 'Logs create undeniable evidence of actions',
                    'severity': 'medium'
                })
        for entity in entities:
            if entity.get('type') == 'service' and entity.get('tracks_behavior'):
                threats.append({
                    'type': 'D',
                    'name': 'Detectability via behavioral tracking',
                    'element': entity,
                    'risk': 'Behavioral signals can detect user presence',
                    'severity': 'medium'
                })
        self.threats = threats
        return threats

    def propose_mitigations(self) -> list:
        mitigation_map = {
            'L': ['Encryption in transit', 'Separate identifiers from data', 'Use ephemeral identifiers'],
            'I': ['Pseudonymization', 'Aggregation', 'k-anonymity', 'Differential privacy'],
            'N': ['Ephemeral logging', 'Anonymous credentials', 'Group signatures'],
            'D': ['Differential privacy', 'Query restriction', 'Oblivious transfer'],
            'D2': ['Access controls', 'Encryption at rest', 'Data masking', 'Audit logging'],
            'U': ['Privacy notices', 'Consent UX', 'Transparency reports', 'Dashboard'],
            'N2': ['DPIA review', 'Consent verification', 'Compliance checks', 'Policy enforcement']
        }
        mitigations = []
        for threat in self.threats:
            for technique in mitigation_map.get(threat['type'], []):
                mitigations.append({
                    'threat': threat['name'],
                    'technique': technique,
                    'status': 'proposed'
                })
        self.mitigations = mitigations
        return mitigations

    def generate_linddun_report(self) -> dict:
        threat_counts = {}
        for t in self.threats:
            threat_counts[t['type']] = threat_counts.get(t['type'], 0) + 1
        return {
            'system': self.system,
            'threat_count': len(self.threats),
            'threat_distribution': threat_counts,
            'mitigations_proposed': len(self.mitigations),
            'high_severity_count': sum(1 for t in self.threats if t.get('severity') == 'high'),
            'residual_risk': 'medium' if sum(1 for t in self.threats if t.get('severity') == 'high') > 3 else 'low'
        }
```

## Anonymization and Pseudonymization

### Generalization and Suppression

```python
import random

class GeneralizationEngine:
    def __init__(self):
        self.generalization_rules = {}

    def add_rule(self, field: str, method: str, params: dict):
        self.generalization_rules[field] = {'method': method, 'params': params}

    def generalize(self, record: dict) -> dict:
        result = record.copy()
        for field, rule in self.generalization_rules.items():
            if field in result:
                value = result[field]
                if rule['method'] == 'range':
                    bucket = rule['params'].get('bucket_size', 5)
                    if isinstance(value, (int, float)):
                        lower = (value // bucket) * bucket
                        result[field] = f'{lower}-{lower + bucket - 1}'
                elif rule['method'] == 'prefix':
                    keep = rule['params'].get('keep_chars', 3)
                    result[field] = str(value)[:keep] + '*' * (len(str(value)) - keep)
                elif rule['method'] == 'round':
                    precision = rule['params'].get('precision', -1)
                    result[field] = round(value, precision)
        return result

    def suppress(self, record: dict, fields_to_suppress: list, replacement: str = '***') -> dict:
        result = record.copy()
        for field in fields_to_suppress:
            if field in result:
                result[field] = replacement
        return result
```

### k-Anonymity

```python
def apply_k_anonymity(dataset: list, quasi_identifiers: list, k: int = 5) -> list:
    anonymized = []
    for record in dataset:
        generalized = dict(record)
        for qi in quasi_identifiers:
            value = generalized.get(qi)
            if isinstance(value, int):
                bucket = (value // 10) * 10
                generalized[qi] = f'{bucket}-{bucket + 9}'
            elif isinstance(value, str):
                if len(value) > 4:
                    generalized[qi] = value[:3] + '*' * (len(value) - 3)
        anonymized.append(generalized)

    equivalence_classes = {}
    for record in anonymized:
        key = tuple(record[qi] for qi in quasi_identifiers)
        if key not in equivalence_classes:
            equivalence_classes[key] = []
        equivalence_classes[key].append(record)

    violations = [k for k, v in equivalence_classes.items() if len(v) < k]
    return anonymized

def check_k_anonymity(dataset: list, quasi_identifiers: list, k: int) -> dict:
    classes = {}
    for record in dataset:
        key = tuple(record[qi] for qi in quasi_identifiers)
        classes[key] = classes.get(key, 0) + 1
    min_class_size = min(classes.values())
    violations = {k: v for k, v in classes.items() if v < k}
    return {
        'k': k,
        'satisfied': min_class_size >= k,
        'min_class_size': min_class_size,
        'violations': len(violations),
        'violation_details': violations
    }
```

## Encryption for Privacy

### Field-Level Encryption

```python
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64
import os

class FieldLevelEncryption:
    def __init__(self):
        self.keys = {}

    def generate_key(self, key_id: str, password: str = None) -> str:
        if password:
            salt = os.urandom(16)
            kdf = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=100000)
            key = base64.urlsafe_b64encode(kdf.derive(password.encode()))
        else:
            key = Fernet.generate_key()
        self.keys[key_id] = key
        return key

    def encrypt_field(self, key_id: str, plaintext: str) -> bytes:
        key = self.keys.get(key_id)
        if not key:
            raise ValueError(f'Key not found: {key_id}')
        cipher = Fernet(key)
        return cipher.encrypt(plaintext.encode())

    def decrypt_field(self, key_id: str, ciphertext: bytes) -> str:
        key = self.keys.get(key_id)
        if not key:
            raise ValueError(f'Key not found: {key_id}')
        cipher = Fernet(key)
        return cipher.decrypt(ciphertext).decode()

    def rotate_key(self, old_key_id: str, new_password: str) -> str:
        new_key_id = f'{old_key_id}_rotated'
        self.generate_key(new_key_id, new_password)
        return new_key_id
```

### Tokenization

```python
class TokenizationService:
    def __init__(self, vault):
        self.vault = vault
        self.token_mapping = {}

    def tokenize(self, sensitive_value: str, domain: str = 'default') -> str:
        import uuid
        token = f'tkn_{uuid.uuid4().hex[:24]}'
        self.vault.store(token, {'value': sensitive_value, 'domain': domain})
        self.token_mapping[token] = sensitive_value
        return token

    def detokenize(self, token: str) -> str:
        return self.vault.retrieve(token)['value']

    def tokenize_batch(self, values: list, domain: str = 'default') -> list:
        return [self.tokenize(v, domain) for v in values]

    def format_preserving_tokenize(self, sensitive_value: str, format_pattern: str) -> str:
        placeholder = 'X'
        token_parts = []
        for char in format_pattern:
            if char == placeholder:
                token_parts.append(str(random.randint(0, 9)))
            else:
                token_parts.append(char)
        token = ''.join(token_parts)
        self.vault.store(token, {'value': sensitive_value, 'format': format_pattern})
        return token
```

## Differential Privacy

### Epsilon Parameter

```python
import numpy as np

class DifferentialPrivacy:
    def __init__(self, epsilon: float = 1.0):
        self.epsilon = epsilon
        self.sensitivity = 1.0

    def set_epsilon(self, epsilon: float):
        self.epsilon = epsilon

    def compute_sensitivity(self, dataset: np.ndarray, query_func) -> float:
        dataset1 = dataset[1:]
        self.sensitivity = 0.0
        for i in range(len(dataset)):
            dataset2 = np.delete(dataset, i, axis=0)
            diff = abs(query_func(dataset) - query_func(dataset2))
            self.sensitivity = max(self.sensitivity, diff)
        return self.sensitivity

    def laplace_mechanism(self, query_result: float) -> float:
        scale = self.sensitivity / self.epsilon
        noise = np.random.laplace(0, scale)
        return query_result + noise

    def gaussian_mechanism(self, query_result: float, delta: float = 1e-5) -> float:
        sigma = np.sqrt(2 * np.log(1.25 / delta)) * self.sensitivity / self.epsilon
        noise = np.random.normal(0, sigma)
        return query_result + noise

    def exponential_mechanism(self, options: list, utility_scores: list, epsilon: float) -> object:
        scores = np.array(utility_scores)
        probabilities = np.exp(epsilon * scores / (2 * self.sensitivity))
        probabilities = probabilities / np.sum(probabilities)
        return np.random.choice(options, p=probabilities)

    def compose(self, mechanisms: list, epsilon_per_mechanism: float = None) -> float:
        if epsilon_per_mechanism:
            return epsilon_per_mechanism * len(mechanisms)
        return self.epsilon

    def privacy_accountant(self, queries: list) -> dict:
        total_epsilon = sum(q.get('epsilon', 0) for q in queries)
        total_delta = 1 - np.prod([1 - q.get('delta', 0) for q in queries])
        return {
            'total_epsilon': total_epsilon,
            'total_delta': total_delta,
            'budget_remaining': max(0, self.epsilon - total_epsilon),
            'queries_executed': len(queries)
        }
```

## Privacy in Machine Learning

### Federated Learning

```python
class FederatedLearningNode:
    def __init__(self, node_id: str, local_data):
        self.node_id = node_id
        self.local_data = local_data
        self.local_model = None

    def train_local_model(self, model_class, epochs: int = 1):
        self.local_model = model_class()
        self.local_model.fit(self.local_data, epochs=epochs)
        return self.local_model.get_weights()

    def apply_differential_privacy(self, weights: list, epsilon: float) -> list:
        dp = DifferentialPrivacy(epsilon=epsilon)
        private_weights = []
        for w in weights:
            noisy_w = w + np.random.laplace(0, 1.0/epsilon, size=w.shape)
            private_weights.append(noisy_w)
        return private_weights

class FederatedLearningServer:
    def __init__(self):
        self.nodes = []
        self.global_model = None

    def register_node(self, node: FederatedLearningNode):
        self.nodes.append(node)

    def aggregate_weights(self, node_weights: list) -> list:
        averaged = []
        for weights in zip(*node_weights):
            averaged.append(np.mean(weights, axis=0))
        return averaged

    def training_round(self, model_class, dp_epsilon: float = None) -> dict:
        updates = []
        for node in self.nodes:
            weights = node.train_local_model(model_class)
            if dp_epsilon:
                weights = node.apply_differential_privacy(weights, dp_epsilon)
            updates.append(weights)
        aggregated = self.aggregate_weights(updates)
        return {
            'nodes_participated': len(self.nodes),
            'aggregated_weights': aggregated,
            'differential_privacy_applied': dp_epsilon is not None
        }
```

### Membership Inference Prevention

```python
class MembershipInferenceMonitor:
    def __init__(self, model):
        self.model = model
        self.shadow_models = []

    def train_shadow_models(self, shadow_datasets: list):
        for dataset in shadow_datasets:
            shadow = type(self.model)()
            shadow.fit(dataset)
            self.shadow_models.append(shadow)

    def membership_inference_attack(self, record, dataset_type: str = 'train') -> float:
        predictions = []
        for shadow in self.shadow_models:
            pred = shadow.predict([record])[0]
            predictions.append(pred)
        confidence = np.mean(predictions)
        return confidence

    def assess_leakage_risk(self, test_records: list, train_records: list) -> dict:
        train_confidence = np.mean([
            self.membership_inference_attack(r, 'train') for r in train_records
        ])
        test_confidence = np.mean([
            self.membership_inference_attack(r, 'test') for r in test_records
        ])
        risk = train_confidence - test_confidence
        return {
            'attack_advantage': risk,
            'vulnerability': 'high' if risk > 0.2 else ('medium' if risk > 0.1 else 'low'),
            'recommendation': 'Apply differential privacy training' if risk > 0.2 else 'Current risk acceptable'
        }
```

## Privacy in APIs

### Scoped Access

```python
from functools import wraps

PRIVACY_SCOPES = {
    'profile:read': 'Read user profile (name, email)',
    'profile:write': 'Update user profile',
    'contacts:read': 'Read user contacts',
    'contacts:write': 'Modify user contacts',
    'location:read': 'Read precise location',
    'location:approximate': 'Read approximate location (city level)',
    'analytics:anonymous': 'Read anonymous analytics (no PII)',
    'analytics:aggregated': 'Read aggregated analytics (no individual data)'
}

def require_privacy_scope(scope: str, data_minimization: bool = True):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            token = kwargs.get('token', None)
            if not token or scope not in token.get('scopes', []):
                return {'error': f'Scope {scope} required'}, 403
            if data_minimization:
                kwargs['minimize'] = True
            return func(*args, **kwargs)
        return wrapper
    return decorator
```

## Privacy in Mobile Apps

### App Tracking Transparency

```python
class AppTrackingManager:
    def __init__(self):
        self.tracking_status = {}

    def request_tracking_authorization(self, user_id: str, purpose: str) -> str:
        authorization = {
            'user_id': user_id,
            'purpose': purpose,
            'status': 'not_determined',
            'requested_at': None,
            'responded_at': None
        }
        self.tracking_status[user_id] = authorization
        return 'authorization_requested'

    def grant_tracking(self, user_id: str):
        if user_id in self.tracking_status:
            self.tracking_status[user_id]['status'] = 'authorized'
            self.tracking_status[user_id]['responded_at'] = __import__('datetime').datetime.utcnow().isoformat()

    def deny_tracking(self, user_id: str):
        if user_id in self.tracking_status:
            self.tracking_status[user_id]['status'] = 'denied'
            self.tracking_status[user_id]['responded_at'] = __import__('datetime').datetime.utcnow().isoformat()

    def is_tracking_allowed(self, user_id: str) -> bool:
        return self.tracking_status.get(user_id, {}).get('status') == 'authorized'
```

## Privacy in Cloud

### Shared Responsibility Model

| Layer | Provider Responsibility | Customer Responsibility |
|-------|------------------------|------------------------|
| Physical security | Full | None |
| Network infrastructure | Full | Partial (config) |
| Hypervisor | Full | None |
| Operating system | Partial | Partial |
| Application platform | Partial | Partial |
| Application code | None | Full |
| Data classification | None | Full |
| Access management | Tools provided | Implementation |
| Encryption | KMS provided | Key management, application |
| Compliance | Certifications | Adherence |

### Data Residency

```python
class DataResidencyEnforcer:
    def __init__(self, allowed_regions: list):
        self.allowed_regions = allowed_regions
        self.data_locations = {}

    def register_data_residency(self, data_id: str, region: str):
        self.data_locations[data_id] = {
            'region': region,
            'registered_at': __import__('datetime').datetime.utcnow().isoformat()
        }

    def validate_data_placement(self, data_id: str, target_region: str) -> dict:
        current = self.data_locations.get(data_id)
        if not current:
            return {'allowed': False, 'reason': 'Unknown data'}
        if current['region'] == target_region:
            return {'allowed': True, 'reason': 'Same region'}
        if target_region not in self.allowed_regions:
            return {'allowed': False, 'reason': f'Region {target_region} not allowed'}
        return {
            'allowed': True,
            'reason': 'Cross-region transfer permitted',
            'safeguards_required': True
        }

    def get_residency_report(self) -> dict:
        report = {}
        for data_id, info in self.data_locations.items():
            region = info['region']
            if region not in report:
                report[region] = []
            report[region].append(data_id)
        return report
```

## Cross-Border Data Transfers

### Transfer Mechanisms

| Mechanism | Description | When to Use |
|-----------|-------------|-------------|
| Adequacy Decision | EC recognizes country as adequate | EU to adequate country |
| SCCs | Standard Contractual Clauses | EU to non-adequate country |
| BCRs | Binding Corporate Rules | Within corporate group |
| Derogations | Consent, contract necessity, vital interests | Specific, limited cases |
| Certification | Approved certification mechanism | With certification body |
| Codes of Conduct | Approved codes with binding commitments | Industry-specific |

```python
class CrossBorderTransferAssessor:
    def __init__(self):
        self.adequate_countries = [
            'andorra', 'argentina', 'canada', 'japan', 'new_zealand',
            'switzerland', 'uruguay', 'south_korea', 'united_kingdom',
            'israel'
        ]
        self.transfers = []

    def assess_transfer(self, source_country: str, destination_country: str,
                        data_categories: list, volume: str) -> dict:
        if destination_country in self.adequate_countries:
            mechanism = 'adequacy_decision'
            risk = 'low'
        else:
            mechanism = 'scc'
            risk = 'medium'

        assessment = {
            'source': source_country,
            'destination': destination_country,
            'data_categories': data_categories,
            'volume': volume,
            'mechanism': mechanism,
            'risk_level': risk,
            'safeguards_required': risk == 'high',
            'transfer_impact_assessment_required': risk in ('medium', 'high')
        }
        self.transfers.append(assessment)
        return assessment

    def generate_transfer_report(self) -> dict:
        return {
            'total_transfers': len(self.transfers),
            'by_mechanism': {
                'adequacy': sum(1 for t in self.transfers if t['mechanism'] == 'adequacy_decision'),
                'scc': sum(1 for t in self.transfers if t['mechanism'] == 'scc'),
                'bcr': sum(1 for t in self.transfers if t['mechanism'] == 'bcr')
            },
            'high_risk_transfers': [t for t in self.transfers if t['risk_level'] == 'high'],
            'transfer_impact_assessments_required': [
                t for t in self.transfers if t.get('transfer_impact_assessment_required')
            ]
        }
```

## Vendors and Third-Party Privacy

### Data Processing Agreements

```python
class DataProcessingAgreement:
    def __init__(self, processor_name: str, controller_name: str):
        self.processor = processor_name
        self.controller = controller_name
        self.clauses = {}
        self.sub_processors = []
        self.status = 'draft'

    def add_clause(self, clause_id: str, text: str, category: str):
        self.clauses[clause_id] = {
            'text': text,
            'category': category,
            'accepted': False
        }

    def add_sub_processor(self, name: str, location: str, purpose: str, approved: bool = False):
        self.sub_processors.append({
            'name': name,
            'location': location,
            'purpose': purpose,
            'approved': approved,
            'added_at': __import__('datetime').datetime.utcnow().isoformat()
        })

    def sign(self) -> dict:
        self.status = 'active'
        return {
            'agreement_id': hashlib.sha256(f'{self.processor}{self.controller}'.encode()).hexdigest()[:16],
            'processor': self.processor,
            'controller': self.controller,
            'signed_at': __import__('datetime').datetime.utcnow().isoformat(),
            'clauses_accepted': sum(1 for c in self.clauses.values() if c['accepted']),
            'total_clauses': len(self.clauses),
            'sub_processors': [s['name'] for s in self.sub_processors]
        }

    def audit(self) -> dict:
        return {
            'sub_processor_approval_rate': sum(1 for s in self.sub_processors if s['approved']) / max(len(self.sub_processors), 1),
            'clause_acceptance_rate': sum(1 for c in self.clauses.values() if c['accepted']) / max(len(self.clauses), 1),
            'status': self.status,
            'findings': []
        }
```

## Data Breach Engineering

### Breach Detection

```python
class DataBreachDetector:
    def __init__(self):
        self.anomaly_detectors = []
        self.alerts = []

    def register_detector(self, name: str, detect_func, severity: str = 'medium'):
        self.anomaly_detectors.append({
            'name': name,
            'detect': detect_func,
            'severity': severity
        })

    def analyze_event(self, event: dict) -> list:
        findings = []
        for detector in self.anomaly_detectors:
            try:
                result = detector['detect'](event)
                if result:
                    findings.append({
                        'detector': detector['name'],
                        'event': event,
                        'severity': detector['severity'],
                        'details': result,
                        'detected_at': __import__('datetime').datetime.utcnow().isoformat()
                    })
                    self.alerts.append(findings[-1])
            except Exception as e:
                pass
        return findings

    def assess_breach_severity(self, findings: list) -> str:
        severity_scores = {'critical': 4, 'high': 3, 'medium': 2, 'low': 1}
        max_severity = max(
            (severity_scores.get(f.get('severity', 'low'), 0) for f in findings),
            default=0
        )
        reverse_map = {4: 'critical', 3: 'high', 2: 'medium', 1: 'low'}
        return reverse_map.get(max_severity, 'unknown')

    def get_open_alerts(self) -> list:
        return [a for a in self.alerts if a.get('status') != 'resolved']
```

### Notification Workflow

```python
class BreachNotificationWorkflow:
    def __init__(self):
        self.breach_records = []

    def create_breach_record(self, breach_data: dict) -> str:
        import uuid
        breach_id = str(uuid.uuid4())
        record = {
            'id': breach_id,
            'detected_at': __import__('datetime').datetime.utcnow().isoformat(),
            'breach_type': breach_data.get('type', 'unknown'),
            'data_affected': breach_data.get('data_categories', []),
            'data_subjects_affected': breach_data.get('affected_count', 0),
            'root_cause': breach_data.get('root_cause', ''),
            'status': 'detected',
            'notifications': {}
        }
        self.breach_records.append(record)
        return breach_id

    def evaluate_notification_requirements(self, breach_id: str) -> dict:
        record = next((r for r in self.breach_records if r['id'] == breach_id), None)
        if not record:
            return {'error': 'Breach not found'}

        risk_level = self._assess_risk(record)
        return {
            'supervisory_authority_notification_required': risk_level in ('high', 'medium'),
            'data_subject_notification_required': risk_level == 'high',
            'notification_deadline_hours': 72,
            'risk_level': risk_level,
            'recommended_actions': self._get_recommended_actions(risk_level)
        }

    def notify_supervisory_authority(self, breach_id: str, authority_data: dict) -> dict:
        record = next((r for r in self.breach_records if r['id'] == breach_id), None)
        if not record:
            return {'error': 'Breach not found'}
        notification = {
            'authority': authority_data.get('name', 'Lead DPA'),
            'notified_at': __import__('datetime').datetime.utcnow().isoformat(),
            'description': authority_data.get('description', ''),
            'affected_data_subjects': record['data_subjects_affected'],
            'measures_taken': authority_data.get('measures', [])
        }
        record['notifications']['supervisory_authority'] = notification
        record['status'] = 'notified_authority'
        return notification

    def notify_data_subjects(self, breach_id: str, communication_data: dict) -> dict:
        record = next((r for r in self.breach_records if r['id'] == breach_id), None)
        if not record:
            return {'error': 'Breach not found'}
        notification = {
            'language': communication_data.get('language', 'en'),
            'channels': communication_data.get('channels', ['email']),
            'content': communication_data.get('content', ''),
            'sent_at': __import__('datetime').datetime.utcnow().isoformat(),
            'recipients_count': record['data_subjects_affected']
        }
        record['notifications']['data_subjects'] = notification
        record['status'] = 'notified_subjects'
        return notification

    def _assess_risk(self, record: dict) -> str:
        if 'financial' in record.get('data_affected', []) or 'special_category' in record.get('data_affected', []):
            return 'high'
        if record.get('data_subjects_affected', 0) > 10000:
            return 'high'
        if record.get('data_subjects_affected', 0) > 1000:
            return 'medium'
        return 'low'

    def _get_recommended_actions(self, risk_level: str) -> list:
        actions = {
            'high': [
                'Notify supervisory authority within 24 hours',
                'Notify affected data subjects without delay',
                'Engage incident response team',
                'Preserve all evidence',
                'Contact legal counsel'
            ],
            'medium': [
                'Notify supervisory authority within 72 hours',
                'Assess risk to data subjects',
                'Implement containment measures'
            ],
            'low': [
                'Document the breach internally',
                'Review and strengthen controls'
            ]
        }
        return actions.get(risk_level, [])

    def generate_breach_report(self, breach_id: str) -> dict:
        record = next((r for r in self.breach_records if r['id'] == breach_id), None)
        if not record:
            return {'error': 'Breach not found'}
        return {
            'breach_id': record['id'],
            'timeline': {
                'detected': record['detected_at'],
                'authority_notified': record['notifications'].get('supervisory_authority', {}).get('notified_at'),
                'subjects_notified': record['notifications'].get('data_subjects', {}).get('sent_at')
            },
            'status': record['status'],
            'affected_count': record['data_subjects_affected'],
            'data_categories': record['data_affected']
        }
```

## Privacy Automation

### Tools Integration

| Tool | Capabilities | Integration Method |
|------|-------------|-------------------|
| OneTrust | PIA automation, consent, DSAR | REST API, webhooks |
| BigID | Data discovery, classification, mapping | REST API, data connectors |
| Securiti | Privacy ops, consent, assessments | REST API, CLI tools |
| TrustArc | PIA, consent, vendor management | REST API, SDK |
| AWS Artifact | Compliance reports, agreements | API, console |
| Azure Purview | Data mapping, catalog, lineage | SDK, REST API |
| Osano | Consent management, cookie scanning | JS SDK, API |
| Ethyca | Engineering-focused privacy tools | Python SDK, API |

```python
class PrivacyOrchestrator:
    def __init__(self):
        self.tools = {}

    def register_tool(self, name: str, api_client):
        self.tools[name] = api_client

    def automate_dpia(self, project_data: dict) -> dict:
        dpia = DPIA(
            project_name=project_data['name'],
            controller=project_data.get('controller', '')
        )
        screening = dpia.screening_check()
        if screening['dpia_required']:
            dpia.describe_processing(project_data.get('processing', {}))
            risks = dpia.assess_risks()
            measures = project_data.get('measures', [])
            dpia.document_measures(measures)
            report = dpia.generate_report()
            return report
        return {'dpia_required': False, 'screening': screening}

    def sync_consent_to_tools(self, consent_records: list, target_tools: list) -> dict:
        results = {}
        for tool_name in target_tools:
            tool = self.tools.get(tool_name)
            if tool:
                try:
                    tool.sync_consent(consent_records)
                    results[tool_name] = 'synced'
                except Exception as e:
                    results[tool_name] = f'failed: {str(e)}'
        return results
```

## Privacy Metrics

### Key Performance Indicators

| Metric | Formula | Target | Description |
|--------|---------|--------|-------------|
| PIA Completion Rate | Completed PIAs / Total PIAs | > 90% | Percentage of required PIAs completed |
| DSAR Response Time | Days to fulfill DSAR | < 30 days | Average time to complete DSAR |
| DSAR Response Within Deadline | On-time DSARs / Total DSARs | > 95% | Percentage of DSARs within legal timeframe |
| Consent Opt-In Rate | Granted consents / Total presented | Varies | Marketing, analytics, tracking consent rates |
| Consent Withdrawal Rate | Withdrawn / Total granted | Varies | Rate of consent withdrawal |
| Breach Detection Time | Hours from occurrence to detection | < 24 hours | Mean time to detect a breach |
| Breach Notification Time | Hours from detection to notification | < 72 hours | Mean time to notify authority |
| Data Inventory Coverage | Inventoried assets / Total assets | > 95% | Percentage of data assets in inventory |
| Retention Compliance | Assets with retention / Total | > 90% | Percentage of assets with retention policy |
| Training Completion | Trained employees / Total | > 95% | Privacy training completion rate |
| DPIA Backlog | DPIAs past due | 0 | Count of overdue assessments |
| Vendor Assessment Rate | Assessed vendors / Total | > 80% | Vendors with privacy assessment |

```python
class PrivacyMetricsDashboard:
    def __init__(self):
        self.metrics = {}

    def record_metric(self, metric_name: str, value: float, timestamp: str = None):
        if timestamp is None:
            timestamp = __import__('datetime').datetime.utcnow().isoformat()
        if metric_name not in self.metrics:
            self.metrics[metric_name] = []
        self.metrics[metric_name].append({'value': value, 'timestamp': timestamp})

    def calculate_trend(self, metric_name: str, periods: int = 12) -> dict:
        values = self.metrics.get(metric_name, [])
        if len(values) < 2:
            return {'trend': 'insufficient_data'}
        recent = values[-periods:]
        avg_old = sum(v['value'] for v in recent[:len(recent)//2]) / max(len(recent)//2, 1)
        avg_new = sum(v['value'] for v in recent[len(recent)//2:]) / max(len(recent) - len(recent)//2, 1)
        direction = 'up' if avg_new > avg_old else ('down' if avg_new < avg_old else 'stable')
        return {
            'metric': metric_name,
            'trend': direction,
            'change_pct': ((avg_new - avg_old) / avg_old * 100) if avg_old else 0,
            'current_value': recent[-1]['value'] if recent else None
        }

    def generate_privacy_scorecard(self) -> dict:
        scorecard = {}
        for name, values in self.metrics.items():
            if values:
                latest = values[-1]
                scorecard[name] = {
                    'current': latest['value'],
                    'date': latest['timestamp'],
                    'trend': self.calculate_trend(name)['trend']
                }
        return scorecard
```

## Key Points

- Privacy by Design embeds privacy proactively as a default, embedded, full-lifecycle requirement
- Article 25 of GDPR mandates data protection by design and by default with technical measures
- DPIA (Article 35) is mandatory for high-risk processing and must be documented
- LINDDUN provides a structured methodology for privacy-specific threat modeling
- Data minimization applies purpose, collection, and retention limitation
- Consent management requires collection, preference storage, withdrawal mechanisms, and audit trails
- DSAR workflows must handle access, rectification, erasure, and portability within 30 days
- Right to erasure requires hard delete, cascade deletion, and backup purging strategies
- Anonymization renders data irreversibly non-personal; pseudonymization is reversible
- Differential privacy provides mathematical guarantees for privacy protection
- Federated learning and on-device ML reduce centralized data collection risks
- Cross-border transfers require adequacy decisions, SCCs, or BCRs
- Data processing agreements are required for all third-party processors
- Breach notification must follow specific timelines (72 hours for GDPR)
- Privacy automation tools (OneTrust, BigID, Securiti) integrate via APIs for scale
- Privacy metrics provide quantitative oversight of program effectiveness
