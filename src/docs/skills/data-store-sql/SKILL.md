---
name: data-store-sql
description: 'Use when working with SQL databases such as MySQL, MariaDB, MSSQL, PostgreSQL, or SQLite for CRUD queries, schema inspection, database changes, or other SQL operations.'
---

# SQL

The SQL skill allows you to execute SQL queries against one or more databases and database tables from different providers, including `MySQL`, `MariaDB`, `MSSQL`, `PostgreSQL`, and `SQLite`. Use this skill to perform CRUD operations, manage database schemas, and execute complex queries across various database systems.

`MariaDB` is supported through the existing `MySQL` connector and driver support, so MariaDB connections should follow the MySQL-oriented guidance in this skill unless a MariaDB-specific limitation is documented elsewhere.

**ALWAYS** #tool:read/readFile [these additional instructions](../../agents.instructions.md) to understand the Data Store flow, tools need to be used in the correct order in order for the tools to work properly.

## When To Use

This skill applies whenever the user's goal involves working with data stored in a relational database. It covers both read and write operations, from a simple row lookup to a complex multi-table query or schema change. Use it for any task where SQL is the appropriate tool, regardless of the specific database engine involved.

- Use this skill when the user wants to query or modify data in a SQL database.
- Use this skill when the user needs database schema information such as tables, columns, or table definitions.
- Use this skill when the user needs SQL dialect-specific guidance for MySQL, MariaDB, MSSQL, PostgreSQL, or SQLite.
- Use the MySQL connector guidance for MariaDB unless the user explicitly needs behavior that differs from standard MySQL compatibility.

## Tool Usage

The SQL skill maps each operation type to a dedicated tool. Using the correct tool for each operation type ensures that the driver validates the query shape and returns the right result structure. The `mutation` tool is a catch-all for DDL and stored procedure calls that do not fit the standard CRUD pattern.

Treat schema inspection as optional discovery, not a mandatory first step for every SQL request. If the relevant tables and columns are already known from the conversation or a previous tool result, execute the SQL request directly with the matching CRUD tool.

For a new SQL request, resolve the target database with #tool:data-store/connections unless the current request already includes the exact `connectionId`. Do not jump straight to SQL execution using a remembered connection from an earlier turn.

- #tool:data-store/select - Use this tool to execute `SELECT` queries and retrieve data from the database.
- #tool:data-store/insert - Use this tool to execute `INSERT` queries and add new records to the database.
- #tool:data-store/update - Use this tool to execute `UPDATE` queries and modify existing records in the database.
- #tool:data-store/delete - Use this tool to execute `DELETE` queries and remove records from the database.
- #tool:data-store/mutation - Use this tool to execute any type of SQL query, in addition to: `CREATE TABLE`, `ALTER TABLE`, `CALL my_procedure()`, etc. It should **NOT** be used in place of the other tool types for basic CRUD operations, but rather for more complex queries, database schema management, or executing stored procedures for things that do not fit into the basic CRUD mold.
- Use the #tool:data-store/schema to get detailed metadata about the database, tables, and columns only when that metadata is not already known or when an execution error suggests stale assumptions. If a `tableName` is provided, it will return metadata for that specific table. If no `tableName` is provided, it will return metadata for the entire database, including a list of all tables and their respective columns.
- For follow-up read requests against the same database context, prefer #tool:data-store/select directly instead of repeating `schema`.
- Do not use #tool:data-store/mutation for metadata lookups such as `SHOW TABLES`, `SHOW CREATE TABLE`, `DESCRIBE`, `EXPLAIN`, `PRAGMA`, or metadata-catalog exploration when the `schema` tool can provide that information.

## SQL Payload

Every SQL query is submitted as a JSON payload containing at minimum an `sql` field. When the query includes dynamic values, those values must be passed in a separate `params` field using the provider-specific placeholder syntax rather than interpolated directly into the SQL string. Failing to use parameterized queries exposes the system to SQL injection vulnerabilities and is never acceptable.

- [Payload](references/payload.instructions.md)

## SQL Payload Assets

Provider-specific payload templates are provided as ready-to-use JSON files for each supported SQL operation. Each file demonstrates the correct placeholder syntax, identifier quoting style, and minimal required fields for that provider. You **MUST** use the #tool:read/readFile on the linked path to view these examples before generating a payload to ensure the query matches the target database dialect.

If execution fails due to syntax, missing tables, or constraints, immediately read `error-recovery.instructions.md` before attempting a fix.

### MySQL and MariaDB

MySQL and MariaDB use backtick-quoted identifiers and `?` positional placeholders. These assets demonstrate standard CRUD patterns and an `ALTER TABLE` mutation example following those conventions.

- [MySQL/MariaDB SELECT payload](assets/mysql-mariadb/select.json)
- [MySQL/MariaDB INSERT payload](assets/mysql-mariadb/insert.json)
- [MySQL/MariaDB UPDATE payload](assets/mysql-mariadb/update.json)
- [MySQL/MariaDB DELETE payload](assets/mysql-mariadb/delete.json)
- [MySQL/MariaDB mutation payload](assets/mysql-mariadb/mutation.json)

### MS SQL

MS SQL uses square-bracket-quoted identifiers and named `@p1`, `@p2` placeholders when binding an array of params. These assets demonstrate the same CRUD and mutation patterns using the correct MS SQL conventions.

- [MS SQL SELECT payload](assets/mssql/select.json)
- [MS SQL INSERT payload](assets/mssql/insert.json)
- [MS SQL UPDATE payload](assets/mssql/update.json)
- [MS SQL DELETE payload](assets/mssql/delete.json)
- [MS SQL mutation payload](assets/mssql/mutation.json)

### PostgreSQL

PostgreSQL uses double-quoted identifiers and `$1`, `$2` positional placeholders. These assets follow PostgreSQL conventions including `SERIAL` for auto-increment columns and `NOW()` for timestamps.

- [PostgreSQL SELECT payload](assets/postgres/select.json)
- [PostgreSQL INSERT payload](assets/postgres/insert.json)
- [PostgreSQL UPDATE payload](assets/postgres/update.json)
- [PostgreSQL DELETE payload](assets/postgres/delete.json)
- [PostgreSQL mutation payload](assets/postgres/mutation.json)

### SQLite

SQLite uses double-quoted identifiers and `?` positional placeholders. It does not support `DATETIME` columns natively; use `TEXT` for date and time values and `CURRENT_TIMESTAMP` for defaults. The mutation example demonstrates an `ADD COLUMN` migration which is the only `ALTER TABLE` variant SQLite supports.

- [SQLite SELECT payload](assets/sqlite/select.json)
- [SQLite INSERT payload](assets/sqlite/insert.json)
- [SQLite UPDATE payload](assets/sqlite/update.json)
- [SQLite DELETE payload](assets/sqlite/delete.json)
- [SQLite mutation payload](assets/sqlite/mutation.json)

## SQL Query Formatting

Each SQL provider uses a different syntax for quoting identifiers, handling reserved words, and expressing common operations like stored procedure calls or auto-increment columns. Reading the provider-specific formatting reference before writing a query reduces errors and avoids repeated failures from reserved word conflicts. These references are the authoritative source for formatting conventions within this skill.

- [MySQL/MariaDB Formatting](references/formatting-mysql-mariadb.instructions.md)
- [MSSQL Formatting](references/formatting-mssql.instructions.md)
- [PostgreSQL Formatting](references/formatting-postgres.instructions.md)
- [SQLite Formatting](references/formatting-sqlite.instructions.md)
