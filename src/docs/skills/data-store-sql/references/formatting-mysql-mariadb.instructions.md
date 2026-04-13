# MySQL and MariaDB Formatting

When writing MySQL or MariaDB queries, follow these guidelines to avoid reserved word conflicts and ensure query success. MySQL uses the backtick character as the identifier quoting delimiter, which is distinct from the double-quote style used by PostgreSQL and SQLite. MariaDB follows the same rules as MySQL for all formatting covered in this document.

## Best Practice: Always Quote Identifiers

Quoting every identifier with backticks is the single most reliable way to avoid reserved word errors in MySQL and MariaDB queries. MySQL has a large and growing list of reserved words, and checking each identifier against that list manually is error-prone. Consistent backtick quoting removes the risk entirely and makes queries easier to maintain.

**RECOMMENDED:** Quote all identifiers (table names, column names, database names) using backticks (\`). This prevents errors from accidentally using MySQL or MariaDB reserved words and eliminates the need to check if an identifier conflicts with reserved words.

### Examples

The following examples illustrate correct backtick quoting across all common SQL statement types. Notice that database-qualified names use the `database`.`table` notation with backticks around both parts.

```sql
SELECT `database`.`references` FROM `users` WHERE `id` = 1;
INSERT INTO `users` (`name`, `email`) VALUES ('John Doe', 'john.doe@example.com');
UPDATE `users` SET `email` = 'john.doe@example.com' WHERE `id` = 1;
DELETE FROM `users` WHERE `id` = 1;
CALL `my_procedure`('param1', 132);
CREATE TABLE `users` (`id` INT PRIMARY KEY, `name` VARCHAR(255), `email` VARCHAR(255));
```

### Why Quote Everything?

Consistent identifier quoting solves multiple problems at once without adding meaningful complexity to a query. The argument against selective quoting is that reserved word lists change across MySQL versions, so a query that works today may fail after an upgrade.

1. **Prevents Reserved Word Conflicts:** MySQL and MariaDB have many reserved words (`database`, `user`, `table`, `order`, `group`, `index`, `references`, etc.). Quoting everything means you never have to worry about conflicts.
2. **Fewer Failed Queries:** Without consistent quoting, you may run a query, get an error about a reserved word, then have to rewrite and rerun it.
3. **Consistency:** Your code is more predictable when you always use the same quoting style.
