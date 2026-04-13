---
name: Schema First Instructions
description: 'Use when table, collection, key shape, or endpoint structure is unclear before composing write or complex read operations.'
---

# Schema First Instructions

Use schema and payload discovery before complex operations to improve first-pass success and reduce retries.

## Required Sequence

1. Resolve target source with #tool:data-store/connections only when connection context is unknown or stale.
2. Read payload format with #tool:data-store/payload only when payload context is unknown or stale.
3. Read structure with #tool:data-store/schema only when schema context is unknown or stale.
4. Execute operation with the appropriate CRUD or mutation tool.

## When To Enforce

- Any write operation where fields are uncertain.
- Any operation with joins, nested fields, or provider-specific syntax.
- Any cross-source transformation where field mapping is required.

## If Schema Is Unsupported

If provider schema is partial or unavailable, proceed with payload documentation and explicit assumptions, then keep operation scope narrow.
