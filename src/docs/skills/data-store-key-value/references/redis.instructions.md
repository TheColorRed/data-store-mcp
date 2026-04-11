# Redis

Redis is a popular in-memory key-value data store that supports various data structures such as strings, hashes, lists, sets, and sorted sets. It is commonly used for caching, session management, real-time analytics, and as a message broker.

When working with Redis using the Key-Value Data Store skill, you can perform operations such as querying values by key, inserting new key-value pairs, updating existing keys, and deleting keys. The skill provides a method-driven payload structure that allows you to specify the Redis command you want to execute along with the necessary parameters.

## Tool Usage

- #tool:data-store/select: Use this tool for read operations such as `GET`, `EXISTS`, or `KEYS`.
- #tool:data-store/insert: Use this tool for create/set operations with the `SET` command.
- #tool:data-store/update: Use this tool for overwrite/update operations with the `SET` command when the key must already exist.
- #tool:data-store/delete: Use this tool for delete/remove operations with the `DEL` command.
- #tool:data-store/mutation: Use this tool as a generic alias for write operations that map to insert, update, or delete behavior with the appropriate Redis commands.
- #tool:data-store/schema: Use this tool for a shortcut to `this.client.keys('*')` to inspect the available keys in the Redis store, since Redis does not have a formal schema but this can provide insight into the key structure.
