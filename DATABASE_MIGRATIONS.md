# Database migrations

ChainBounty uses
[Prisma Migrate](https://www.prisma.io/docs/orm/prisma-migrate) with
PostgreSQL. The schema lives in `prisma/schema.prisma`, and committed migration
history lives in `prisma/migrations/`.

This guide separates **development** commands from **deployment** commands because
`prisma migrate dev` is intentionally interactive and must not be used against a
production database.

## Quick reference

- Apply existing migrations during local development:
  `npx prisma migrate dev`.
- Create a migration after changing the schema:
  `npx prisma migrate dev --name <name>`.
- Inspect migration state locally or during deployment diagnostics:
  `npx prisma migrate status`.
- Apply committed pending migrations in CI, staging, or production:
  `npx prisma migrate deploy`.
- Regenerate Prisma Client after schema/client changes:
  `npx prisma generate`.
- Validate and format the Prisma schema before committing:
  `npx prisma validate` and `npx prisma format`.
- Recreate only a disposable local/test database:
  `npx prisma migrate reset`.

## 1. Apply the existing migration history locally

Install dependencies and start the repository's PostgreSQL service:

```bash
npm install
docker compose up -d postgres
cp .env.example .env
```

The default `.env.example` points at the Compose development database on
`localhost:5432`. Apply all committed migrations:

```bash
npx prisma migrate dev
```

Then confirm that the database and the checked-in migration history agree:

```bash
npx prisma migrate status
```

A clean checkout should report that the database schema is up to date.

> **Production/CI:** use `npx prisma migrate deploy`, not `migrate dev`.
> `migrate deploy` applies committed pending migrations without creating new
> migration files or using a development shadow-database workflow.

## 2. Create a migration for a schema change

1. Edit `prisma/schema.prisma`.
2. Format and validate the schema:

   ```bash
   npx prisma format
   npx prisma validate
   ```

3. Create and apply one migration for the logical change:

   ```bash
   npx prisma migrate dev --name add_bounty_tags
   ```

   Prisma creates a new directory under `prisma/migrations/`, for example:

   ```text
   prisma/migrations/
   ├── 20240904000000_init/
   │   └── migration.sql
   └── 20261003120000_add_bounty_tags/
       └── migration.sql
   ```

4. **Review the generated `migration.sql` before committing it.** In particular,
   check destructive operations such as `DROP TABLE`, `DROP COLUMN`, type
   changes, required columns on populated tables, and changes to unique or
   foreign-key constraints.
5. Regenerate Prisma Client and run the project checks:

   ```bash
   npx prisma generate
   npm run build
   npm run lint
   npm run format:check
   npm test
   ```

6. Commit both the schema change and the generated migration directory.

Do not use `prisma db push` as a substitute for a committed migration when a
change is intended to ship. `db push` can be useful for disposable prototyping,
but it does not create the migration history required by other environments.

## 3. Deploy migrations safely

Before deployment, inspect migration state:

```bash
npx prisma migrate status
```

Apply only the migration files already committed to the repository:

```bash
npx prisma migrate deploy
```

For production changes:

- back up important data before a destructive or high-risk migration;
- deploy the migration from the same revision as the application code that
  expects it;
- prefer backwards-compatible, staged schema changes when old and new
  application instances can overlap during rollout;
- do not run `migrate reset` against shared, staging, or production databases.

## 4. Migration rules for this repository

- Keep one migration focused on one logical schema change.
- Use descriptive migration names such as `add_bounty_tags` or
  `index_notification_recipient`.
- Never rewrite, rename, delete, or reorder a migration that has already been
  applied to a shared environment.
- Review generated SQL rather than assuming a schema diff is non-destructive.
- Commit `prisma/schema.prisma` and the matching
  `prisma/migrations/<timestamp>_<name>/migration.sql` together.
- Prisma migrations are forward migrations. If a released change must be
  reversed, prefer a new corrective migration (and restore data from a backup
  when necessary) instead of editing historical SQL.

## 5. Troubleshooting

### Check what Prisma thinks is pending

Start with:

```bash
npx prisma migrate status
```

This compares the migrations in `prisma/migrations/` with the database's
`_prisma_migrations` table.

### PostgreSQL is not reachable

Check the container and connection string:

```bash
docker compose ps postgres
docker compose logs postgres
grep '^DATABASE_URL=' .env
```

With the repository defaults, PostgreSQL should be reachable on
`localhost:5432`.

### Development schema drift

If `migrate dev` reports drift, first determine whether your local database
contains disposable changes that are not represented by committed migrations.

For a **local disposable database only**, the simplest repair is:

```bash
npx prisma migrate reset
```

This drops/recreates the schema and reapplies migration history, so it destroys
local database data. Never use it on a shared or production database.

If the data matters, do not reset. Inspect the difference first. A useful
starting point is:

```bash
npx prisma migrate diff \
  --from-url "$DATABASE_URL" \
  --to-schema-datamodel prisma/schema.prisma \
  --script
```

Review the output and create an explicit forward migration or reconcile the
database deliberately.

### Migration conflict after switching or rebasing branches

Do not edit an already-applied migration just to make two branches line up.

1. Rebase/merge the latest target branch.
2. Keep all migration directories that have already shipped.
3. Recreate only an **unshared local migration** when necessary.
4. Run:

   ```bash
   npx prisma migrate status
   npx prisma migrate dev
   ```

5. Review the resulting SQL and rerun the test suite.

If two branches independently changed the same tables, the final migration may
need a manual SQL review even when Prisma generates it successfully.

### A production migration failed

Do not use `migrate reset` and do not delete the failed migration directory.

1. Inspect the failed migration and database state.
2. Fix the underlying cause or manually complete/undo the partial database
   operation as appropriate.
3. Reconcile Prisma's migration history with one of:

   ```bash
   npx prisma migrate resolve --applied <migration_name>
   # or, only when the database changes were actually rolled back:
   npx prisma migrate resolve --rolled-back <migration_name>
   ```

4. Run `npx prisma migrate status`.
5. Run `npx prisma migrate deploy` again when the history and actual database
   state agree.

`migrate resolve` changes migration bookkeeping; it is not a database rollback
command. Use it only after verifying the real schema/data state.

### A committed migration was edited after being applied

Restore the migration file to the exact committed/applied version. Add a new
migration for the correction. Editing historical migrations causes checksum and
history mismatches and makes environments diverge.

## 6. Before opening a pull request

For any database change, verify:

```bash
npx prisma format
npx prisma validate
npx prisma migrate status
npm run build
npm run lint
npm run format:check
npm test
```

Also inspect `git diff -- prisma/schema.prisma prisma/migrations` and confirm
that no unrelated schema or migration changes are included.
