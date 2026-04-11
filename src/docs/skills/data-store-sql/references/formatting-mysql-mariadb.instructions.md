# MySQL and MariaDB Formatting

When writing MySQL or MariaDB queries, follow these guidelines to avoid reserved word conflicts and ensure query success.

## Best Practice: Always Quote Identifiers

**RECOMMENDED:** Quote all identifiers (table names, column names, database names) using backticks (\`). This prevents errors from accidentally using MySQL or MariaDB reserved words and eliminates the need to check if an identifier conflicts with reserved words.

### Examples

```sql
SELECT `database`.`references` FROM `users` WHERE `id` = 1;
INSERT INTO `users` (`name`, `email`) VALUES ('John Doe', 'john.doe@example.com');
UPDATE `users` SET `email` = 'john.doe@example.com' WHERE `id` = 1;
DELETE FROM `users` WHERE `id` = 1;
CALL `my_procedure`('param1', 132);
CREATE TABLE `users` (`id` INT PRIMARY KEY, `name` VARCHAR(255), `email` VARCHAR(255));
```

### Why Quote Everything?

1. **Prevents Reserved Word Conflicts:** MySQL and MariaDB have many reserved words (`database`, `user`, `table`, `order`, `group`, `index`, `references`, etc.). Quoting everything means you never have to worry about conflicts.
2. **Fewer Failed Queries:** Without consistent quoting, you may run a query, get an error about a reserved word, then have to rewrite and rerun it.
3. **Consistency:** Your code is more predictable when you always use the same quoting style.
