# Data-Level Authorization

Authorization at the application layer is not enough. Data-level authorization provides defense in depth.

## Why Data-Level Authorization?

| Layer | Bypass Risk | Protection |
|-------|-------------|------------|
| UI hiding | High (API can be called directly) | UX only |
| API middleware | Medium (compromised service can skip middleware) | App-level |
| Data layer | Low (SQL injection, direct DB access) | **Database enforced** |

Always implement at least two layers: API middleware + data-level enforcement.

## PostgreSQL Row-Level Security

### Enable RLS on a table
```sql
-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents FORCE ROW LEVEL SECURITY;  -- Even table owner

-- Policy: users can only see their own org's documents
CREATE POLICY org_isolation ON documents
  USING (org_id = current_setting('app.current_org_id')::uuid);

-- Policy: managers can see all dept docs
CREATE POLICY manager_dept_access ON documents
  USING (
    current_setting('app.current_role') = 'manager'
    AND dept_id = current_setting('app.current_dept_id')::uuid
  );
```

### Set user context per session
```javascript
// After authentication, set PostgreSQL session variables
async function setPGSessionContext(req, res, next) {
  await db.query(`SET app.current_user_id = '${req.user.id}'`);
  await db.query(`SET app.current_role = '${req.user.role}'`);
  await db.query(`SET app.current_org_id = '${req.user.orgId}'`);
  await db.query(`SET app.current_dept_id = '${req.user.deptId}'`);
  next();
}
```

### Complex RLS policies
```sql
-- Policy: department docs + own docs + shared docs
CREATE POLICY document_access ON documents
  USING (
    -- Same department
    dept_id = current_setting('app.current_dept_id')::uuid
    -- Own documents (regardless of dept)
    OR owner_id = current_setting('app.current_user_id')::uuid
    -- Explicitly shared with user
    OR id IN (
      SELECT document_id FROM document_shares
      WHERE user_id = current_setting('app.current_user_id')::uuid
    )
    -- Manager override for their dept
    OR (
      current_setting('app.current_role') IN ('manager', 'org-admin')
      AND dept_id = current_setting('app.current_dept_id')::uuid
    )
  );

-- Policy: confidential documents require clearance
CREATE POLICY confidential_access ON documents
  AS RESTRICTIVE  -- Combined with other policies (narrower access)
  FOR ALL
  USING (
    classification != 'confidential'
    OR (
      classification = 'confidential'
      AND current_setting('app.current_clearance')::int >= 3
    )
  );
```

### Supabase RLS examples
```sql
-- Row-level security for multi-tenant app
CREATE POLICY tenant_isolation ON invoices
  USING (tenant_id = auth.jwt() ->> 'tenant_id');

-- User can only approve invoices in their department
CREATE POLICY dept_approval ON invoices
  FOR UPDATE
  USING (
    auth.jwt() ->> 'department' = department
    AND auth.jwt() ->> 'role' IN ('manager', 'org-admin')
  )
  WITH CHECK (
    -- Can only set status to 'approved', not delete
    status = 'approved'
  );
```

## Prisma Client Extensions

```typescript
// Prisma extension for tenant isolation
const tenantAwarePrisma = prisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        // Skip for unauthenticated or specific models
        const skipModels = ['Tenant', 'AuditLog'];
        if (skipModels.includes(model)) return query(args);

        const tenantId = AsyncLocalStorage.getStore()?.tenantId;
        if (!tenantId) return query(args);

        // Append tenant filter for read operations
        if (['findMany', 'findFirst', 'findUnique', 'count'].includes(operation)) {
          args.where = { ...args.where, tenantId };
        }

        // Set tenant for create operations
        if (operation === 'create') {
          args.data = { ...args.data, tenantId };
        }

        return query(args);
      },
    },
  },
});

// Usage — tenant filter is automatically applied
const docs = await tenantAwarePrisma.document.findMany(); // WHERE tenant_id = :current
const doc = await tenantAwarePrisma.document.create({
  data: { title: 'New Doc' }, // tenantId auto-injected
});
```

### Prisma policy-based permissions
```typescript
// User-based authorization via Prisma
const userAwarePrisma = prisma.$extends({
  model: {
    document: {
      async findAuthorized(userId: string, role: string, deptId: string) {
        return prisma.document.findMany({
          where: {
            OR: [
              { ownerId: userId },
              { departmentId: deptId },
              { shares: { some: { userId } } },
              ...(role === 'admin' ? [{}] : []),
            ],
          },
        });
      },
    },
  },
});

// Usage
const docs = await userAwarePrisma.document.findAuthorized(
  currentUser.id,
  currentUser.role,
  currentUser.deptId
);
```

## TypeORM / MikroORM

```typescript
// TypeORM find options with automatic scope
class ScopedRepository<T extends { orgId: string }> extends Repository<T> {
  async findScoped(options?: FindManyOptions<T>): Promise<T[]> {
    const orgId = getCurrentOrgId();
    return this.find({
      ...options,
      where: {
        ...options?.where,
        orgId,
      },
    });
  }

  async findOneScoped(id: string): Promise<T | null> {
    const orgId = getCurrentOrgId();
    return this.findOne({
      where: { id, orgId } as any,
    });
  }
}

// MikroORM — global filter
@Entity()
@Filter({
  name: 'tenant',
  cond: { tenantId: getCurrentTenantId() },
  default: true,
})
export class Document {
  @Property()
  tenantId!: string;
}
```

## MongoDB

```javascript
// MongoDB aggregation with access filter
function getDocumentsPipeline(user) {
  const matchStage = {
    $match: {
      $or: [
        { ownerId: user.id },
        { departmentId: user.deptId },
        { 'shares.userId': user.id },
      ],
    },
  };

  // Field-level security
  const projectStage = {
    $project: {
      title: 1,
      content: user.role === 'viewer' ? 0 : 1,
      salary: user.role === 'admin' ? 1 : 0,
      createdAt: 1,
    },
  };

  return db.collection('documents').aggregate([matchStage, projectStage]);
}
```

## SQL Views for Access Control

```sql
-- Create a view that enforces authorization
CREATE VIEW authorized_documents AS
SELECT d.*
FROM documents d
LEFT JOIN document_shares ds ON ds.document_id = d.id
WHERE
  d.owner_id = current_setting('app.current_user_id')::uuid
  OR d.department_id = current_setting('app.current_dept_id')::uuid
  OR ds.user_id = current_setting('app.current_user_id')::uuid
  OR current_setting('app.current_role') IN ('admin', 'super-admin');

-- Users query the view, not the table
SELECT * FROM authorized_documents WHERE status = 'active';
```

## Field-Level Security

```javascript
// Strip sensitive fields based on role
function sanitizeResource(resource, user) {
  const FIELD_POLICIES = {
    'employee': {
      public:    ['name', 'title', 'department'],
      internal:  ['email', 'phone', 'office'],
      sensitive: ['salary', 'ssn', 'performance_review', 'emergency_contact'],
    },
  };

  const fields = FIELD_POLICIES[resource.type];
  if (!fields) return resource;

  const allowed = new Set();
  if (user.role === 'admin' || user.role === 'hr-admin') {
    fields.public.forEach(f => allowed.add(f));
    fields.internal.forEach(f => allowed.add(f));
    fields.sensitive.forEach(f => allowed.add(f));
  } else if (user.role === 'manager') {
    fields.public.forEach(f => allowed.add(f));
    fields.internal.forEach(f => allowed.add(f));
    // Sensitive fields only for own direct reports
    if (resource.department === user.deptId) {
      fields.sensitive.forEach(f => allowed.add(f));
    }
  } else {
    fields.public.forEach(f => allowed.add(f));
  }

  return Object.fromEntries(
    Object.entries(resource).filter(([key]) => allowed.has(key))
  );
}
```

## GraphQL Field-Level Authorization

```graphql
# Schema directives for field-level auth
directive @auth(requires: Role = ADMIN) on OBJECT | FIELD_DEFINITION
directive @hasScope(scope: String!) on FIELD_DEFINITION

enum Role {
  ADMIN
  MANAGER
  EDITOR
  VIEWER
  GUEST
}

type Employee {
  name: String!
  title: String!
  email: String!        @auth(requires: MANAGER)
  salary: Float!        @auth(requires: ADMIN)
  ssn: String!          @auth(requires: ADMIN)
  department: Department!
}
```

```javascript
// GraphQL resolver with field-level auth
const resolvers = {
  Employee: {
    salary: (parent, args, context) => {
      if (context.user.role !== 'admin' && context.user.role !== 'hr-admin') {
        return null; // Field resolves to null for unauthorized
      }
      return parent.salary;
    },
    ssn: (parent, args, context) => {
      if (context.user.role !== 'admin') return null;
      if (parent.department !== context.user.deptId) return null;
      return parent.ssn;
    },
  },
};
```

## Audit via Database Triggers

```sql
-- Log every access to sensitive tables
CREATE OR REPLACE FUNCTION log_access()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO access_log (
    user_id, action, table_name, record_id, old_data, new_data, ip_address
  ) VALUES (
    current_setting('app.current_user_id')::uuid,
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    row_to_json(OLD),
    row_to_json(NEW),
    inet_client_addr()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_documents
  AFTER INSERT OR UPDATE OR DELETE ON documents
  FOR EACH ROW EXECUTE FUNCTION log_access();
```

## Defense in depth checklist

- [ ] Application middleware authorizes every request (first line).
- [ ] PostgreSQL RLS prevents direct DB access bypass.
- [ ] Field-level security strips sensitive fields from API responses.
- [ ] GraphQL resolvers enforce field-level authorization.
- [ ] Database sessions set user context after authentication.
- [ ] Audit triggers log every data modification.
- [ ] Prisma/ORM extensions auto-append tenant filters.
- [ ] SQL views restrict access for read-only roles.
- [ ] Backup/restore processes respect access control boundaries.
