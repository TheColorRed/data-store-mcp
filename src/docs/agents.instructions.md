---
name: Agent Instructions
description: 'These instructions provide guidance on how to use the tools available in this extension when working with agents. It is important to follow these instructions to ensure that you are using the tools correctly and effectively when interacting with data sources through agents.'
---

# Agent Instructions

These instructions are meant to provide guidance on how to use the tools available in this extension when working with agents. It is important to follow these instructions to ensure that you are using the tools correctly and effectively when interacting with data sources through agents.

## Order of Tool Usage

When using the tools available in this extension, it is important to use them in the correct order to ensure that you have the necessary information and context for proceeding to the next step. Here is the recommended order of tool usage:

1. #tool:data-store/connections - This tool should be used first to get a list of supported data sources and their connection IDs. This will give you the necessary information about the available data sources that you can interact with. This usually only needs to be called once at the beginning of your interactions with the data sources, unless you want to check for new connections or data sources that have been added since your last call.
2. #tool:data-store/schema - After you have the connection ID for the data source you want to interact with, you can use this tool to get information about the schema of the data source, such as tables, columns, and other relevant information that will help you perform operations against the data source.
3. #tool:data-store/payload - This tool should be used after you have the necessary information about the data source and its schema. The payload tool will provide you with the necessary information on how to structure the payload for making requests to the data source. This is crucial for ensuring that your requests are properly formatted and contain all the necessary information for successful interactions with the data source.
4. #tool:data-store/select, #tool:data-store/insert, #tool:data-store/update, #tool:data-store/delete, #tool:data-store/mutation - After you have the necessary information from the previous tools, you can then use these tools to perform various operations against the data source, such as querying data, inserting new records, updating existing records, deleting records, or performing any type of mutations against the data source.

## Payload Information

The payload for making requests to the data source is a crucial part of the interaction process. It should be structured according to the requirements of the specific data source you are working with. The payload typically includes information such as the connection ID, the specific operation you want to perform, and any relevant parameters or data needed for that operation. It is important to refer to the documentation for the specific data source and the **SKILL** documentation (if available) for detailed information on how to structure the payload correctly for successful interactions with the data source.
