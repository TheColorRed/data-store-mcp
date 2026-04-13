---
name: Connection Instructions
description: 'These instructions provide guidance on how connections work and which skill to use for each data source type. Read this file to understand how to identify the correct connectionId and load the appropriate skill before interacting with any data source.'
---

# Connection Instructions

## How Connections Work

Connections are configured in the workspace and each is assigned a unique `id`. When calling any data store tool, pass that `id` as the `connectionId` — the server resolves and opens the connection automatically. You do not need to know or include the host, credentials, or any other connection options when making tool calls.

## Skills 🥷

You **MUST** read the proper skill to successfully complete the task at hand. Each skill has detailed information on how to use the data source. Not reading the skill will result in failure to complete the task.

### SQL Database 🔎

If the user wants to use a SQL database you **MUST** use the `data-store-sql` skill to interact with the database.

### Document Database 🔎

If the user wants to use a document database such as MongoDB, you **MUST** use the `data-store-document` skill to interact with the document database.

### Key-Value Store 🔎

If the user wants to use a key-value store such as Redis, you **MUST** use the `data-store-key-value` skill to interact with the key-value store.

### Object Storage 🗄️

If the user wants to use Amazon S3 or Azure Blob Storage you **MUST** use the `data-store-object-storage` skill to interact with object storage.

### FTP 🗄️

If the user wants to use FTP you **MUST** use the `data-store-ftp` skill to interact with the FTP server.

### GraphQL 📈

If the user wants to use GraphQL you **MUST** use the `data-store-graphql` skill to interact with the GraphQL API.

### REST API 🌐

If the user wants to use a REST API you **MUST** use the `data-store-rest` skill to interact with the REST API.
