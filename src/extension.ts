// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import os from 'os';
import path from 'path';
import * as vscode from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  const didChangeEmitter = new vscode.EventEmitter<void>();

  let __dirname = new URL('.', import.meta.url).pathname;
  if (os.platform() === 'win32') __dirname = __dirname.replace(/^\//, '');
  const folders = vscode.workspace.workspaceFolders ?? [];

  const dataStoreMcpProvider = vscode.lm.registerMcpServerDefinitionProvider('data-store-mcp', {
    onDidChangeMcpServerDefinitions: didChangeEmitter.event,
    provideMcpServerDefinitions: async () => {
      return [
        new vscode.McpStdioServerDefinition('Data Store', 'node', [
          path.posix.join(__dirname, 'mcp/server.js'),
          `${JSON.stringify(folders.map(folder => folder.uri.fsPath))}`,
        ]),
      ];
    },
  });

  context.subscriptions.push(dataStoreMcpProvider);
}

// This method is called when your extension is deactivated
export function deactivate() {}
