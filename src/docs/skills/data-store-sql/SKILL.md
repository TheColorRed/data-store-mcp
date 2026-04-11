---
name: data-store-sql
description: 'Use when working with SQL databases such as MySQL, MariaDB, MSSQL, PostgreSQL, or SQLite for CRUD queries, schema inspection, database changes, or other SQL operations.'
---

# SQL

The SQL skill allows you to execute SQL queries against one or more databases and database tables from different providers, including `MySQL`, `MariaDB`, `MSSQL`, `PostgreSQL`, and `SQLite`. Use this skill to perform CRUD operations, manage database schemas, and execute complex queries across various database systems.

`MariaDB` is supported through the existing `MySQL` connector and driver support, so MariaDB connections should follow the MySQL-oriented guidance in this skill unless a MariaDB-specific limitation is documented elsewhere.

**ALWAYS** #tool:read/readFile [these additional instructions](../../agents.instructions.md) to understand the Data Store flow, tools need to be used in the correct order in order for the tools to work properly.

## When To Use

- Use this skill when the user wants to query or modify data in a SQL database.
- Use this skill when the user needs database schema information such as tables, columns, or table definitions.
- Use this skill when the user needs SQL dialect-specific guidance for MySQL, MariaDB, MSSQL, PostgreSQL, or SQLite.
- Use the MySQL connector guidance for MariaDB unless the user explicitly needs behavior that differs from standard MySQL compatibility.

## Tool Usage

There are multiple tools available for executing SQL queries, including:

- #tool:data-store/select - Use this tool to execute `SELECT` queries and retrieve data from the database.
- #tool:data-store/insert - Use this tool to execute `INSERT` queries and add new records to the database.
- #tool:data-store/update - Use this tool to execute `UPDATE` queries and modify existing records in the database.
- #tool:data-store/delete - Use this tool to execute `DELETE` queries and remove records from the database.
- #tool:data-store/mutation - Use this tool to execute any type of SQL query, in addition to: `CREATE TABLE`, `ALTER TABLE`, `CALL my_procedure()`, etc. It should **NOT** be used in place of the other tool types for basic CRUD operations, but rather for more complex queries, database schema management, or executing stored procedures for things that do not fit into the basic CRUD mold.
- Use the #tool:data-store/schema to get detailed metadata about the database, tables, and columns. If a `tableName` is provided, it will return metadata for that specific table. If no `tableName` is provided, it will return metadata for the entire database, including a list of all tables and their respective columns.

## SQL Payload

**ALWAYS** read this payload instructions document at least once before using the SQL skill to understand how to properly format the payload for making SQL queries, including the importance of using prepared statements with parameters to prevent SQL injection vulnerabilities.

- [Payload](references/payload.instructions.md)

## SQL Query Formatting

**ALWAYS** read the formatting instructions for the specific database you are working with to understand how to properly format your SQL queries, including identifier quoting, reserved word handling, and best practices for that database system.

- [MySQL/MariaDB Formatting](references/formatting-mysql-mariadb.instructions.md)
- [MSSQL Formatting](references/formatting-mssql.instructions.md)
- [PostgreSQL Formatting](references/formatting-postgres.instructions.md)
- [SQLite Formatting](references/formatting-sqlite.instructions.md)
