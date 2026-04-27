**ALWAYS** #tool:read/readFile [select.json](../assets/rest/select.json) to understand the expected payload shape for RESTful API GET operations, including required fields like `endpoint` and optional fields like `headers`. This is crucial for properly formatting requests and avoiding validation errors.

**ALWAYS** #tool:read/readFile [insert.json](../assets/rest/insert.json) to understand the expected payload shape for RESTful API POST operations, including required fields like `endpoint`, `method`, and `payload`, and optional fields like `headers`. This is crucial for properly formatting requests and avoiding validation errors.

**ALWAYS** #tool:read/readFile [update.json](../assets/rest/update.json) to understand the expected payload shape for RESTful API PUT operations, including required fields like `endpoint`, `method`, and `payload`, and optional fields like `headers`. This is crucial for properly formatting requests and avoiding validation errors.

**ALWAYS** #tool:read/readFile [delete.json](../assets/rest/delete.json) to understand the expected payload shape for RESTful API DELETE operations, including required fields like `endpoint` and `method`, and optional fields like `headers`. This is crucial for properly formatting requests and avoiding validation errors.

**ALWAYS** #tool:read/readFile [mutation.json](../assets/rest/mutation.json) to understand the expected payload shape for RESTful API operations when using the generic mutation tool, including how to specify the `method` field along with required and optional fields for each operation type. This is crucial for properly formatting requests and avoiding validation errors when not using specific CRUD tools.

# RESTful API Payload

Use this reference to build REST requests across GET, POST, PUT, DELETE, and generic HTTP method patterns. REST payloads are endpoint-centric and should include only the fields needed for the current method. Reuse known payload shape for repeated requests in unchanged API context.

The payload for REST API operations is a JSON object with the following structure:

```json
{
  "endpoint": "http://your-restful-api-endpoint:port",
  "payload": {
    // The payload to send in the request body. This can be any JSON object depending on the API requirements.
  },
  "method": "GET" | "POST" | "PUT" | "DELETE",
  "headers": {
    // The headers to include in the request. This can be any JSON object depending on the API requirements.
  }
}
```

## Field Details

- `endpoint`: Required. Full endpoint URL for the request.
- `method`: Required. HTTP method (`GET`, `POST`, `PUT`, `DELETE`, or another method for mutation).
- `payload`: Optional request body. Commonly used with `POST`, `PUT`, and patch-style mutation calls.
- `headers`: Optional request headers. Merged with headers from connection configuration.

## Tool Mapping

- Use #tool:data-store/select for `GET` requests.
- Use #tool:data-store/insert for `POST` requests.
- Use #tool:data-store/update for `PUT` requests.
- Use #tool:data-store/delete for `DELETE` requests.
- Use #tool:data-store/mutation for non-standard HTTP methods (for example `PATCH`) or generic passthrough requests.

## Common Mistakes

- Using `mutation` for normal `GET` reads instead of `select`.
- Omitting required auth headers expected by the endpoint.
- Sending a body for endpoints that do not accept one.
