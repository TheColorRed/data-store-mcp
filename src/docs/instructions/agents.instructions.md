---
name: Agent Instructions
description: 'These instructions provide guidance on how to use the tools available in this extension when working with agents. It is important to follow these instructions to ensure that you are using the tools correctly and effectively when interacting with data sources through agents.'
---

# Agent Instructions

These instructions are meant to provide guidance on how to use the tools available in this extension when working with agents. It is important to follow these instructions to ensure that you are using the tools correctly and effectively when interacting with data sources through agents.

## Order of Tool Usage

When using the tools available in this extension, it is important to use them in the correct order to ensure that you have the necessary information and context for proceeding to the next step. Use a cache-first approach: run discovery tools only when connection, payload, or schema context is unknown or stale; otherwise reuse existing context.

1. #tool:data-store/connections - Run only when connectionId is unknown or stale.
2. #tool:data-store/schema - Run only when schema context is unknown or stale.
3. #tool:data-store/payload - Run only when payload context is unknown or stale.
4. #tool:data-store/select #tool:data-store/insert #tool:data-store/update #tool:data-store/delete #tool:data-store/mutation - After you have the necessary information from the previous tools, you can then use these tools to perform various operations against the data source, such as querying data, inserting new records, updating existing records, deleting records, or performing any type of mutations against the data source.

## Tool Call Frequency

- Prefer one #tool:data-store/connections call per target context, not per query.
- Prefer one #tool:data-store/payload call per provider and operation pattern, not per execution.
- Prefer one #tool:data-store/schema call per target structure unless there is evidence it changed.
- Re-run discovery tools only when context is stale.
- For follow-up requests in the same connection/provider context (for example another SELECT on the same table), go directly to the execution tool and skip discovery tools unless an error indicates stale context.
- Do not repeat identical #tool:data-store/payload or #tool:data-store/schema calls in the same turn unless inputs changed.

## Stale Context Definition

Treat context as stale when any of the following happens:

- Connection target changed or current connectionId is invalid.
- Provider changed (for example SQL to REST, or PostgreSQL to MSSQL).
- Schema/shape mismatch is reported by a tool.
- Payload validation indicates required fields or shape assumptions are no longer valid.

## Payload Information

The payload for making requests to the data source is a crucial part of the interaction process. It should be structured according to the requirements of the specific data source you are working with. The payload typically includes information such as the connection ID, the specific operation you want to perform, and any relevant parameters or data needed for that operation. It is important to refer to the documentation for the specific data source and the **SKILL** documentation (if available) for detailed information on how to structure the payload correctly for successful interactions with the data source.
