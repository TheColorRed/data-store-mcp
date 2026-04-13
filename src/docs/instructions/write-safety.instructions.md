---
name: Write Safety Instructions
description: 'Use when handling insert, update, delete, or mutation requests to reduce risk and apply consistent safety checks across all data source types.'
---

# Write Safety Instructions

Apply these checks before any write action across SQL, MongoDB, Redis, REST, GraphQL, FTP, and object storage.

## ⚠️ Safety Warning ⚠️

Tools reduce risk, but they cannot guarantee zero-impact execution in every scenario. Use least-privilege credentials and prefer non-production environments for testing destructive operations.

## Pre-Write Checks

1. Confirm target `connectionId` and operation scope.
2. Validate payload shape with #tool:data-store/payload when fields are uncertain.
3. For structured stores, run #tool:data-store/schema if table/collection/key structure is unclear.
4. Use parameterized inputs where supported (for example SQL prepared parameters).

## High-Risk Operations

Treat these as high risk and call out impact before execution:

- Delete operations without a narrow filter.
- Broad update operations.
- Schema-altering mutations.
- Bulk object/file deletions.
- Irreversible overwrites.

## Safety Defaults

- Prefer the least destructive valid tool.
- Prefer scoped filters, explicit object keys, and bounded limits.
- If a request is ambiguous and risk is high, use the #tool:vscode/askQuestions tool to get explicit user confirmation before executing. Alternatively, provide a dry-run query/command for the user to review.
