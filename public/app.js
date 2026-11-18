const list = document.querySelector("#task-list");
const form = document.querySelector("#task-form");
const feedback = document.querySelector("#feedback");
let tasks = [];
let activeFilter = "all";

document.querySelector("#today").textContent = new Intl.DateTimeFormat(undefined, {
  weekday: "short", month: "short", day: "numeric", year: "numeric"
}).format(new Date());

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) }
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || "Request failed");
  }
  return response.status === 204 ? null : response.json();
}

function render() {
  document.querySelector("#total-count").textContent = tasks.length;
  document.querySelector("#progress-count").textContent = tasks.filter(t => t.status === "in_progress").length;
  document.querySelector("#done-count").textContent = tasks.filter(t => t.status === "done").length;
  const visible = activeFilter === "all" ? tasks : tasks.filter(t => t.status === activeFilter);
  list.replaceChildren();
  if (!visible.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = tasks.length ? "No tasks in this filter." : "Your board is clear. Create your first task.";
    list.append(empty);
    return;
  }
  for (const task of visible) {
    const item = document.createElement("article");
    item.className = "task";
    const copy = document.createElement("div");
    copy.className = "task-copy";
    const title = document.createElement("strong");
    title.textContent = task.title;
    const description = document.createElement("p");
    description.textContent = task.description || "No description";
    copy.append(title, description);

    const status = document.createElement("button");
    status.className = `status ${task.status}`;
    status.textContent = ({ todo: "To do", in_progress: "In progress", done: "Completed" })[task.status];
    status.title = "Click to change status";
    status.addEventListener("click", () => cycleStatus(task));

    const remove = document.createElement("button");
    remove.className = "delete";
    remove.textContent = "×";
    remove.title = "Delete task";
    remove.setAttribute("aria-label", `Delete ${task.title}`);
    remove.addEventListener("click", () => deleteTask(task.id));
    item.append(copy, status, remove);
    list.append(item);
  }
}

async function loadTasks() {
  try { tasks = await request("/api/tasks"); render(); }
  catch (error) { feedback.textContent = error.message; list.innerHTML = '<div class="empty">Could not load tasks. Check the server.</div>'; }
}

async function cycleStatus(task) {
  const order = ["todo", "in_progress", "done"];
  const status = order[(order.indexOf(task.status) + 1) % order.length];
  try { await request(`/api/tasks/${task.id}`, { method: "PATCH", body: JSON.stringify({ status }) }); await loadTasks(); }
  catch (error) { feedback.textContent = error.message; }
}

async function deleteTask(id) {
  if (!window.confirm("Delete this task?")) return;
  try { await request(`/api/tasks/${id}`, { method: "DELETE" }); await loadTasks(); }
  catch (error) { feedback.textContent = error.message; }
}

document.querySelector("#new-task").addEventListener("click", () => {
  form.classList.remove("hidden");
  document.querySelector("#task-title").focus();
});
document.querySelector("#cancel-task").addEventListener("click", () => form.classList.add("hidden"));
form.addEventListener("submit", async event => {
  event.preventDefault();
  feedback.textContent = "";
  const title = document.querySelector("#task-title").value.trim();
  const description = document.querySelector("#task-description").value.trim();
  try {
    await request("/api/tasks", { method: "POST", body: JSON.stringify({ title, description }) });
    form.reset();
    form.classList.add("hidden");
    await loadTasks();
  } catch (error) { feedback.textContent = error.message; }
});
document.querySelectorAll("[data-filter]").forEach(button => button.addEventListener("click", () => {
  activeFilter = button.dataset.filter;
  document.querySelectorAll("[data-filter]").forEach(item => item.classList.toggle("active", item === button));
  render();
}));

loadTasks();
