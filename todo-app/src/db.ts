import Database from "better-sqlite3";
import path from "path";

/**
 * Task type representing a todo item in the database.
 */
export interface Task {
  id: number;
  title: string;
  description: string | null;
  done: boolean;
  created_at: string;
}

/**
 * Input type for creating a new task.
 */
export interface CreateTaskInput {
  title: string;
  description?: string;
}

/**
 * Input type for updating a task.
 */
export interface UpdateTaskInput {
  done?: boolean;
  title?: string;
  description?: string;
}

// Open (or create) the SQLite database file
const DB_PATH = path.join(__dirname, "..", "tasks.db");
const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma("journal_mode = WAL");

// Create the tasks table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT    NOT NULL,
    description TEXT,
    done        INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  )
`);

/**
 * Retrieve all tasks, optionally filtered by status.
 * @param status - "all" | "done" | "pending"
 */
export function getAllTasks(status: "all" | "done" | "pending" = "all"): Task[] {
  let query = "SELECT * FROM tasks";
  if (status === "done") {
    query += " WHERE done = 1";
  } else if (status === "pending") {
    query += " WHERE done = 0";
  }
  query += " ORDER BY created_at DESC";

  const rows = db.prepare(query).all() as Array<Omit<Task, "done"> & { done: number }>;
  return rows.map((row) => ({ ...row, done: row.done === 1 }));
}

/**
 * Get a single task by its ID.
 * @param id - The task ID
 */
export function getTaskById(id: number): Task | undefined {
  const row = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as
    | (Omit<Task, "done"> & { done: number })
    | undefined;
  if (!row) return undefined;
  return { ...row, done: row.done === 1 };
}

/**
 * Create a new task.
 * @param input - The task data
 */
export function createTask(input: CreateTaskInput): Task {
  const stmt = db.prepare(
    "INSERT INTO tasks (title, description) VALUES (?, ?) RETURNING *"
  );
  const row = stmt.get(input.title, input.description ?? null) as Omit<Task, "done"> & { done: number };
  return { ...row, done: row.done === 1 };
}

/**
 * Update an existing task.
 * @param id - The task ID
 * @param input - The fields to update
 */
export function updateTask(id: number, input: UpdateTaskInput): Task | undefined {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (input.done !== undefined) {
    fields.push("done = ?");
    values.push(input.done ? 1 : 0);
  }
  if (input.title !== undefined) {
    fields.push("title = ?");
    values.push(input.title);
  }
  if (input.description !== undefined) {
    fields.push("description = ?");
    values.push(input.description);
  }

  if (fields.length === 0) return getTaskById(id);

  values.push(id);
  const stmt = db.prepare(`UPDATE tasks SET ${fields.join(", ")} WHERE id = ? RETURNING *`);
  const row = stmt.get(...(values as Parameters<typeof stmt.get>)) as
    | (Omit<Task, "done"> & { done: number })
    | undefined;

  if (!row) return undefined;
  return { ...row, done: row.done === 1 };
}

/**
 * Delete a task by ID.
 * @param id - The task ID
 * @returns true if the task was found and deleted, false otherwise
 */
export function deleteTask(id: number): boolean {
  const result = db.prepare("DELETE FROM tasks WHERE id = ?").run(id);
  return result.changes > 0;
}
