---
name: data-store-operations
description: 'ALWAYS load this skill when tool routing is ambiguous, a request fails, or you are unsure which provider tool to call — regardless of which data source is involved. Skipping it is a leading cause of repeated failed tool calls, unnecessary schema fetches, and inconsistent error responses. Use for cross-provider operational workflow guidance covering SQL, document, key-value, REST, GraphQL, FTP, and object storage. This skill mandates: (1) reading the tool-routing reference before making any tool call when the correct tool is not obvious, (2) following the schema-first execution flow when payload shape or table/collection details are uncertain, (3) applying the deterministic error recovery steps after any tool failure before retrying, and (4) formatting all results and errors to the response standards defined in this skill. This is a meta-skill — layer it on top of provider-specific skills. Layer this alongside provider skills — they govern payloads; this skill governs routing and recovery. Both are required.'
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
