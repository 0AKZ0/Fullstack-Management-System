import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import fs from "node:fs";

const port = 3198;
const dbPath = "./data/test-app.db";
const server = spawn(process.execPath, ["src/server.js"], {
  env: { ...process.env, PORT: String(port), DATABASE_PATH: dbPath },
  stdio: "ignore"
});
const base = `http://127.0.0.1:${port}`;

async function waitForServer() {
  for (let i = 0; i < 30; i++) {
    try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {}
    await delay(200);
  }
  throw new Error("Test server did not start");
}

test("task API supports create, list, update and delete", async t => {
  t.after(() => {
    server.kill();
    for (const file of [dbPath, dbPath + "-shm", dbPath + "-wal"]) {
      try { fs.unlinkSync(file); } catch {}
    }
  });
  await waitForServer();
  const createdResponse = await fetch(`${base}/api/tasks`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: "Test task", description: "Created by test" })
  });
  assert.equal(createdResponse.status, 201);
  const task = await createdResponse.json();
  assert.equal(task.title, "Test task");

  const updateResponse = await fetch(`${base}/api/tasks/${task.id}`, {
    method: "PATCH", headers: { "content-type": "application/json" },
    body: JSON.stringify({ status: "done" })
  });
  assert.equal((await updateResponse.json()).status, "done");

  const list = await (await fetch(`${base}/api/tasks`)).json();
  assert.equal(list.length, 1);

  const deleted = await fetch(`${base}/api/tasks/${task.id}`, { method: "DELETE" });
  assert.equal(deleted.status, 204);
});
