/**
 * Todo App — Frontend JavaScript
 * Communicates with the Express REST API at /tasks
 */

const API_BASE = "/tasks";

// --- State ---
let currentFilter = "all";
let tasks = [];

// --- DOM refs ---
const taskListEl = document.getElementById("taskList");
const emptyStateEl = document.getElementById("emptyState");
const addTaskForm = document.getElementById("addTaskForm");
const taskTitleInput = document.getElementById("taskTitle");
const taskDescriptionInput = document.getElementById("taskDescription");
const filterButtons = document.querySelectorAll(".btn-filter");

// --- Toast helper ---
function showToast(message) {
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2500);
}

// --- API helpers ---
async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data;
}

// --- Fetch & render ---
async function loadTasks() {
  try {
    tasks = await apiFetch(`?status=${currentFilter}`);
    renderTasks();
  } catch (err) {
    taskListEl.innerHTML = `<p class="loading" style="color:#e53e3e;">Erreur : ${err.message}</p>`;
  }
}

function renderTasks() {
  taskListEl.innerHTML = "";

  if (tasks.length === 0) {
    emptyStateEl.classList.remove("hidden");
    return;
  }

  emptyStateEl.classList.add("hidden");

  // Update filter buttons with count
  updateFilterCounts();

  tasks.forEach((task) => {
    const item = document.createElement("div");
    item.className = `task-item${task.done ? " done" : ""}`;
    item.dataset.id = task.id;

    const date = new Date(task.created_at).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    item.innerHTML = `
      <input
        type="checkbox"
        class="task-checkbox"
        ${task.done ? "checked" : ""}
        aria-label="Marquer comme ${task.done ? "non terminé" : "terminé"}"
      />
      <div class="task-content">
        <div class="task-title">${escapeHtml(task.title)} <span class="task-id">#${task.id}</span></div>
        ${task.description ? `<div class="task-description">${escapeHtml(task.description)}</div>` : ""}
        <div class="task-meta">${date}</div>
      </div>
      <div class="task-actions">
        <button class="btn-icon delete-btn" title="Supprimer" aria-label="Supprimer la tâche">🗑️</button>
      </div>
    `;

    // Toggle done on checkbox change
    item.querySelector(".task-checkbox").addEventListener("change", async (e) => {
      try {
        await apiFetch(`/${task.id}`, {
          method: "PATCH",
          body: JSON.stringify({ done: e.target.checked }),
        });
        showToast(e.target.checked ? "✅ Tâche terminée !" : "↩️ Tâche réouverte");
        loadTasks();
      } catch (err) {
        showToast(`Erreur : ${err.message}`);
        e.target.checked = !e.target.checked;
      }
    });

    // Delete button
    item.querySelector(".delete-btn").addEventListener("click", async () => {
      if (!confirm(`Supprimer "${task.title}" ?`)) return;
      try {
        await apiFetch(`/${task.id}`, { method: "DELETE" });
        showToast("🗑️ Tâche supprimée");
        loadTasks();
      } catch (err) {
        showToast(`Erreur : ${err.message}`);
      }
    });

    taskListEl.appendChild(item);
  });
}

function updateFilterCounts() {
  const allCount = tasks.length;
  filterButtons.forEach((btn) => {
    const existingBadge = btn.querySelector(".stats-badge");
    if (existingBadge) existingBadge.remove();
    if (btn.dataset.filter === currentFilter) {
      const badge = document.createElement("span");
      badge.className = "stats-badge";
      badge.textContent = allCount;
      btn.appendChild(badge);
    }
  });
}

// --- Add task form ---
addTaskForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = taskTitleInput.value.trim();
  const description = taskDescriptionInput.value.trim();
  if (!title) return;

  try {
    await apiFetch("", {
      method: "POST",
      body: JSON.stringify({ title, description: description || undefined }),
    });
    taskTitleInput.value = "";
    taskDescriptionInput.value = "";
    showToast("✨ Tâche ajoutée !");
    currentFilter = "all";
    updateFilterButtons();
    loadTasks();
  } catch (err) {
    showToast(`Erreur : ${err.message}`);
  }
});

// --- Filters ---
filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    currentFilter = btn.dataset.filter;
    updateFilterButtons();
    loadTasks();
  });
});

function updateFilterButtons() {
  filterButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.filter === currentFilter);
    const badge = btn.querySelector(".stats-badge");
    if (badge) badge.remove();
  });
}

// --- Utility ---
function escapeHtml(str) {
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

// --- Init ---
loadTasks();
