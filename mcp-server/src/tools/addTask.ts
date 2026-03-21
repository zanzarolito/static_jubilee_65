import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * Tool: add_task
 *
 * Creates a new task in the Todo application via its REST API.
 *
 * Input schema:
 *   - title (required): The task title — must be a non-empty string
 *   - description (optional): An optional longer description for the task
 *
 * Returns the newly created task object as JSON.
 */

/** Base URL of the Todo REST API */
const TODO_API = process.env.TODO_API_URL ?? "http://localhost:3000";

/** Zod schema for the add_task input */
const addTaskSchema = {
  title: z
    .string()
    .min(1, "title must not be empty")
    .describe("The title of the task to create"),
  description: z
    .string()
    .optional()
    .describe("An optional longer description for the task"),
};

/**
 * Registers the `add_task` tool on the given MCP server instance.
 * @param server - The MCP server to register the tool on
 */
export function registerAddTask(server: McpServer): void {
  server.tool(
    "add_task",
    "Creates a new task in the Todo app. Returns the created task with its assigned ID.",
    addTaskSchema,
    async ({ title, description }) => {
      const response = await fetch(`${TODO_API}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Failed to create task: HTTP ${response.status} — ${errorText}`,
            },
          ],
        };
      }

      const task = await response.json();

      return {
        content: [
          {
            type: "text",
            text: `Task created successfully:\n${JSON.stringify(task, null, 2)}`,
          },
        ],
      };
    }
  );
}
