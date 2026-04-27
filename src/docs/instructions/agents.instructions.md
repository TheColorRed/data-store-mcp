---
name: Agent Instructions
description: 'These instructions provide guidance on how to use the tools available in this extension when working with agents. It is important to follow these instructions to ensure that you are using the tools correctly and effectively when interacting with data sources through agents.'
---

# Agent Instructions

These instructions are meant to provide guidance on how to use the tools available in this extension when working with agents. It is important to follow these instructions to ensure that you are using the tools correctly and effectively when interacting with data sources through agents.

## Tool Workflow and Execution Constraints

Follow these phased rules to prevent redundant searches and redundant discovery calls. Use a cache-first approach.

**Phase 1: Discovery**

- #tool:data-store/connections - Run when `connectionId` is unknown or stale. At the start of a new user request, do not assume a remembered `connectionId` unless the current request explicitly establishes it. Prefer one call per target context.
  - If you know the connection type, such as mysql, postgres, etc., use the `typeFilter` parameter to limit results to relevant connections.
- #tool:data-store/schema - Run only when schema context is unknown or stale. Never call more than once with the same `connectionId` and target structure in a single turn. Do not use repeated `schema` calls as a substitute for reasoning or query drafting.
- #tool:data-store/payload - Run only when payload context is unknown or stale. Prefer one call per provider and operation pattern.

**Phase 2: Execution**

- Discovery is a setup step, not the goal. After acquiring enough context, immediately use an execution tool (#tool:data-store/select, #tool:data-store/insert, #tool:data-store/update, #tool:data-store/delete, or #tool:data-store/mutation) to satisfy the request.
- If relevant tables, columns, or fields are already known from the conversation, go straight to execution (e.g., #tool:data-store/select). Treat schema context as valid without re-fetching.
- Do not use #tool:data-store/mutation for metadata inspection (such as `SHOW TABLES`, `EXPLAIN`, etc.) when `connections` or `schema` can answer the question.
- If a discovery tool fails to reveal new information, do not retry the same call unchanged. Execute with current context or explain the blocker.

**Phase 3: Follow-Up & Correction**

- For follow-up requests in the same `connectionId`/provider context, go directly to the execution tool and skip discovery tools unless an error indicates stale context.
- **Tool Switching Constraint:** If you realize you used the wrong execution tool (e.g., you ran `mutation` instead of `select` and want to switch), **do not restart the discovery loop** (`connections` -> `schema` -> `payload`). Your existing connection and schema context is still valid. Simply call the correct execution tool immediately.

## Follow-Up Query Rule

- For a follow-up read in the same database or provider context, prefer exactly one execution call using #tool:data-store/select
- Only fall back to `schema` or `payload` again when the execution tool reports an actual mismatch or missing-field error.

## Loop Prevention Rules

- Never call the same discovery tool (`connections`, `schema`, or `payload`) more than once with identical inputs in the same turn.
- After any successful discovery call, the next call should be an execution tool unless there is a concrete stale-context signal.
- If you used the wrong execution tool, switch directly to the correct execution tool using the same known `connectionId` and context.
- If you already have a successful `payload` result for a given `connectionId`, treat payload shape as known for the rest of the turn.
- If execution fails and the error does not indicate stale connection/schema/payload assumptions, do not restart discovery; explain the blocker or ask a clarifying question.

## Validation Error Recovery (Required)

- Treat these as request-shape errors, not stale context: `must NOT have additional properties`, `must have required property`, `invalid type`.
- After a request-shape error, do not run `connections`, `schema`, or `payload` again if they already succeeded in the same turn.
- Correct the arguments and retry the same target tool once.
- If the second attempt fails with the same validation category, stop retrying and ask the user a clarifying question.
- Canonical shapes to avoid formatting mistakes:
  - `schema` with one table: `{"connectionId":"...","payload":{"tableName":"recipes"}}`
  - `select` read query: `{"connectionId":"...","payload":{"sql":"SELECT ...","params":[...]}}`

## Stale Context Definition

Treat context as stale when any of the following happens:

- Connection target changed or current connectionId is invalid.
- Provider changed (for example SQL to REST, or PostgreSQL to MSSQL).
- Schema/shape mismatch is reported by a tool.
- Payload validation indicates required fields or shape assumptions are no longer valid.

## Payload Information

The payload for making requests to the data source is a crucial part of the interaction process. It should be structured according to the requirements of the specific data source you are working with. The payload typically includes information such as the connection ID, the specific operation you want to perform, and any relevant parameters or data needed for that operation. It is important to refer to the documentation for the specific data source and the **SKILL** documentation (if available) for detailed information on how to structure the payload correctly for successful interactions with the data source.

## Ask Questions

If the user request is ambiguous or you are not sure what the user is asking, get feedback from the user using the #tool:vscode/askQuestions tool instead of making assumptions.

## Supported connection types

- Database connections:
  - `mysql` - MySQL databases
  - `mariadb` - MariaDB databases (uses MySQL connector guidance)
  - `sqlite` - SQLite databases
  - `postgres` - PostgreSQL databases
  - `mssql` - Microsoft SQL Server databases
- Document store connections:
  - `mongodb` - MongoDB databases
- Key-value store connections:
  - `redis` - Redis databases
- API connections:
  - `rest` - REST HTTP APIs
  - `graphql` - GraphQL APIs
- File storage connections:
  - `ftp` - FTP file servers
  - `s3` - Amazon S3 object storage
  - `azure-blob` - Azure Blob object storage
