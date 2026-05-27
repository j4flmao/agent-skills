# Supabase Backup and Migration

Manage database backups, point-in-time recovery, and schema migrations.

## Database Migrations

```bash
# Initialize migrations
supabase init

# Create a new migration
supabase migration new add_profiles_table

# Apply migrations
supabase migration up

# Roll back last migration
supabase migration down

# Apply to remote project
supabase db push

# Pull remote schema
supabase db pull
```

## Migration File Structure

```sql
-- supabase/migrations/20260527000001_add_profiles_table.sql
-- Up migration
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Down migration
-- DROP TABLE public.profiles;
```

## Branching for Development

```bash
# Create a branch (isolated environment)
supabase branches create feat-new-feature

# List branches
supabase branches list

# Delete a branch
supabase branches delete feat-new-feature

# Switch branch
supabase branches switch feat-new-feature
```

Branching creates a full database clone for isolated development.

## Point-in-Time Recovery (PITR)

Enable PITR in Supabase dashboard for production projects:

```sql
-- Check WAL archive status
SELECT * FROM pg_stat_archiver;

-- View available restore points
SELECT * FROM pg_stat_wal_receiver;

-- PITR retention: minimum 7 days for Pro plan
-- PITR retention: up to 30 days for Team plan
```

## Database Backups

```bash
# Export entire database
pg_dump \
  --dbname=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres \
  --format=custom \
  --file=backup_20260527.dump

# Export specific schema only
pg_dump \
  --dbname=postgresql://... \
  --schema=public \
  --format=custom \
  --file=schema_backup.dump

# Export as plain SQL
pg_dump \
  --dbname=postgresql://... \
  --format=plain \
  --file=backup_20260527.sql
```

## Restore from Backup

```bash
# Restore custom format backup
pg_restore \
  --dbname=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres \
  --clean \
  --if-exists \
  backup_20260527.dump

# Restore plain SQL
psql \
  postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres \
  -f backup_20260527.sql
```

## Data Export/Import for Specific Tables

```typescript
// Export table data via Supabase client
async function exportTableToJSON(tableName: string): Promise<void> {
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .order('id');

  if (error) throw error;
  await fs.writeFile(`${tableName}_export.json`, JSON.stringify(data, null, 2));
}

// Import from JSON
async function importFromJSON(tableName: string, filePath: string): Promise<void> {
  const content = await fs.readFile(filePath, 'utf-8');
  const records = JSON.parse(content);

  // Use upsert to handle existing records
  const { error } = await supabase
    .from(tableName)
    .upsert(records, { onConflict: 'id' });

  if (error) throw error;
}
```

## Seed Data

```bash
# Create seed file
supabase seed new

# supabase/seed.sql
INSERT INTO public.profiles (id, display_name) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Alice'),
  ('00000000-0000-0000-0000-000000000002', 'Bob');

# Apply seed data
supabase db reset  # drops schema, applies migrations, runs seeds
```

## Key Points
- Use `supabase migration` for all schema changes, never modify via dashboard
- Create branches for isolated development environments
- Enable PITR for production projects (requires Pro plan or higher)
- Use `pg_dump` for full database backups
- Test restore process regularly to verify backup integrity
- Use seed files for reproducible test data
- Always write both up and down migrations
- Commit migration files to version control
