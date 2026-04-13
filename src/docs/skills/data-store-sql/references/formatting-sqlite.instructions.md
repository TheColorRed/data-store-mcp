# SQLite Formatting

When writing SQLite queries, follow these guidelines to avoid reserved word conflicts and ensure query success. SQLite uses double quotes as the identifier quoting delimiter and `?` as the positional parameter placeholder. SQLite has a flexible type system — columns do not enforce strict types — but using explicit type affinities like `INTEGER`, `TEXT`, `REAL`, and `BLOB` leads to more predictable behavior.

## Best Practice: Always Quote Identifiers

Double-quote quoting in SQLite follows the SQL standard and prevents reserved word conflicts in the same way as PostgreSQL. SQLite's permissive parser sometimes accepts unquoted reserved words, but this behavior is not reliable across all SQLite versions and should not be relied upon. Consistent quoting keeps queries portable and failure-free.

**RECOMMENDED:** Quote all identifiers (table names, column names) using double quotes ("). This prevents errors from accidentally using SQLite reserved words and eliminates the need to check if an identifier conflicts with reserved words.

### ✅ Recommended (Always Quote)

The following examples show correct double-quote quoting for SQLite. Note that SQLite uses `INTEGER PRIMARY KEY` for auto-incrementing rows and `TEXT` for string columns rather than `VARCHAR`.

```sql
SELECT "id", "name", "email" FROM "users" WHERE "id" = 1;
INSERT INTO "users" ("first", "last", "email") VALUES ('John', 'Doe', 'john.doe@example.com');
UPDATE "users" SET "email" = 'john.doe@example.com' WHERE "id" = 1;
DELETE FROM "users" WHERE "id" = 1;
CREATE TABLE "users" ("id" INTEGER PRIMARY KEY, "name" TEXT, "email" TEXT);
```

### Why Quote Everything?

SQLite's permissive type system and parser can mask quoting problems until they surface unexpectedly. The safest approach is to always use double quotes so the parser never has to guess whether a token is an identifier or a keyword.

1. **Prevents Reserved Word Conflicts:** SQLite has many reserved words (`user`, `table`, `order`, `group`, `index`, `where`, `references`, etc.). Quoting everything means you never have to worry about conflicts.
2. **Fewer Failed Queries:** Without consistent quoting, you may run a query, get an error about a reserved word, then have to rewrite and rerun it.
3. **Consistency:** Your code is more predictable when you always use the same quoting style.

### ⚠️ Unquoted Identifiers (Not Recommended)

SQLite sometimes silently accepts unquoted reserved words as identifiers, which can make problems hard to reproduce. Relying on this behavior is fragile — a future SQLite version or a stricter SQL parser may reject the same query outright.

```sql
-- This works... until you use a reserved word
SELECT id, name, email FROM users WHERE id = 1;
-- But this will fail:
SELECT order, user FROM table WHERE group = 1;  -- All reserved words!
```
