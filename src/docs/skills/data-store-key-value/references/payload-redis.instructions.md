# Redis Payload

Redis operations use a method-driven payload with command-like method names. This reference documents the supported fields and how to route methods to the correct data-store tool. Use it when payload shape is unknown or stale.

## Base Shape

```json
{
  "method": "get",
  "key": "example:key",
  "value": "stored value",
  "hField": "fieldName",
  "hValue": "fieldValue"
}
```

## Field Details

- `method`: Required. Must be one of the supported Redis methods.
- `key`: Required for most methods. Use a string for single-key operations or an array for methods like `mGet`.
- `value`: Required for write methods such as `in`, `hIn`, `mSet`, and update-style methods that need a value.
- `hField`: Required for hash field reads/checks such as `hGet` and `hExists`.
- `hValue`: Required for hash writes and arithmetic methods such as `hIn`, `hIncrBy`, and `hDecrBy`.
- `schemaSampleStartIndex`: Optional schema sampling offset for `#tool:data-store/schema`.
- `maxKeysToShow`: Optional maximum key sample size for `#tool:data-store/schema`.

## Supported Methods

- Insert methods: `in`, `hIn`, `mSet`
- Select methods: `get`, `exists`, `keys`, `hGet`, `hGetAll`, `hExists`, `mGet`, `type`
- Update methods: `up`, `incr`, `incrBy`, `decr`, `decrBy`, `append`, `hIncr`, `hDecr`, `hIncrBy`, `hDecrBy`, `expire`, `persist`
- Delete methods: `del`, `hDel`

## Tool Mapping

- Use #tool:data-store/select with select methods.
- Use #tool:data-store/insert with insert methods.
- Use #tool:data-store/update with update methods.
- Use #tool:data-store/delete with delete methods.
- Use #tool:data-store/mutation as a generic write alias when needed.

## Common Mistakes

- Using `hValue` where `hField` is expected for `hGet`/`hExists`.
- Passing array keys to methods that expect a single string key.
- Sending `mSet` values as an array instead of an object.
- Repeating payload discovery calls in unchanged connection/provider context.

## Example Assets

- [assets/redis/select.json](../assets/redis/select.json)
- [assets/redis/insert.json](../assets/redis/insert.json)
- [assets/redis/update.json](../assets/redis/update.json)
- [assets/redis/delete.json](../assets/redis/delete.json)
- [assets/redis/mutation.json](../assets/redis/mutation.json)
