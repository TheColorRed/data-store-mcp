---
name: data-store-sql
description: 'ALWAYS load this skill before any SQL operation — even if you already know SQL syntax. Skipping it is a leading cause of query failures from wrong column names, wrong quoting, and missing params. Use when working with relational SQL databases: MySQL, MariaDB, MSSQL, PostgreSQL, or SQLite. Applies to SELECT, INSERT, UPDATE, DELETE, DDL, and stored procedures. This skill mandates: (1) inspecting schema before querying when table/column details are not already confirmed, (2) parameterized queries with a params array — never interpolate values into SQL strings, (3) dialect-specific identifier quoting and syntax per provider, and (4) routing CRUD to dedicated tools and DDL/procedures to mutation. MariaDB uses the MySQL connector. Familiarity with SQL does not replace this skill — it enforces correctness and safety patterns that prevent the most common failures. Co-load with any domain skill — domain skills provide context; this skill governs SQL authoring and routing. They are complementary, not interchangeable.'
---

**ALWAYS** #tool:read/readFile [these additional instructions](../../instructions/agents.instructions.md) to understand the Data Store flow, tools need to be used in the correct order in order for the tools to work properly.

**ALWAYS** #tool:read/readFile [these additional instructions](references/tool/schema.instructions.md) before calling the `schema` tool to understand how to properly use the tool. Not understanding the schema tool can lead to a lot of unnecessary calls and token usage, so please read the instructions and use the tool wisely.

**ALWAYS** #tool:read/readFile [these select tool instructions](references/tool/select.instructions.md) before calling the `select` tool to understand how to properly use the tool.

**ALWAYS** #tool:read/readFile [these insert tool instructions](references/tool/insert.instructions.md) before calling the `insert` tool to understand how to properly use the tool.

**ALWAYS** #tool:read/readFile [these update tool instructions](references/tool/update.instructions.md) before calling the `update` tool to understand how to properly use the tool.

**ALWAYS** #tool:read/readFile [these delete tool instructions](references/tool/delete.instructions.md) before calling the `delete` tool to understand how to properly use the tool.

**ALWAYS** #tool:read/readFile [these mutation tool instructions](references/tool/mutation.instructions.md) before calling the `mutation` tool to understand how to properly use the tool.

**ALWAYS** #tool:read/readFile [MySQL/MariaDB Formatting Reference](references/formatting-mysql-mariadb.instructions.md) to understand the correct quoting and syntax for MySQL and MariaDB queries, including how to format identifiers, string literals, and parameter placeholders. This is crucial for avoiding syntax errors and ensuring queries execute correctly against MySQL/MariaDB databases.

**ALWAYS** #tool:read/readFile [MSSQL Formatting Reference](references/formatting-mssql.instructions.md) to understand the correct quoting and syntax for MSSQL queries, including how to format identifiers, string literals, and parameter placeholders. This is crucial for avoiding syntax errors and ensuring queries execute correctly against MSSQL databases.

**ALWAYS** #tool:read/readFile [PostgreSQL Formatting Reference](references/formatting-postgres.instructions.md) to understand the correct quoting and syntax for PostgreSQL queries, including how to format identifiers, string literals, and parameter placeholders. This is crucial for avoiding syntax errors and ensuring queries execute correctly against PostgreSQL databases.

**ALWAYS** #tool:read/readFile [SQLite Formatting Reference](references/formatting-sqlite.instructions.md) to understand the correct quoting and syntax for SQLite queries, including how to format identifiers, string literals, and parameter placeholders. This is crucial for avoiding syntax errors and ensuring queries execute correctly against SQLite databases.

# SQL

The SQL skill allows you to execute SQL queries against one or more databases and database tables from different providers, including `MySQL`, `MariaDB`, `MSSQL`, `PostgreSQL`, and `SQLite`. Use this skill to perform CRUD operations, manage database schemas, and execute complex queries across various database systems.

`MariaDB` is supported through the existing `MySQL` connector and driver support, so MariaDB connections should follow the MySQL-oriented guidance in this skill unless a MariaDB-specific limitation is documented elsewhere.

## When To Use

This skill applies whenever the user's goal involves working with data stored in a relational database. It covers both read and write operations, from a simple row lookup to a complex multi-table query or schema change. Use it for any task where SQL is the appropriate tool, regardless of the specific database engine involved.

- Use this skill when the user wants to query or modify data in a SQL database.
- Use this skill when the user needs database schema information such as tables, columns, or table definitions.
- Use this skill when the user needs SQL dialect-specific guidance for MySQL, MariaDB, MSSQL, PostgreSQL, or SQLite.
- Use the MySQL connector guidance for MariaDB unless the user explicitly needs behavior that differs from standard MySQL compatibility.

## Tool Usage

The SQL skill maps each operation type to a dedicated tool. Using the correct tool for each operation type ensures that the driver validates the query shape and returns the right result structure. The `mutation` tool is a catch-all for DDL and stored procedure calls that do not fit the standard CRUD pattern. **DO NOT** use `mutation` for basic SELECT, INSERT, UPDATE, or DELETE operations as this bypasses important validation and may lead to unexpected results.

Treat schema inspection as optional discovery, not a mandatory first step for every SQL request. If the relevant tables and columns are already known from the conversation or a previous tool result, execute the SQL request directly with the matching CRUD tool.

For a new SQL request, resolve the target database with #tool:data-store/connections unless the current request already includes the exact `connectionId`. Do not jump straight to SQL execution using a remembered connection from an earlier turn.

- #tool:data-store/select - Use this tool to execute `SELECT` queries and retrieve data from the database.
- #tool:data-store/insert - Use this tool to execute `INSERT` queries and add new records to the database.
- #tool:data-store/update - Use this tool to execute `UPDATE` queries and modify existing records in the database.
- #tool:data-store/delete - Use this tool to execute `DELETE` queries and remove records from the database.
- #tool:data-store/mutation - Use this tool to execute any type of SQL query, in addition to: `CREATE TABLE`, `ALTER TABLE`, `CALL my_procedure()`, etc. It should **NOT** be used in place of the other tool types for basic CRUD operations, but rather for more complex queries, database schema management, or executing stored procedures for things that do not fit into the basic CRUD mold.
- Use the #tool:data-store/schema to get detailed metadata about the database, tables, and columns only when that metadata is not already known or when an execution error suggests stale assumptions. If a `tableName` is provided, it will return metadata for that specific table. If no `tableName` is provided, it will return metadata for the entire database, including a list of all tables and their respective columns. Use `listTables: true` for a lightweight list of table names without column details.
- For follow-up read requests against the same database context, prefer #tool:data-store/select directly instead of repeating `schema`.

### Tool Routing Quick Reference

Resolve the correct tool BEFORE writing any SQL. Do not rely on memory — check this table every time.

| Statement type              | Tool           | Notes                                    |
| --------------------------- | -------------- | ---------------------------------------- |
| `SELECT ...`                | `select`       | Read-only queries only                   |
| `INSERT ...`                | `insert`       | Single-purpose insert                    |
| `UPDATE ...`                | `update`       | Single-purpose update                    |
| `DELETE ...`                | `delete`       | Single-purpose delete                    |
| `CALL my_proc()`            | **`mutation`** | ❌ NEVER use `select` — will always fail |
| `EXECUTE ...`               | **`mutation`** | ❌ NEVER use `select`                    |
| `CREATE / ALTER / DROP`     | **`mutation`** | DDL always goes to `mutation`            |
| `INSERT INTO ... SELECT`    | **`mutation`** | Combined read+write goes to `mutation`   |
| `SHOW / DESCRIBE / EXPLAIN` | `schema`       | Metadata — never use `mutation`          |

### Anti-Patterns

These are the most common routing mistakes. If you find yourself about to do any of these, stop and use the correct tool.

- ❌ `select` with `CALL my_proc()` — the `select` tool validates the SQL starts with `SELECT` and will reject it immediately. Use `mutation`.
- ❌ `mutation` with a plain `SELECT` — bypasses pagination and validation. Use `select`.
- ❌ `mutation` with `INSERT`, `UPDATE`, or `DELETE` — bypasses per-operation validation. Use the dedicated tool.
- ❌ Skipping schema discovery because you "remember" the column names — stale assumptions are the leading cause of `Unknown column` errors.
- ❌ Using `select` for any stored procedure call, even if the procedure internally runs a SELECT — the call statement itself determines the tool, not what the procedure does.

## Loop Prevention (Required)

- Discovery budget for a SQL read in one turn: `connections` max once (if needed), `schema` max once (if needed), `payload` max once (if needed), then execute `select`.
- Never call `payload` more than once with the same `connectionId` in a single turn unless an execution error explicitly indicates payload mismatch.
- If you used the wrong execution tool (for example `mutation` instead of `select`), do not re-run discovery. Switch directly to the correct execution tool.
- For SQL execution, default payload shape is `{"sql": "...", "params": [...]}`. Do not add unrelated keys unless required by that tool.
- Use error-driven fallback only:
  - Invalid or stale `connectionId` -> run `connections`.
  - Unknown table/column or schema mismatch -> run `schema`.
  - Payload validation mismatch -> run `payload`.
  - Otherwise, stop retrying discovery and explain the blocker.

## Request Shape Recovery (Required)

- Errors such as `must NOT have additional properties` or `must have required property` indicate malformed tool input, not stale database context.
- After those errors, do not restart discovery. Correct the request shape and retry the same tool once.
- Canonical SQL call shapes:
  - `connections` (filtered): `{"typeFilter":"mysql"}`
  - `payload`: `{"connectionId":"my-connection"}`
  - `schema` (single table): `{"connectionId":"my-connection","payload":{"tableName":"recipes"}}`
  - `select`: `{"connectionId":"my-connection","payload":{"sql":"SELECT COUNT(*) AS total FROM recipes WHERE credit_id IS NOT NULL AND TRIM(credit_id) <> ?","params":[""]}}`
- Do not put `tableName` at top-level when calling `schema`; use `payload.tableName`.
- Do not omit execution payload; provide `payload.sql` (and `payload.params` when needed).

## SQL Payload

Every SQL query is submitted as a JSON payload containing at minimum an `sql` field. When the query includes dynamic values, those values must be passed in a separate `params` field using the provider-specific placeholder syntax rather than interpolated directly into the SQL string. Failing to use parameterized queries exposes the system to SQL injection vulnerabilities and is never acceptable.

- [Payload](references/payload.instructions.md)

#### Functions/Procedures Unsupported

- Sqlite does not support stored procedures or user-defined functions, so the `listProcedures` and `listFunctions` fields will be ignored when using the schema tool with a SQLite connection. Attempting to use those fields with SQLite will not return an error but will simply have no effect on the output.
