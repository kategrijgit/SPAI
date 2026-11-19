const API_CONFIG = {
  baseUrl: "http://localhost:8080/api",
  useMock: true,
  storageKeys: {
    tasks: "spai_current_plan_tasks",
    history: "spai_history_plans",
    user: "spai_current_user",
    token: "spai_auth_token"
  }
};

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

async function request(path, options = {}) {
  const token = localStorage.getItem(API_CONFIG.storageKeys.token);
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const response = await fetch(`${API_CONFIG.baseUrl}${path}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(errText || `HTTP ${response.status}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

export const spaiApi = {
  // Авторизация и регистрация
  async login({ email, password }) {
    if (API_CONFIG.useMock) {
      const user = { email, loggedInAt: Date.now() };
      writeJson(API_CONFIG.storageKeys.user, user);
      return { user, token: "mock-jwt-token" };
    }
    const data = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
    if (data?.token) localStorage.setItem(API_CONFIG.storageKeys.token, data.token);
    return data;
  },

  async register({ lastName, email, password }) {
    if (API_CONFIG.useMock) {
      const user = { lastName, email, loggedInAt: Date.now() };
      writeJson(API_CONFIG.storageKeys.user, user);
      return { user, token: "mock-jwt-token" };
    }
    const data = await request("/auth/register", {
      method: "POST",
      body: JSON.stringify({ lastName, email, password })
    });
    if (data?.token) localStorage.setItem(API_CONFIG.storageKeys.token, data.token);
    return data;
  },

  // Текущие задачи и расписание
  async getTasks(fallbackTasks = []) {
    if (API_CONFIG.useMock) {
      const existing = readJson(API_CONFIG.storageKeys.tasks, null);
      if (!existing) {
        writeJson(API_CONFIG.storageKeys.tasks, fallbackTasks);
        return [...fallbackTasks];
      }
      return existing;
    }
    return request("/tasks");
  },

  async saveTasks(tasks) {
    if (API_CONFIG.useMock) {
      writeJson(API_CONFIG.storageKeys.tasks, tasks);
      return tasks;
    }
    return request("/tasks/batch", {
      method: "PUT",
      body: JSON.stringify(tasks)
    });
  },

  // Генерация плана через ИИ (с поддержкой уточняющих вопросов и ошибок)
  async generatePlan({ prompt, clarification = "" }) {
    if (API_CONFIG.useMock) {
      await new Promise((r) => setTimeout(r, 350));
      const fullText = clarification ? `${prompt}. Уточнение: ${clarification}` : prompt;
      const lower = fullText.trim().toLowerCase();

      if (lower.includes("ошибка")) {
        return {
          status: "error",
          message: "Модель ИИ временно недоступна (симуляция ошибки)."
        };
      }

      if (lower.length < 25) {
        return {
          status: "clarify",
          questions: [
            "В какие дни и часы вы свободны для основных задач?",
            "Сколько времени планируете выделить на отдых и перерывы?"
          ]
        };
      }

      const today = new Date().toISOString().slice(0, 10);
      return {
        status: "ok",
        tasks: [
          {
            id: String(Date.now() + 1),
            title: "Учёба / основные занятия",
            date: today,
            start: "10:00",
            end: "13:00",
            note: "Сгенерировано на основе описания",
            done: false
          },
          {
            id: String(Date.now() + 2),
            title: "Работа над проектом SPAI",
            date: today,
            start: "14:00",
            end: "16:00",
            note: "Фокус-блок из плана ИИ",
            done: false
          },
          {
            id: String(Date.now() + 3),
            title: "Тренировка / отдых",
            date: today,
            start: "18:00",
            end: "19:30",
            note: "",
            done: false
          }
        ]
      };
    }

    return request("/plans/generate", {
      method: "POST",
      body: JSON.stringify({ prompt, clarification })
    });
  },

  // История планов и выполненных задач
  async getHistoryPlans(fallbackPlans = []) {
    if (API_CONFIG.useMock) {
      const existing = readJson(API_CONFIG.storageKeys.history, null);
      if (!existing) {
        writeJson(API_CONFIG.storageKeys.history, fallbackPlans);
        return [...fallbackPlans];
      }
      return existing;
    }
    return request("/plans/history");
  },

  async archivePlan(plan) {
    if (API_CONFIG.useMock) {
      const current = readJson(API_CONFIG.storageKeys.history, []);
      const updated = [plan, ...current];
      writeJson(API_CONFIG.storageKeys.history, updated);
      return updated;
    }
    return request("/plans/archive", {
      method: "POST",
      body: JSON.stringify(plan)
    });
  }
};