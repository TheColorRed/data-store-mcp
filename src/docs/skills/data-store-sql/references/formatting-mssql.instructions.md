# MS SQL Formatting

When writing MS SQL (Microsoft SQL Server) queries, follow these guidelines to avoid reserved word conflicts and ensure query success. MS SQL uses square brackets as the identifier quoting delimiter, unlike backticks (MySQL) or double quotes (PostgreSQL/SQLite). MS SQL also uses `NVARCHAR` for Unicode string columns and `SYSDATETIME()` rather than `NOW()` for current timestamps.

## Best Practice: Always Quote Identifiers

Square-bracket quoting in MS SQL serves the same purpose as backtick quoting in MySQL: it tells the parser that a token is an identifier rather than a keyword, regardless of the word used. This is especially important in MS SQL because it shares many reserved words with other SQL dialects and adds its own (`CHECK`, `IDENTITY`, `CLUSTERED`, etc.).

**RECOMMENDED:** Quote all identifiers (table names, column names, schema names) using square brackets ([]). This prevents errors from accidentally using MS SQL reserved words and eliminates the need to check if an identifier conflicts with reserved words.

### Examples

The following examples show correct square-bracket quoting for common statement types. Stored procedures in MS SQL are invoked with `EXEC` rather than `CALL`.

```sql
SELECT [references] FROM [users] WHERE [id] = 1;
INSERT INTO [users] ([name], [email]) VALUES ('John Doe', 'john.doe@example.com');
UPDATE [users] SET [email] = 'john.doe@example.com' WHERE [id] = 1;
DELETE FROM [users] WHERE [id] = 1;
EXEC [my_procedure] 'param1', 132;
CREATE TABLE [users] ([id] INT PRIMARY KEY, [name] NVARCHAR(255), [email] NVARCHAR(255));
```

### Why Quote Everything?

Selective quoting requires the developer to know the full list of MS SQL reserved words, which is long and version-dependent. Always quoting with square brackets eliminates that burden entirely and makes scripts portable across SQL Server versions.

1. **Prevents Reserved Word Conflicts:** MS SQL has many reserved words (`user`, `table`, `order`, `database`, `references`, `check`, etc.). Quoting everything means you never have to worry about conflicts.
2. **Fewer Failed Queries:** Without consistent quoting, you may run a query, get an error about a reserved word, then have to rewrite and rerun it.
3. **Consistency:** Your code is more predictable when you always use the same quoting style.
