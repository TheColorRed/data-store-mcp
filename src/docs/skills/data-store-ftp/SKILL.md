---
name: data-store-ftp
description: 'Use when working with FTP servers to list files, read file contents, upload files, overwrite files, or delete files.'
---

# FTP Servers

Use this skill when the user needs to inspect or manage files on an FTP server.

**ALWAYS** #tool:read/readFile [these additional instructions](../../agents.instructions.md) to understand the Data Store flow, tools need to be used in the correct order in order for the tools to work properly.

## When To Use

- Use this skill when the user wants to browse files or directories on an FTP server.
- Use this skill when the user wants to download, upload, replace, or delete files over FTP.

## Tool Usage

- Use the #tool:data-store/select tool to list files (`SELECT`) or read file contents (`GET`).
- Use the #tool:data-store/insert tool to upload files (`INSERT`).
- Use the #tool:data-store/update tool to re-upload/overwrite files (`UPDATE`).
- Use the #tool:data-store/delete tool to remove files (`DELETE`).
- The #tool:data-store/mutation tool is a generic alias for `INSERT`, `UPDATE`, and `DELETE` operations.

## FTP Payload

**ALWAYS** read the payload instructions document at least once before using the FTP skill to understand how to properly format the payload for FTP operations, including the required and optional fields for different operation types.

- [Payload](references/payload.instructions.md)
