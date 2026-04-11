# Connection Configuration

## Skills 🥷

You **MUST** read the proper skill to successfully complete the task at hand. Each skill has detailed information on how to use the data source that will be used to complete the task. Not reading the skill will result in failure to complete the task.

### SQL Database 🔎

If the user wants to use a SQL database you **MUST** use the `data-store-sql` skill to interact with the database.

### NoSQL Database 🔎

If the user wants to use a NoSQL database you **MUST** use the `data-store-no-sql` skill to interact with the NoSQL database.

### S3 🗄️

If the user wants to use S3 you **MUST** use the `data-store-s3` skill to interact with S3.

### FTP 🗄️

If the user wants to use FTP you **MUST** use the `data-store-ftp` skill to interact with the FTP server.

### GraphQL 📈

If the user wants to use GraphQL you **MUST** use the `data-store-graphql` skill to interact with the GraphQL API.

### REST API 🌐

If the user wants to use a REST API you **MUST** use the `data-store-rest` skill to interact with the REST API.

---

## Connection File Examples

Connection files are stored in `.vscode/` subdirectories of your workspace and can be named:

- `connections.json` or `stores.json` (array of connections)
- `*.connection.json` or `*.store.json` (single connection)

### MySQL / MariaDB Connection

```json
{
  "id": "my-mysql-db",
  "type": "mysql",
  "options": {
    "host": "localhost",
    "port": 3306,
    "user": "root",
    "password": "your-password",
    "database": "my_database"
  }
}
```

MariaDB connections can use either `"type": "mysql"` or `"type": "mariadb"`. Both use the same connector and options.

### SQLite Connection

```json
{
  "id": "local-sqlite",
  "type": "sqlite",
  "options": {
    "filename": "./data/app.db"
  }
}
```

### PostgreSQL Connection

```json
{
  "id": "postgres-db",
  "type": "postgres",
  "options": {
    "host": "localhost",
    "port": 5432,
    "user": "postgres",
    "password": "your-password",
    "database": "my_database"
  }
}
```

### MongoDB Connection

```json
{
  "id": "mongo-db",
  "type": "mongodb",
  "options": {
    "url": "mongodb://localhost:27017/my_database"
  }
}
```

### REST API Connection

```json
{
  "id": "my-api",
  "type": "rest",
  "options": {
    "baseUrl": "https://api.example.com",
    "headers": {
      "Authorization": "Bearer your-token",
      "Content-Type": "application/json"
    }
  }
}
```

### S3 Connection

```json
{
  "id": "my-s3-bucket",
  "type": "s3",
  "options": {
    "region": "us-east-1",
    "bucket": "my-bucket-name",
    "accessKeyId": "your-access-key",
    "secretAccessKey": "your-secret-key"
  }
}
```

### Multiple Connections Example

Create `.vscode/connections.json` with an array:

```json
[
  {
    "id": "prod-mysql",
    "type": "mysql",
    "options": {
      "host": "prod.example.com",
      "user": "app_user",
      "password": "prod-password",
      "database": "production"
    }
  },
  {
    "id": "dev-sqlite",
    "type": "sqlite",
    "options": {
      "filename": "./dev.db"
    }
  }
]
```

### Restricting Tool Access

You can disable specific tools for a connection using `disallowedTools`:

```json
{
  "id": "read-only-db",
  "type": "mysql",
  "disallowedTools": ["insert", "update", "delete", "mutation"],
  "options": {
    "host": "readonly.example.com",
    "user": "readonly_user",
    "password": "password",
    "database": "analytics"
  }
}
```
