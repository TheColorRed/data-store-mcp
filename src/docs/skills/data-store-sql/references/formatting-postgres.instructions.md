# PostgreSQL Formatting

When writing PostgreSQL queries, follow these guidelines to avoid reserved word conflicts and ensure query success.

## Best Practice: Always Quote Identifiers

**RECOMMENDED:** Quote all identifiers (table names, column names, schema names) using double quotes ("). This prevents errors from accidentally using PostgreSQL reserved words and eliminates the need to check if an identifier conflicts with reserved words.

### Examples

```sql
SELECT "references" FROM "users" WHERE "id" = 1;
INSERT INTO "users" ("name", "email") VALUES ('John Doe', 'john.doe@example.com');
UPDATE "users" SET "email" = 'john.doe@example.com' WHERE "id" = 1;
DELETE FROM "users" WHERE "id" = 1;
CALL "my_procedure"('param1', 132);
CREATE TABLE "users" ("id" SERIAL PRIMARY KEY, "name" VARCHAR(255), "email" VARCHAR(255));
```

### Why Quote Everything?

1. **Prevents Reserved Word Conflicts:** PostgreSQL has many reserved words (`user`, `table`, `order`, `group`, `references`, `check`, etc.). Quoting everything means you never have to worry about conflicts.
2. **Fewer Failed Queries:** Without consistent quoting, you may run a query, get an error about a reserved word, then have to rewrite and rerun it.
3. **Consistency:** Your code is more predictable when you always use the same quoting style.
4. **Case Sensitivity:** PostgreSQL is case-insensitive for unquoted identifiers but case-sensitive for quoted ones. Consistent quoting helps manage this.
