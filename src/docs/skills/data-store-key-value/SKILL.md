---
name: data-store-key-value
description: 'Use when working with key-value data sources, currently Redis, to query, write, or delete data.'
---

# Key-Value Data Store

Use this skill when the user needs to work with key-value data sources such as Redis. Key-value stores are command- and key-centric, so payload construction differs from SQL and document data sources. This skill provides routing guidance and payload references for read, write, update, and delete behaviors.

**ALWAYS** #tool:read/readFile [these additional instructions](../../agents.instructions.md) to understand the Data Store flow, tools need to be used in the correct order in order for the tools to work properly.

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

## Key-Value Payloads

Payload shape is provider-specific and currently documented for Redis. Read the payload reference before issuing commands when method/field requirements are unknown or stale. Reuse known payload context for repeated operations with unchanged connection/provider context.

**ALWAYS** read the payload instructions document for the specific key-value store before using the Key-Value skill to understand how to properly format the payload for that store's operations, including the required and optional fields for different operation types.

Redis currently uses a method-driven payload that includes a command-style `method`, a `key`, and an optional `value` for write operations. Refer to the Redis payload documentation for the supported fields and shapes.

- [Redis Payload](references/payload-redis.instructions.md)

## References

Use the provider reference for command-level details and examples. These references are the authoritative source for method names and required field combinations.
Consult this section whenever there is uncertainty about command semantics or field naming. It is especially useful when translating user intent into provider-specific method values. Keeping method details in one place helps reduce contradictory guidance across skills.

**ALWAYS** refer to the specific data store instructions for detailed guidance on payload structure, supported operations, and examples.

- [Redis Instructions](references/redis.instructions.md)

## Example Assets

Use these Redis payload assets as templates for common key-value operations.
These assets replace long inline JSON snippets and keep examples synchronized with runtime expectations. They are easier to update when provider behavior changes and simpler to validate during reviews. Start from the closest operation file, then adjust only keys and values for the task.

- [Redis SELECT payload](assets/redis/select.json)
- [Redis INSERT payload](assets/redis/insert.json)
- [Redis UPDATE payload](assets/redis/update.json)
- [Redis DELETE payload](assets/redis/delete.json)
- [Redis mutation payload](assets/redis/mutation.json)
