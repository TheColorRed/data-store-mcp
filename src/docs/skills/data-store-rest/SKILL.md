---
name: data-store-rest
description: 'Use when working with REST APIs to send GET, POST, PUT, DELETE, or other HTTP requests and inspect API responses.'
---

# RESTful APIs

Use this skill when the user needs to interact with a REST API over HTTP.

**ALWAYS** #tool:read/readFile [these additional instructions](../../agents.instructions.md) to understand the Data Store flow, tools need to be used in the correct order in order for the tools to work properly.

## When To Use

- Use this skill when the user wants to call a REST endpoint with standard HTTP methods.
- Use this skill when the user needs request payload, headers, path, or query parameter guidance for an API request.

## Tool Usage

- Use the #tool:data-store/select tool for GET requests.
- Use the #tool:data-store/insert tool for POST requests.
- Use the #tool:data-store/update tool for PUT requests.
- Use the #tool:data-store/delete tool for DELETE requests.
- Use the #tool:data-store/mutation tool for a generic HTTP request (any method).

## REST Payload

**ALWAYS** read the payload instructions document at least once before using the REST skill to understand how to properly format the payload for REST operations, including the required and optional fields for different operation types.

- [RESTful API](references/payload.instructions.md)
