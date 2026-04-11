# MS SQL Formatting

When writing MS SQL queries, follow these guidelines to avoid reserved word conflicts and ensure query success.

## Best Practice: Always Quote Identifiers

**RECOMMENDED:** Quote all identifiers (table names, column names, schema names) using square brackets ([]). This prevents errors from accidentally using MS SQL reserved words and eliminates the need to check if an identifier conflicts with reserved words.

### Examples

```sql
SELECT [references] FROM [users] WHERE [id] = 1;
INSERT INTO [users] ([name], [email]) VALUES ('John Doe', 'john.doe@example.com');
UPDATE [users] SET [email] = 'john.doe@example.com' WHERE [id] = 1;
DELETE FROM [users] WHERE [id] = 1;
EXEC [my_procedure] 'param1', 132;
CREATE TABLE [users] ([id] INT PRIMARY KEY, [name] NVARCHAR(255), [email] NVARCHAR(255));
```

### Why Quote Everything?

1. **Prevents Reserved Word Conflicts:** MS SQL has many reserved words (`user`, `table`, `order`, `database`, `references`, `check`, etc.). Quoting everything means you never have to worry about conflicts.
2. **Fewer Failed Queries:** Without consistent quoting, you may run a query, get an error about a reserved word, then have to rewrite and rerun it.
3. **Consistency:** Your code is more predictable when you always use the same quoting style.
