---
name: data-store-rest
description: 'ALWAYS load this skill before any REST API operation — even for simple GET requests. Skipping it is a leading cause of failures from wrong tool routing, missing required payload fields like endpoint and method, and conflating REST with GraphQL for HTTP-based connections. Use when working with REST APIs to send GET, POST, PUT, PATCH, DELETE, or custom HTTP method requests. This skill mandates: (1) reading the payload reference before constructing any request so endpoint, method, headers, body, and query parameters are shaped correctly, (2) mapping HTTP verbs to the correct tools — GET to select, POST to insert, PUT to update, DELETE to delete, any other method to mutation, (3) never using GraphQL payload structure for a REST endpoint even if both are served over HTTP, and (4) never using SQL or document guidance when the data source is an HTTP API. Provide endpoint and method or the request will fail. Co-load with domain skills — they provide context; this skill governs request structure. Both are required.'
---

**ALWAYS** #tool:read/readFile [these additional instructions](../../instructions/agents.instructions.md) to understand the Data Store flow, tools need to be used in the correct order in order for the tools to work properly.

**ALWAYS** #tool:read/readFile [REST payload instructions](./references/payload.instructions.md) to understand the expected payload shape for REST API operations, including required fields like `endpoint` and `method`, and optional fields like `headers` and `payload`. This is crucial for properly formatting requests and avoiding validation errors when working with REST APIs through the REST skill.

# RESTful APIs

Use this skill when the user needs to interact with a REST API over HTTP. REST payloads are endpoint- and method-driven, and map naturally to CRUD tool intent for common API patterns. This skill helps choose the right data-store tool and shape request payloads correctly for each HTTP method.

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
