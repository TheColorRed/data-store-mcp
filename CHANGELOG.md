# Change Log

## 1.0.0 - 2025-08-09

- Initial release

## 1.1.0 - 2025-08-10

- Added
  - Support for additional data stores.
    - CRUD (Create, Read, Update, Delete)
    - GraphQL
  - Additional error handling.
  - Extra response information when the connections tool is used.
- Updated
  - README.md with more examples and usage instructions.

## 1.1.1 - 2025-08-11

- Fixed:
  - Activation events to correctly match single connection and store files.

## 1.2.x - 2025-08-14

- Added
  - Support for MongoDB.
- Updated
  - Improved error messages.

## 1.3.x - 2025-08-17

- Fixed
  - Corrected the connection call for postgres.
- Added
  - Support for AWS S3.
  - New `payload` tool for describing the payload needed for each data store.
  - Store config addition of `disallowedTools` parameter to restrict certain tools from running a enabled tool.
    - Useful for allowing some tools to run while blocking others.
- Updated
  - Renamed `CRUD` data source to `Rest`.
  - Changed the parameters that get passed to the data source so it is more dynamic and flexible. It now only accepts 2 parameters.
    - `connectionId` - The unique identifier for the connection.
    - `payload` - The payload to be sent to the data source.

## 1.4.x - 2025-08-25

- Added
  - Support for FTP.
  - Type hinting support for MariaDB in config file (uses the same driver as MySQL).

## 1.5.x - 2025-10-07

- Added
  - Support for placing connection and store config files in subdirectories within the `.vscode` folder.
- Updated
  - Improved the parameter information and descriptions for all tools to make it clearer what each tool does and when to use them.
  - Updated the connections response for better clarity and usability.

## 1.6.x - 2026-03-28

- Added
  - Created chat skills for each data store to help reduce the number of tokens used in interactions and for the tool to make better decisions.
    - This requires skill support in vscode (tested in vscode `1.109.x`).
    - Use version `1.5.x` if you do not have skill support in your vscode version.
  - Created a `agents.instructions.md` file with instructions on how to use the data store should be used by an agent.

## 1.7.x - 2026-04-09

- Added
  - Support for Redis.
- Updated
  - Replaced the sqlite module with the builtin `node:sqlite` module provided by node `22.5.x` and above (**Note:** currently node puts this behind an experimental flag). This should help allow the plugin to not error on platforms that are not windows and will also reduce the overall size of the plugin.
  - Updated the formatting instructions for all SQL data stores.
    - Skills recommend always quoting identifiers to prevent reserved word conflicts and reduce failed queries. This is now consistent across all SQL data stores.
    - Skills recommend using prepared statements with parameters instead of hardcoding values directly into the SQL string. This is for security reasons to prevent SQL injection and is now consistent across all SQL data stores.
      - This has been always supported but agents seemed to not be using it, so the instructions have been updated to make it more clear and to encourage its usage.

## 1.8.x - 2026-04-12

- Added
  - Support for Azure Blob Storage.
  - Additional instructions files for additional security and safety.
  - Additional operations skill for agents to better determine which tools to call, when to call and what to do for failures.
- Updated
  - Updated Redis to support more commands and to have better formatting instructions.
  - Updated the skills with better information.
  - Simplified the payload tool response.
  - Updated sqlite schema query.
