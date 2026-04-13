---
name: data-store-rest
description: 'Use when working with REST APIs to send GET, POST, PUT, DELETE, or other HTTP requests and inspect API responses.'
---

# RESTful APIs

Use this skill when the user needs to interact with a REST API over HTTP. REST payloads are endpoint- and method-driven, and map naturally to CRUD tool intent for common API patterns. This skill helps choose the right data-store tool and shape request payloads correctly for each HTTP method.

**ALWAYS** #tool:read/readFile [these additional instructions](../../agents.instructions.md) to understand the Data Store flow, tools need to be used in the correct order in order for the tools to work properly.

## When To Use

Use this skill whenever the target source is a REST endpoint and the user asks for GET/POST/PUT/DELETE-style operations. It also applies to generic HTTP calls that require custom headers or non-standard methods. Prefer this skill over GraphQL guidance when operations are endpoint-oriented rather than query-language oriented.

- Use this skill when the user wants to call a REST endpoint with standard HTTP methods.
- Use this skill when the user needs request payload, headers, path, or query parameter guidance for an API request.

## Tool Usage

REST operations should map directly from HTTP method to CRUD tool whenever possible. Use `mutation` only for method patterns that do not fit the standard mapping. For read/list/search API requests, route through `select`.

- Use the #tool:data-store/select tool for GET requests.
- Use the #tool:data-store/insert tool for POST requests.
- Use the #tool:data-store/update tool for PUT requests.
- Use the #tool:data-store/delete tool for DELETE requests.
- Use the #tool:data-store/mutation tool for a generic HTTP request (any method).

## REST Payload

REST payloads include endpoint, HTTP method, optional headers, and optional body content. Read the payload reference when requirements are unknown or stale, then reuse known shape for repeated requests in the same API context. Avoid redundant discovery calls when endpoint and method pattern are unchanged.

**ALWAYS** read the payload instructions document at least once before using the REST skill to understand how to properly format the payload for REST operations, including the required and optional fields for different operation types.

- [RESTful API](references/payload.instructions.md)

## Example Assets

Use these REST payload assets as templates for common HTTP operations.

- [REST SELECT payload](assets/rest/select.json)
- [REST INSERT payload](assets/rest/insert.json)
- [REST UPDATE payload](assets/rest/update.json)
- [REST DELETE payload](assets/rest/delete.json)
- [REST mutation payload](assets/rest/mutation.json)
