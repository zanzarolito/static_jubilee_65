import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerListTasks } from "./tools/listTasks.js";
import { registerAddTask } from "./tools/addTask.js";
import { registerCompleteTask } from "./tools/completeTask.js";
import { registerDeleteTask } from "./tools/deleteTask.js";

/**
 * MCP Todo Server
 *
 * This server exposes the Todo web application's capabilities as MCP tools.
 * It communicates via the stdio transport, making it compatible with:
 *   - Claude Desktop
 *   - Claude Code CLI
 *   - Cursor
 *   - Zed
 *   - Any MCP-compliant client
 *
 * Architecture:
 *   MCP Client → (stdio) → MCP Server (this file) → REST API → Todo App → SQLite
 *
 * The server deliberately calls the Todo app's HTTP API rather than accessing
 * the database directly, illustrating proper separation of concerns.
 */

// Create the MCP server instance
const server = new McpServer({
  name: "todo-mcp-server",
  version: "1.0.0",
});

// Register all tools
// Each tool is defined in its own file under ./tools/
registerListTasks(server);
registerAddTask(server);
registerCompleteTask(server);
registerDeleteTask(server);

// Connect via stdio transport and start listening
async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Note: do NOT use console.log here — stdout is reserved for MCP protocol messages.
  // Use console.error for debug output if needed.
  console.error("✅ MCP Todo Server started (stdio transport)");
}

main().catch((err: unknown) => {
  console.error("Fatal error starting MCP server:", err);
  process.exit(1);
});
