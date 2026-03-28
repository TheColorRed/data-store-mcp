---
name: data-store-rest
description: 'Execute operations against RESTful APIs, such as sending GET, POST, PUT, and DELETE requests. Use this skill to interact with RESTful services and perform various operations on them.'
---

# RESTful APIs

**ALWAYS** #tool:read/readFile [these additional instructions](../../agents.instructions.md) to understand the Data Store flow, tools need to be used in the correct order in order for the tools to work properly.

- Use the #tool:data-store/select tool for GET requests.
- Use the #tool:data-store/insert tool for POST requests.
- Use the #tool:data-store/update tool for PUT requests.
- Use the #tool:data-store/delete tool for DELETE requests.
- Use the #tool:data-store/mutation tool for a generic HTTP request (any method).

## Payload

- [RESTful API](references/payload.instructions.md)
