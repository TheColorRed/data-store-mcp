# PostgreSQL Formatting

When writing SQL queries, you should always do the following for getting a better SQL success rate.

## Reserved Words

PostgreSQL has words that are reserved and cannot be used as identifiers (like table names, column names, etc.) unless they are quoted using double quotes ("). To avoid any issues with reserved words, use double quotes to quote identifiers in your PostgreSQL queries.

### PostgreSQL Example

```sql
SELECT "references" FROM "users" WHERE "id" = 1;
INSERT INTO "users" ("name", "email") VALUES ('John Doe', 'john.doe@example.com');
UPDATE "users" SET "email" = 'john.doe@example.com' WHERE "id" = 1;
DELETE FROM "users" WHERE "id" = 1;
CALL "my_procedure"('param1', 132);
```
