# SQLite Formatting

When writing SQLite queries, follow these guidelines to avoid reserved word conflicts and ensure query success.

## Best Practice: Always Quote Identifiers

**RECOMMENDED:** Quote all identifiers (table names, column names) using double quotes ("). This prevents errors from accidentally using SQLite reserved words and eliminates the need to check if an identifier conflicts with reserved words.

### ✅ Recommended (Always Quote)

```sql
SELECT "id", "name", "email" FROM "users" WHERE "id" = 1;
INSERT INTO "users" ("first", "last", "email") VALUES ('John', 'Doe', 'john.doe@example.com');
UPDATE "users" SET "email" = 'john.doe@example.com' WHERE "id" = 1;
DELETE FROM "users" WHERE "id" = 1;
CREATE TABLE "users" ("id" INTEGER PRIMARY KEY, "name" TEXT, "email" TEXT);
```

### Why Quote Everything?

1. **Prevents Reserved Word Conflicts:** SQLite has many reserved words (`user`, `table`, `order`, `group`, `index`, `where`, `references`, etc.). Quoting everything means you never have to worry about conflicts.
2. **Fewer Failed Queries:** Without consistent quoting, you may run a query, get an error about a reserved word, then have to rewrite and rerun it.
3. **Consistency:** Your code is more predictable when you always use the same quoting style.

### ⚠️ Unquoted Identifiers (Not Recommended)

While unquoted identifiers work when they're not reserved words, it's risky:

```sql
-- This works... until you use a reserved word
SELECT id, name, email FROM users WHERE id = 1;
-- But this will fail:
SELECT order, user FROM table WHERE group = 1;  -- All reserved words!
```
