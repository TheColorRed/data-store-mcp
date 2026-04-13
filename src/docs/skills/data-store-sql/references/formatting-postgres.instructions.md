# PostgreSQL Formatting

When writing PostgreSQL queries, follow these guidelines to avoid reserved word conflicts and ensure query success. PostgreSQL uses double quotes as the identifier quoting delimiter and `$1`, `$2` as positional parameter placeholders. PostgreSQL also has a unique case-sensitivity rule: unquoted identifiers are automatically folded to lowercase, while quoted identifiers preserve their exact case.

## Best Practice: Always Quote Identifiers

Double-quote quoting in PostgreSQL prevents reserved word conflicts and resolves the case-folding behavior that can cause subtle bugs. If a table was created with a mixed-case name like `UserProfiles`, it must always be referenced as `"UserProfiles"` — without quotes PostgreSQL silently lowercases it to `userprofiles` and the query fails. Consistent quoting avoids both classes of problem.

**RECOMMENDED:** Quote all identifiers (table names, column names, schema names) using double quotes ("). This prevents errors from accidentally using PostgreSQL reserved words and eliminates the need to check if an identifier conflicts with reserved words.

### Examples

The following examples show correct double-quote quoting for all common statement types. PostgreSQL uses `SERIAL` (or `BIGSERIAL`) for auto-incrementing primary keys and `CALL` for stored procedure invocation.

```sql
SELECT "references" FROM "users" WHERE "id" = 1;
INSERT INTO "users" ("name", "email") VALUES ('John Doe', 'john.doe@example.com');
UPDATE "users" SET "email" = 'john.doe@example.com' WHERE "id" = 1;
DELETE FROM "users" WHERE "id" = 1;
CALL "my_procedure"('param1', 132);
CREATE TABLE "users" ("id" SERIAL PRIMARY KEY, "name" VARCHAR(255), "email" VARCHAR(255));
```

### Why Quote Everything?

Consistent quoting in PostgreSQL protects against two distinct failure modes: reserved word collisions and case-folding mismatches. Both are hard to diagnose and easy to prevent with a single convention.

1. **Prevents Reserved Word Conflicts:** PostgreSQL has many reserved words (`user`, `table`, `order`, `group`, `references`, `check`, etc.). Quoting everything means you never have to worry about conflicts.
2. **Fewer Failed Queries:** Without consistent quoting, you may run a query, get an error about a reserved word, then have to rewrite and rerun it.
3. **Consistency:** Your code is more predictable when you always use the same quoting style.
4. **Case Sensitivity:** PostgreSQL is case-insensitive for unquoted identifiers but case-sensitive for quoted ones. Consistent quoting helps manage this.
