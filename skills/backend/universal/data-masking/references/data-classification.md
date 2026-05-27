# Data Classification

## Classification Levels

```typescript
enum DataClassification {
  PUBLIC = 'public',
  INTERNAL = 'internal',
  CONFIDENTIAL = 'confidential',
  RESTRICTED = 'restricted',
  REGULATED = 'regulated',
}

interface ClassificationRule {
  level: DataClassification
  description: string
  examples: string[]
  handling: {
    encryption: boolean
    masking: boolean
    accessControl: boolean
    auditLogging: boolean
    retentionDays: number
  }
}

const classificationRules: Record<DataClassification, ClassificationRule> = {
  [DataClassification.PUBLIC]: {
    level: DataClassification.PUBLIC,
    description: 'Information that can be freely shared',
    examples: ['Product names', 'Marketing content', 'Published reports'],
    handling: {
      encryption: false,
      masking: false,
      accessControl: false,
      auditLogging: false,
      retentionDays: 365,
    },
  },
  [DataClassification.INTERNAL]: {
    level: DataClassification.INTERNAL,
    description: 'Internal business information',
    examples: ['Internal docs', 'Meeting notes', 'Project plans'],
    handling: {
      encryption: true,
      masking: false,
      accessControl: true,
      auditLogging: false,
      retentionDays: 730,
    },
  },
  [DataClassification.CONFIDENTIAL]: {
    level: DataClassification.CONFIDENTIAL,
    description: 'Sensitive business information',
    examples: ['Customer data', 'Financial records', 'Employee data'],
    handling: {
      encryption: true,
      masking: true,
      accessControl: true,
      auditLogging: true,
      retentionDays: 2555,
    },
  },
  [DataClassification.RESTRICTED]: {
    level: DataClassification.RESTRICTED,
    description: 'Highly sensitive information',
    examples: ['Trade secrets', 'M&A data', 'Board materials'],
    handling: {
      encryption: true,
      masking: true,
      accessControl: true,
      auditLogging: true,
      retentionDays: 3650,
    },
  },
  [DataClassification.REGULATED]: {
    level: DataClassification.REGULATED,
    description: 'Information subject to regulations',
    examples: ['PII', 'PHI', 'PCI data'],
    handling: {
      encryption: true,
      masking: true,
      accessControl: true,
      auditLogging: true,
      retentionDays: 2555,
    },
  },
}
```

## Automatic Classification

```typescript
interface ClassifiedField {
  name: string
  classification: DataClassification
  confidence: number
  reason: string
}

class DataClassifier {
  private classifiers: Array<{
    classify: (value: unknown) => DataClassification | null
    name: string
    priority: number
  }> = []

  addClassifier(name: string, priority: number, classify: (value: unknown) => DataClassification | null): void {
    this.classifiers.push({ name, priority, classify })
    this.classifiers.sort((a, b) => b.priority - a.priority)
  }

  classifyField(name: string, value: unknown): ClassifiedField {
    for (const classifier of this.classifiers) {
      const result = classifier.classify(value)
      if (result) {
        return {
          name,
          classification: result,
          confidence: 0.9,
          reason: `Classified by ${classifier.name}`,
        }
      }
    }

    return {
      name,
      classification: DataClassification.INTERNAL,
      confidence: 0.5,
      reason: 'Default classification',
    }
  }

  classifyObject(data: Record<string, unknown>): ClassifiedField[] {
    return Object.entries(data).map(([name, value]) =>
      this.classifyField(name, value)
    )
  }
}

const classifier = new DataClassifier()

classifier.addClassifier('pii-detector', 100, (value) => {
  if (typeof value === 'string') {
    if (/^[\w.-]+@[\w.-]+\.\w+$/.test(value)) return DataClassification.REGULATED
    if (/^\d{3}-\d{2}-\d{4}$/.test(value)) return DataClassification.REGULATED
    if (/^(?:\d{4}[-\s]?){3}\d{4}$/.test(value)) return DataClassification.REGULATED
  }
  return null
})

classifier.addClassifier('financial-detector', 90, (value) => {
  if (typeof value === 'number' && value > 10000) return DataClassification.CONFIDENTIAL
  if (typeof value === 'string' && /^\$?\d+/.test(value)) return DataClassification.CONFIDENTIAL
  return null
})
```

## Classification-Aware Logging

```typescript
interface LogEntry {
  timestamp: string
  level: string
  message: string
  data?: Record<string, unknown>
  classification?: DataClassification
}

class ClassifiedLogger {
  private classifiers: DataClassifier

  constructor() {
    this.classifiers = new DataClassifier()
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.log('info', message, data)
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.log('warn', message, data)
  }

  error(message: string, error?: Error, data?: Record<string, unknown>): void {
    this.log('error', message, { ...data, error: error?.message })
  }

  private log(level: string, message: string, data?: Record<string, unknown>): void {
    const entry: LogEntry = { timestamp: new Date().toISOString(), level, message }

    if (data) {
      const classifications = this.classifiers.classifyObject(data)
      const maxClassification = this.getMaxClassification(classifications)
      entry.classification = maxClassification

      const rule = classificationRules[maxClassification]
      if (rule.handling.masking) {
        entry.data = this.maskSensitiveData(data, classifications)
      } else {
        entry.data = data
      }
    }

    this.writeLog(entry)
  }
}
```

## Key Points

- Define clear data classification levels with handling rules
- Implement automatic classification with priority-based classifiers
- Handle data according to its classification level
- Mask or encrypt data based on classification rules
- Log access to classified data for audit compliance
- Apply retention policies per classification level
- Classify data at collection points
- Train classifiers with domain-specific patterns
- Review and update classifications periodically
- Document classification decisions for compliance
- Use consistent classification across systems
- Test classification with representative data samples
