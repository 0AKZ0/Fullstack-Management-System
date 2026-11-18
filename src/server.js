import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "./db.js";

const app = express();
const port = Number(process.env.PORT) || 3000;
const root = path.dirname(fileURLToPath(import.meta.url));

app.disable("x-powered-by");
app.use(express.json({ limit: "32kb" }));
app.use(express.static(path.join(root, "../public")));

app.get("/api/health", (_req, res) => {
  const result = db.prepare("SELECT 1 AS ok").get();
  res.json({ status: "ok", database: result.ok === 1 });
});

app.get("/api/tasks", (req, res) => {
  const { status } = req.query;
  if (status && !["todo", "in_progress", "done"].includes(status)) {
    return res.status(400).json({ error: "Invalid status filter" });
  }
  const rows = status
    ? db.prepare("SELECT * FROM tasks WHERE status = ? ORDER BY id DESC").all(status)
    : db.prepare("SELECT * FROM tasks ORDER BY id DESC").all();
  res.json(rows);
});

app.post("/api/tasks", (req, res) => {
  const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
  const description = typeof req.body?.description === "string" ? req.body.description.trim() : "";
  if (!title || title.length > 120) {
    return res.status(400).json({ error: "Title is required and must be at most 120 characters" });
  }
  if (description.length > 1000) {
    return res.status(400).json({ error: "Description must be at most 1000 characters" });
  }
  const result = db.prepare(
    "INSERT INTO tasks (title, description) VALUES (?, ?)"
  ).run(title, description);
  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json(task);
});

app.patch("/api/tasks/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: "Invalid task id" });
  const current = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);
  if (!current) return res.status(404).json({ error: "Task not found" });

  const title = req.body?.title === undefined ? current.title : String(req.body.title).trim();
  const description = req.body?.description === undefined ? current.description : String(req.body.description).trim();
  const status = req.body?.status === undefined ? current.status : req.body.status;
  if (!title || title.length > 120 || description.length > 1000) {
    return res.status(400).json({ error: "Invalid title or description length" });
  }
  if (!["todo", "in_progress", "done"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }
  db.prepare(
    "UPDATE tasks SET title = ?, description = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).run(title, description, status, id);
  res.json(db.prepare("SELECT * FROM tasks WHERE id = ?").get(id));
});

app.delete("/api/tasks/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: "Invalid task id" });
  const result = db.prepare("DELETE FROM tasks WHERE id = ?").run(id);
  if (!result.changes) return res.status(404).json({ error: "Task not found" });
  res.status(204).end();
});

app.use("/api", (_req, res) => res.status(404).json({ error: "API route not found" }));
app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(port, () => console.log(`Management app running at http://localhost:${port}`));
