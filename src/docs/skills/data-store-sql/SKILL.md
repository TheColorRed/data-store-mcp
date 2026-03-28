---
name: data-store-sql
description: 'Execute SQL queries against one or more databases and database tables from different providers: MySQL, MSSQL, PostgreSQL, and SQLite. Use this skill to perform CRUD operations, manage database schemas, and execute complex queries across various database systems.'
---

# SQL

The SQL skill allows you to execute SQL queries against one or more databases and database tables from different providers, including `MySQL`, `MSSQL`, `PostgreSQL`, and `SQLite`. Use this skill to perform CRUD operations, manage database schemas, and execute complex queries across various database systems.

**ALWAYS** #tool:read/readFile [these additional instructions](../../agents.instructions.md) to understand the Data Store flow, tools need to be used in the correct order in order for the tools to work properly.

## Tool Usage

There are multiple tools available for executing SQL queries, including:

- #tool:data-store/select - Use this tool to execute `SELECT` queries and retrieve data from the database.
- #tool:data-store/insert - Use this tool to execute `INSERT` queries and add new records to the database.
- #tool:data-store/update - Use this tool to execute `UPDATE` queries and modify existing records in the database.
- #tool:data-store/delete - Use this tool to execute `DELETE` queries and remove records from the database.
- #tool:data-store/mutation - Use this tool to execute any type of SQL query, in addition to: `CREATE TABLE`, `ALTER TABLE`, `CALL my_procedure()`, etc.

- Use the #tool:data-store/schema to get detailed metadata about the database, tables, and columns. If a a "tableName" is provided, it will return metadata for that specific table. If no "tableName" is provided, it will return metadata for the entire database, including a list of all tables and their respective columns.

## Payload

- [Payload](references/payload.instructions.md)

## Query Formatting

Each database type has its own specific formatting requirements for SQL queries. Refer to the proper formatting instructions for the specific database you are working with to ensure that your SQL queries are properly formatted for that database system.

- [MySQL Formatting](references/formatting-mysql.instructions.md)
- [MSSQL Formatting](references/formatting-mssql.instructions.md)
- [PostgreSQL Formatting](references/formatting-postgres.instructions.md)
- [SQLite Formatting](references/formatting-sqlite.instructions.md)
