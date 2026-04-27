---
name: data-store-key-value
description: 'ALWAYS load this skill before any Redis or key-value operation — even for simple get or set commands. Skipping it is a leading cause of failures from wrong method names, missing key fields, and confusing the schema tool output with a relational schema. Use when working with key-value data sources such as Redis. Applies to GET, SET, DEL, KEYS, EXISTS, and hash variant commands. This skill mandates: (1) reading the Redis payload reference before constructing any request so the method, key, and optional value fields are set correctly, (2) using select for read operations like GET, KEYS, and EXISTS — not mutation, (3) using insert for initial key creation and update when overwriting an existing key, and (4) treating schema tool output as a key summary, not a relational table list — do not apply SQL schema interpretation to key-value results. SQL and document patterns don't apply. Co-load with domain skills — they provide context; this skill governs payload correctness. They are complementary, not interchangeable.'
---

**ALWAYS** #tool:read/readFile [these additional instructions](../../instructions/agents.instructions.md) to understand the Data Store flow, tools need to be used in the correct order in order for the tools to work properly.

**ALWAYS** #tool:read/readFile [redis instructions](./references/redis.instructions.md) when working with a Redis data store.

# Key-Value Data Store

Use this skill when the user needs to work with key-value data sources such as Redis. Key-value stores are command- and key-centric, so payload construction differs from SQL and document data sources. This skill provides routing guidance and payload references for read, write, update, and delete behaviors.

## When To Use

Use this skill for requests that target keys, key patterns, hashes, or value mutations in a key-value store. It is the correct starting point for Redis operations and for future key-value providers that follow method-driven payload patterns. Prefer this skill over SQL or REST references when the core unit is a key/value pair.

- Use this skill when the user wants to query, insert, update, or delete Redis data.
- Use this skill when the user needs key-value operations or store-specific payload guidance.
- Use this skill as the generic entry point for key-value stores, even if the current payload reference only documents Redis.

## Tool Usage

Key-value operations map to CRUD tools by intent, even when underlying commands are provider-specific. Use read tools for retrieval and write tools for state changes, then refine method values in the payload reference. Reserve `mutation` as a generic write alias when a specific CRUD route is not required.

- Use the #tool:data-store/select tool for read-style key-value operations supported by the current store.
- Use the #tool:data-store/insert tool for create/set operations.
- Use the #tool:data-store/update tool for overwrite/update operations when the key must already exist.
- Use the #tool:data-store/delete tool for delete/remove operations.
- Use the #tool:data-store/mutation tool as a generic alias for write operations that map to insert, update, or delete behavior.
- Use the #tool:data-store/schema tool to inspect store metadata when schema-like information is available. For Redis, this returns a summary of keys rather than a relational schema.

## Redis

Redis is the current documented provider for this skill and uses command-like methods (`get`, `set`, `del`, and hash variants). Use these mappings as the primary operational path for Redis connections. Apply schema tooling only as a key-summary helper, not as relational metadata.

- Use the #tool:data-store/select tool with Redis methods `GET`, `EXISTS`, or `KEYS`.
- Use the #tool:data-store/insert tool with Redis method `SET` to create or write a key.
- Use the #tool:data-store/update tool with Redis method `SET` when the target key already exists.
- Use the #tool:data-store/delete tool with Redis method `DEL`.
- Use the #tool:data-store/mutation tool with Redis methods `SET` or `DEL`.
