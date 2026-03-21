import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * Tool: complete_task
 *
 * Marks an existing task as done in the Todo application via its REST API.
 * Uses a PATCH request to set the `done` field to true.
 *
 * Input schema:
 *   - id (required): The numeric ID of the task to mark as complete
 *
 * Returns the updated task object as JSON.
 */

/** Base URL of the Todo REST API */
const TODO_API = process.env.TODO_API_URL ?? "http://localhost:3000";

/** Zod schema for the complete_task input */
const completeTaskSchema = {
  id: z
    .number()
    .int()
    .positive("id must be a positive integer")
    .describe("The numeric ID of the task to mark as complete"),
};

/**
 * Registers the `complete_task` tool on the given MCP server instance.
 * @param server - The MCP server to register the tool on
 */
export function registerCompleteTask(server: McpServer): void {
  server.registerTool(
    "complete_task",
    {
      description: "Marks a task as done in the Todo app. Use list_tasks first to find the task ID.",
      inputSchema: completeTaskSchema,
    },
    async ({ id }) => {
      const response = await fetch(`${TODO_API}/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: true }),
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
              text: `Failed to complete task: HTTP ${response.status} — ${errorText}`,
            },
          ],
        };
      }

      const task = await response.json();

      return {
        content: [
          {
            type: "text",
            text: `Task #${id} marked as done:\n${JSON.stringify(task, null, 2)}`,
          },
        ],
      };
    }
  );
}
