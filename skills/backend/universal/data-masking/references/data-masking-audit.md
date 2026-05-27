# Data Masking Audit

## Overview
Audit data masking implementation: verify PII is properly masked, test access controls, log sensitive data access, and validate compliance.

## PII Detection Audit

```typescript
class PiiAuditService {
  private readonly piiPatterns: Map<string, RegExp> = new Map([
    ['email', /\S+@\S+\.\S+/],
    ['phone', /\+?1?\d{10,15}/],
    ['ssn', /\d{3}-\d{2}-\d{4}/],
    ['credit_card', /\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}/],
    ['ip_address', /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/],
  ]);

  async auditTableForPii(tableName: string, columns: string[]): Promise<PiiAuditResult> {
    const findings: PiiFinding[] = [];

    for (const column of columns) {
      const sample = await this.getColumnSample(tableName, column, 100);

      for (const value of sample) {
        if (!value) continue;

        for (const [piiType, pattern] of this.piiPatterns) {
          if (pattern.test(String(value)) && !this.isMasked(String(value))) {
            findings.push({
              table: tableName,
              column,
              piiType,
              sampleValue: this.truncate(String(value)),
              masked: false,
              severity: 'high',
            });
          }
        }
      }
    }

    return {
      table: tableName,
      columnsScanned: columns.length,
      rowsSampled: 100,
      findings,
      passed: findings.length === 0,
      auditedAt: new Date(),
    };
  }

  private isMasked(value: string): boolean {
    // Check common masking patterns
    return (
      value.includes('***') ||
      value.includes('XXXX') ||
      value.includes('****') ||
      /^[*]{2,}/.test(value)
    );
  }
}
```

## Masking Coverage Report

```typescript
class MaskingCoverageReporter {
  async generateCoverageReport(): Promise<MaskingCoverageReport> {
    const schemas = await this.getDatabaseSchema();
    const maskingRules = await this.getMaskingConfig();
    const totalCovered: number[] = [];
    const uncovered: UncoveredField[] = [];

    for (const schema of schemas) {
      for (const table of schema.tables) {
        for (const column of table.columns) {
          if (this.isSensitive(column)) {
            const hasRule = maskingRules.some(r =>
              r.table === table.name && r.column === column.name
            );

            if (hasRule) {
              totalCovered.push(1);
            } else {
              uncovered.push({
                schema: schema.name,
                table: table.name,
                column: column.name,
                type: column.dataType,
                classification: column.classification,
              });
            }
          }
        }
      }
    }

    const total = totalCovered.length + uncovered.length;
    return {
      totalSensitiveFields: total,
      coveredFields: totalCovered.length,
      uncoveredFields: uncovered.length,
      coverageRate: total > 0 ? (totalCovered.length / total) * 100 : 0,
      uncovered,
      generatedAt: new Date(),
    };
  }
}
```

## Access Audit Log

```typescript
interface DataAccessEvent {
  userId: string;
  action: 'read' | 'write' | 'export';
  field: string;
  recordId: string;
  timestamp: Date;
  ipAddress: string;
  reason?: string;
}

class DataAccessAuditor {
  async logAccess(event: DataAccessEvent): Promise<void> {
    await DataAccessLog.create(event);

    // Check for unusual access patterns
    const recentAccess = await DataAccessLog.countDocuments({
      userId: event.userId,
      timestamp: { $gte: new Date(Date.now() - 3600000) },
      field: event.field,
    });

    if (recentAccess > 100) {
      await alertService.send({
        type: 'EXCESSIVE_DATA_ACCESS',
        severity: 'high',
        userId: event.userId,
        field: event.field,
        accessCount: recentAccess,
        window: '1 hour',
      });
    }
  }

  async getUserAccessReport(userId: string, days: number): Promise<UserAccessReport> {
    const since = new Date(Date.now() - days * 86400000);
    const logs = await DataAccessLog.find({ userId, timestamp: { $gte: since } })
      .sort({ timestamp: -1 })
      .lean();

    const sensitiveAccess = logs.filter(l =>
      ['ssn', 'credit_card', 'phone', 'email'].includes(l.field)
    );

    return {
      userId,
      period: `${days} days`,
      totalAccess: logs.length,
      sensitiveAccess: sensitiveAccess.length,
      accessByField: this.groupBy(logs, 'field'),
      accessByAction: this.groupBy(logs, 'action'),
      recentAccess: logs.slice(0, 50),
    };
  }
}
```

## Compliance Validation

```typescript
class ComplianceValidator {
  async validateGdprCompliance(): Promise<ValidationResult> {
    const issues: ComplianceIssue[] = [];

    // Check that PII fields have masking rules
    const coverage = await maskingCoverageReporter.generateCoverageReport();
    if (coverage.coverageRate < 100) {
      issues.push({
        framework: 'GDPR',
        article: 'Article 17',
        severity: 'high',
        message: `Data masking coverage is ${coverage.coverageRate.toFixed(1)}%. All PII fields must be masked.`,
        fields: coverage.uncovered.map(u => `${u.table}.${u.column}`),
      });
    }

    // Check right to erasure support
    const erasureSupported = await this.checkErasureSupport();
    if (!erasureSupported) {
      issues.push({
        framework: 'GDPR',
        article: 'Article 17',
        severity: 'critical',
        message: 'Right to erasure (data deletion) is not implemented for PII fields.',
      });
    }

    // Check audit trail
    const auditEnabled = await this.checkAuditLogging();
    if (!auditEnabled) {
      issues.push({
        framework: 'GDPR',
        article: 'Article 5',
        severity: 'high',
        message: 'Access to masked data is not being audited.',
      });
    }

    return {
      framework: 'GDPR',
      compliant: issues.length === 0,
      issues,
      validatedAt: new Date(),
    };
  }

  async validatePciCompliance(): Promise<ValidationResult> {
    const issues: ComplianceIssue[] = [];

    // PCI DSS Requirement 3.4: render PAN unreadable
    const panFields = await this.findPanFields();
    for (const field of panFields) {
      if (!field.isTokenized && !field.isEncrypted) {
        issues.push({
          framework: 'PCI DSS',
          article: 'Req 3.4',
          severity: 'critical',
          message: `PAN field ${field.table}.${field.column} is not tokenized or encrypted.`,
        });
      }
    }

    return {
      framework: 'PCI DSS',
      compliant: issues.length === 0,
      issues,
      validatedAt: new Date(),
    };
  }
}
```

## Unmasking Authorization

```typescript
class UnmaskingService {
  async requestUnmasking(
    userId: string,
    field: string,
    recordId: string,
    reason: string
  ): Promise<UnmaskingResult> {
    // Log the unmasking request
    await dataAccessAuditor.logAccess({
      userId,
      action: 'read',
      field,
      recordId,
      timestamp: new Date(),
      reason,
    });

    // Verify user has explicit permission to view unmasked data
    const hasPermission = await this.authorizationService.hasPermission(
      userId,
      `unmask:${field}`,
      recordId
    );

    if (!hasPermission) {
      return { success: false, error: 'INSUFFICIENT_PERMISSIONS' };
    }

    // Check if unmasking is in approved hours/context
    if (!this.isWithinApprovedContext(userId)) {
      return { success: false, error: 'UNMASKING_NOT_ALLOWED_IN_CONTEXT' };
    }

    return { success: true };
  }
}
```

## Key Points
- Regularly audit database tables for unmasked PII using pattern detection
- Track masking coverage rate and identify uncovered sensitive fields
- Log every access to sensitive data with user, field, and reason
- Validate compliance with GDPR (right to erasure) and PCI DSS (PAN protection)
- Require explicit authorization for unmasking operations
