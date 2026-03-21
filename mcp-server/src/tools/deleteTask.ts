import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * Tool: delete_task
 *
 * Permanently deletes a task from the Todo application via its REST API.
 * This action is irreversible.
 *
 * Input schema:
 *   - id (required): The numeric ID of the task to delete
 *
 * Returns a confirmation message on success.
 */

/** Base URL of the Todo REST API */
const TODO_API = process.env.TODO_API_URL ?? "http://localhost:3000";

/** Zod schema for the delete_task input */
const deleteTaskSchema = {
  id: z
    .number()
    .int()
    .positive("id must be a positive integer")
    .describe("The numeric ID of the task to delete"),
};

/**
 * Registers the `delete_task` tool on the given MCP server instance.
 * @param server - The MCP server to register the tool on
 */
export function registerDeleteTask(server: McpServer): void {
  server.registerTool(
    "delete_task",
    {
      description: "Permanently deletes a task from the Todo app. This action cannot be undone. Use list_tasks first to find the task ID.",
      inputSchema: deleteTaskSchema,
    },
    async ({ id }) => {
      const response = await fetch(`${TODO_API}/tasks/${id}`, {
        method: "DELETE",
      });

      if (response.status === 404) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Task with ID ${id} not found.`,
            },
          ],
        };
      }

      if (!response.ok) {
        const errorText = await response.text();
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Failed to delete task: HTTP ${response.status} — ${errorText}`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `Task #${id} has been permanently deleted.`,
          },
        ],
      };
    }
  );
}
