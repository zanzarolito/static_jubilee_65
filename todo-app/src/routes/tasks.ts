import { Router, Request, Response } from "express";
import {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
} from "../db";

const router = Router();

/**
 * GET /tasks
 * Returns all tasks. Optional query param: ?status=all|done|pending
 */
router.get("/", (_req: Request, res: Response): void => {
  const status = (_req.query.status as "all" | "done" | "pending") ?? "all";
  const validStatuses = ["all", "done", "pending"];
  if (!validStatuses.includes(status)) {
    res.status(400).json({ error: "Invalid status. Must be all, done, or pending." });
    return;
  }
  const tasks = getAllTasks(status);
  res.json(tasks);
});

/**
 * GET /tasks/:id
 * Returns a single task by ID.
 */
router.get("/:id", (req: Request, res: Response): void => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid task ID." });
    return;
  }
  const task = getTaskById(id);
  if (!task) {
    res.status(404).json({ error: "Task not found." });
    return;
  }
  res.json(task);
});

/**
 * POST /tasks
 * Creates a new task. Body: { title: string, description?: string }
 */
router.post("/", (req: Request, res: Response): void => {
  const { title, description } = req.body as { title?: string; description?: string };
  if (!title || typeof title !== "string" || title.trim() === "") {
    res.status(400).json({ error: "title is required and must be a non-empty string." });
    return;
  }
  const task = createTask({ title: title.trim(), description });
  res.status(201).json(task);
});

/**
 * PATCH /tasks/:id
 * Updates a task. Body: { done?: boolean, title?: string, description?: string }
 */
router.patch("/:id", (req: Request, res: Response): void => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid task ID." });
    return;
  }
  const { done, title, description } = req.body as {
    done?: boolean;
    title?: string;
    description?: string;
  };
  const task = updateTask(id, { done, title, description });
  if (!task) {
    res.status(404).json({ error: "Task not found." });
    return;
  }
  res.json(task);
});

/**
 * DELETE /tasks/:id
 * Deletes a task by ID.
 */
router.delete("/:id", (req: Request, res: Response): void => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid task ID." });
    return;
  }
  const deleted = deleteTask(id);
  if (!deleted) {
    res.status(404).json({ error: "Task not found." });
    return;
  }
  res.status(204).send();
});

export default router;
