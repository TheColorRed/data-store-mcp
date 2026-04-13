---
name: Security and Secrets Instructions
description: 'Use when working with credentials, tokens, headers, signed URLs, or any sensitive connection data in data-store operations.'
---

# Security and Secrets Instructions

Protect sensitive data by default in prompts, payloads, logs, and responses.

## Redaction Rules

- Never print raw passwords, API keys, access tokens, account keys, private keys, or signed URLs.
- Redact sensitive headers and connection options in examples and summaries.
- If a tool error includes sensitive text, summarize it without reproducing secrets.

## Safe Handling

1. Prefer `connectionId` routing and avoid repeating full connection options.
2. Use least-privilege credentials for automated operations.
3. Avoid copying secrets into committed files.
4. Recommend `.vscode` connection files be excluded from version control.

## Reporting

When security issues are detected, describe risk and provide a safe remediation path without exposing secret values.
