---
name: data-store-key-value
description: 'Use when working with key-value data sources, currently Redis, to query, write, or delete data.'
---

# Key-Value Data Store

Use this skill when the user needs to work with key-value data sources such as Redis.

**ALWAYS** #tool:read/readFile [these additional instructions](../../agents.instructions.md) to understand the Data Store flow, tools need to be used in the correct order in order for the tools to work properly.

## When To Use

- Use this skill when the user wants to query, insert, update, or delete Redis data.
- Use this skill when the user needs key-value operations or store-specific payload guidance.
- Use this skill as the generic entry point for key-value stores, even if the current payload reference only documents Redis.

## Tool Usage

- Use the #tool:data-store/select tool for read-style key-value operations supported by the current store.
- Use the #tool:data-store/insert tool for create/set operations.
- Use the #tool:data-store/update tool for overwrite/update operations when the key must already exist.
- Use the #tool:data-store/delete tool for delete/remove operations.
- Use the #tool:data-store/mutation tool as a generic alias for write operations that map to insert, update, or delete behavior.
- Use the #tool:data-store/schema tool to inspect store metadata when schema-like information is available. For Redis, this returns a summary of keys rather than a relational schema.

## Redis

- Use the #tool:data-store/select tool with Redis methods `GET`, `EXISTS`, or `KEYS`.
- Use the #tool:data-store/insert tool with Redis method `SET` to create or write a key.
- Use the #tool:data-store/update tool with Redis method `SET` when the target key already exists.
- Use the #tool:data-store/delete tool with Redis method `DEL`.
- Use the #tool:data-store/mutation tool with Redis methods `SET` or `DEL`.

## Key-Value Payloads

**ALWAYS** read the payload instructions document for the specific key-value store before using the Key-Value skill to understand how to properly format the payload for that store's operations, including the required and optional fields for different operation types.

Redis currently uses a method-driven payload that includes a command-style `method`, a `key`, and an optional `value` for write operations. Refer to the Redis payload documentation for the supported fields and shapes.

- [Redis Payload](references/payload-redis.instructions.md)

## References

**ALWAYS** refer to the specific data store instructions for detailed guidance on payload structure, supported operations, and examples.

- [Redis Instructions](references/redis.instructions.md)
