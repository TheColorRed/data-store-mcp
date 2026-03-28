---
name: data-store-ftp
description: 'Execute operations against FTP servers, such as uploading, downloading, and managing files. Use this skill to interact with FTP servers and perform various operations on them.'
---

# FTP Servers

**ALWAYS** #tool:read/readFile [these additional instructions](../../agents.instructions.md) to understand the Data Store flow, tools need to be used in the correct order in order for the tools to work properly.

- Use the #tool:data-store/select tool to list files (`SELECT`) or read file contents (`GET`).
- Use the #tool:data-store/insert tool to upload files (`INSERT`).
- Use the #tool:data-store/update tool to re-upload/overwrite files (`UPDATE`).
- Use the #tool:data-store/delete tool to remove files (`DELETE`).
- The #tool:data-store/mutation tool is a generic alias for `INSERT`, `UPDATE`, and `DELETE` operations.

## Payload

- [Payload](references/payload.instructions.md)
