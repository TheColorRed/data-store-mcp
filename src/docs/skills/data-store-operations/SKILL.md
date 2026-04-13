---
name: data-store-operations
description: 'Use when you need workflow guidance for tool selection, schema-first execution, troubleshooting, error recovery, provider capability mapping, or output formatting across any data store type.'
---

# Data Store Operations

Use this skill for cross-provider operational workflows that apply to SQL, document, key-value, REST, GraphQL, FTP, and object storage sources.

This skill intentionally references existing instruction files so guidance is maintained in one place and is not duplicated.

## When To Use

- Use this skill when deciding which tool to run for a requested operation.
- Use this skill when schema or payload shape is uncertain and you need a safe execution flow.
- Use this skill when a request fails and you need deterministic recovery steps.
- Use this skill when provider capabilities are unclear for a requested action.
- Use this skill when you need consistent response formatting for results and failures.

## Workflow References

Read these references based on need:

- [Tool Routing](instructions/tool-routing.instructions.md)
- [Schema First](instructions/schema-first.instructions.md)
- [Error Recovery](instructions/error-recovery.instructions.md)
- [Provider Capability Matrix](instructions/provider-capability-matrix.instructions.md)
- [Troubleshooting](instructions/troubleshooting.instructions.md)
- [Response Standards](instructions/response-standards.instructions.md)
