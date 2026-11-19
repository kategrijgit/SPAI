import { spaiApi } from "./api.js";

const todayStr = new Date().toISOString().slice(0, 10);

const defaultTasks = [
  {
    id: "1",
    title: "Лекция / разбор требований",
    date: todayStr,
    start: "10:00",
    end: "11:30",
    note: "Проверить контракты в docs/api.md",
    done: false
  },
  {
    id: "2",
    title: "Вёрстка компонентов фронтенда",
    date: todayStr,
    start: "11:00",
    end: "12:30",
    note: "Пересекается с предыдущей задачей для проверки подсветки",
    done: false
  }
];

let currentView = "week";
let tasks = [];

const calendarViewEl = document.getElementById("calendar-view");
const taskListEl = document.getElementById("task-list");
const conflictBannerEl = document.getElementById("conflict-banner");
const quickFormEl = document.getElementById("quick-task-form");
const modalEl = document.getElementById("task-modal");
const modalFormEl = document.getElementById("modal-task-form");
const deleteTaskBtn = document.getElementById("delete-task-btn");

document.getElementById("task-date").value = todayStr;

function setConflictBannerVisible(visible) {
  conflictBannerEl.classList.toggle("hidden", !visible);
  conflictBannerEl.hidden = !visible;
}

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function getConflictingIds(items) {
  const conflicts = new Set();
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i];
      const b = items[j];
      if (a.date !== b.date) continue;
      const startA = toMinutes(a.start);
      const endA = toMinutes(a.end);
      const startB = toMinutes(b.start);
      const endB = toMinutes(b.end);
      if (startA < endB && startB < endA) {
        conflicts.add(a.id);
        conflicts.add(b.id);
      }
    }
  }
  return conflicts;
}

function getDatesForView(view, baseDateStr) {
  const base = new Date(baseDateStr + "T00:00:00");
  if (view === "day") return [baseDateStr];

  const count = view === "week" ? 7 : 14;
  const list = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    list.push(d.toISOString().slice(0, 10));
  }
  return list;
}

function render() {
  const conflictIds = getConflictingIds(tasks);
  setConflictBannerVisible(conflictIds.size > 0);

  calendarViewEl.className = "calendar-grid";
  if (currentView === "week") calendarViewEl.classList.add("calendar-grid--week");
  if (currentView === "month") calendarViewEl.classList.add("calendar-grid--month");

  const dates = getDatesForView(currentView, todayStr);
  calendarViewEl.innerHTML = dates
    .map((dateStr) => {
      const dayTasks = tasks
        .filter((t) => t.date === dateStr)
        .sort((a, b) => a.start.localeCompare(b.start));

      const chips = dayTasks
        .map((t) => {
          const classes = ["event-chip"];
          if (t.done) classes.push("event-chip--done");
          if (conflictIds.has(t.id)) classes.push("event-chip--conflict");
          return `
            <button type="button" class="${classes.join(" ")}" data-open-task="${t.id}">
              <strong>${t.start}–${t.end}</strong> ${escapeHtml(t.title)}
            </button>
          `;
        })
        .join("");

      return `
        <div class="day-column">
          <div class="day-column__title">${dateStr}</div>
          ${chips || '<span style="color:#888;font-size:0.8rem;">Нет задач</span>'}
        </div>
      `;
    })
    .join("");

  taskListEl.innerHTML = tasks
    .map((t) => {
      const isConflict = conflictIds.has(t.id);
      return `
        <li class="task-item ${isConflict ? "task-item--conflict" : ""}">
          <div>
            <div><strong>${escapeHtml(t.title)}</strong></div>
            <div style="color:#666;font-size:0.8rem;">${t.date} · ${t.start}–${t.end}</div>
          </div>
          <button type="button" class="btn btn--small" data-open-task="${t.id}">Открыть</button>
        </li>
      `;
    })
    .join("");
}

function openModal(taskId) {
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return;

  document.getElementById("edit-task-id").value = task.id;
  document.getElementById("edit-task-title").value = task.title;
  document.getElementById("edit-task-date").value = task.date;
  document.getElementById("edit-task-start").value = task.start;
  document.getElementById("edit-task-end").value = task.end;
  document.getElementById("edit-task-note").value = task.note || "";
  document.getElementById("edit-task-done").checked = Boolean(task.done);

  modalEl.classList.remove("hidden");
}

function closeModal() {
  modalEl.classList.add("hidden");
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

document.querySelectorAll("[data-view]").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("[data-view]").forEach((b) => b.classList.remove("is-active"));
    btn.classList.add("is-active");
    currentView = btn.dataset.view;
    render();
  });
});

quickFormEl.addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = document.getElementById("task-title").value.trim();
  const date = document.getElementById("task-date").value;
  const start = document.getElementById("task-start").value;
  const end = document.getElementById("task-end").value;
  const note = document.getElementById("task-note").value.trim();
  if (!title || !date) return;

  tasks.push({
    id: String(Date.now()),
    title,
    date,
    start,
    end,
    note,
    done: false
  });

  await spaiApi.saveTasks(tasks);
  quickFormEl.reset();
  document.getElementById("task-date").value = date;
  render();
});

document.addEventListener("click", (e) => {
  const openBtn = e.target.closest("[data-open-task]");
  if (openBtn) {
    openModal(openBtn.dataset.openTask);
    return;
  }
  if (e.target.closest("[data-close-modal]")) {
    closeModal();
  }
});

modalFormEl.addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.getElementById("edit-task-id").value;
  const idx = tasks.findIndex((t) => t.id === id);
  if (idx === -1) return;

  tasks[idx] = {
    ...tasks[idx],
    title: document.getElementById("edit-task-title").value.trim(),
    date: document.getElementById("edit-task-date").value,
    start: document.getElementById("edit-task-start").value,
    end: document.getElementById("edit-task-end").value,
    note: document.getElementById("edit-task-note").value.trim(),
    done: document.getElementById("edit-task-done").checked
  };

  await spaiApi.saveTasks(tasks);
  closeModal();
  render();
});

deleteTaskBtn.addEventListener("click", async () => {
  const id = document.getElementById("edit-task-id").value;
  tasks = tasks.filter((t) => t.id !== id);
  await spaiApi.saveTasks(tasks);
  closeModal();
  render();
});

async function init() {
  tasks = await spaiApi.getTasks(defaultTasks);
  render();
}

init();