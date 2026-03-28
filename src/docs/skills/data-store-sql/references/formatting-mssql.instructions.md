# MS SQL Formatting

When writing MS SQL queries, you should always do the following for getting a better SQL success rate.

## Reserved Words

MS SQL has words that are reserved and cannot be used as identifiers (like table names, column names, etc.) unless they are quoted using square brackets ([]). To avoid any issues with reserved words, use square brackets to quote identifiers in your MS SQL queries.

### MS SQL Example

```sql
SELECT [references] FROM [users] WHERE [id] = 1;
INSERT INTO [users] ([name], [email]) VALUES ('John Doe', 'john.doe@example.com');
UPDATE [users] SET [email] = 'john.doe@example.com' WHERE [id] = 1;
DELETE FROM [users] WHERE [id] = 1;
EXEC [my_procedure] 'param1', 132;
```
