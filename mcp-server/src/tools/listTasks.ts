import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * Tool: list_tasks
 *
 * Retrieves all tasks from the Todo application via its REST API.
 * Optionally filters tasks by their completion status.
 *
 * Input schema:
 *   - status (optional): "all" | "done" | "pending"  — defaults to "all"
 *
 * Returns a JSON array of task objects.
 */

/** Base URL of the Todo REST API */
const TODO_API = process.env.TODO_API_URL ?? "http://localhost:3000";

/** Zod schema for the list_tasks input */
const listTasksSchema = {
  status: z
    .enum(["all", "done", "pending"])
    .optional()
    .default("all")
    .describe('Filter tasks by status: "all", "done", or "pending"'),
};

/**
 * Registers the `list_tasks` tool on the given MCP server instance.
 * @param server - The MCP server to register the tool on
 */
export function registerListTasks(server: McpServer): void {
  server.tool(
    "list_tasks",
    "Returns all tasks from the Todo app. Use the optional `status` parameter to filter by completion status.",
    listTasksSchema,
    async ({ status }) => {
      const url = `${TODO_API}/tasks?status=${status}`;

      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Failed to fetch tasks: HTTP ${response.status} — ${errorText}`,
            },
          ],
        };
      }

      const tasks = await response.json();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(tasks, null, 2),
          },
        ],
      };
    }
  );
}
