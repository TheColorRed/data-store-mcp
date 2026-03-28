# RESTful API Payload

The payload for making any RESTful API operation is a JSON object with the following structure:

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
