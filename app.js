const STORAGE_KEY = "dark-triad-flow-v2";

const sampleData = createSampleData();
const state = loadState();

const elements = {
  overviewCards: document.querySelector("#overviewCards"),
  taskForm: document.querySelector("#taskForm"),
  taskTitle: document.querySelector("#taskTitle"),
  taskNotes: document.querySelector("#taskNotes"),
  taskCategory: document.querySelector("#taskCategory"),
  taskDuration: document.querySelector("#taskDuration"),
  taskImpact: document.querySelector("#taskImpact"),
  taskEffort: document.querySelector("#taskEffort"),
  taskEnergy: document.querySelector("#taskEnergy"),
  taskDueDate: document.querySelector("#taskDueDate"),
  taskScheduledDate: document.querySelector("#taskScheduledDate"),
  brainDumpInput: document.querySelector("#brainDumpInput"),
  brainDumpBtn: document.querySelector("#brainDumpBtn"),
  selectedDateInput: document.querySelector("#selectedDateInput"),
  minutesAvailable: document.querySelector("#minutesAvailable"),
  minutesAvailableValue: document.querySelector("#minutesAvailableValue"),
  energyLevel: document.querySelector("#energyLevel"),
  planningMode: document.querySelector("#planningMode"),
  todayBtn: document.querySelector("#todayBtn"),
  loadSampleBtn: document.querySelector("#loadSampleBtn"),
  prevWeekBtn: document.querySelector("#prevWeekBtn"),
  nextWeekBtn: document.querySelector("#nextWeekBtn"),
  weekGrid: document.querySelector("#weekGrid"),
  selectedDayHeading: document.querySelector("#selectedDayHeading"),
  selectedDaySummary: document.querySelector("#selectedDaySummary"),
  selectedDaySchedule: document.querySelector("#selectedDaySchedule"),
  planNarrative: document.querySelector("#planNarrative"),
  priorityStack: document.querySelector("#priorityStack"),
  noteMeta: document.querySelector("#noteMeta"),
  dayNoteInput: document.querySelector("#dayNoteInput"),
  taskList: document.querySelector("#taskList"),
  clearDoneBtn: document.querySelector("#clearDoneBtn"),
  clearAllBtn: document.querySelector("#clearAllBtn"),
  taskItemTemplate: document.querySelector("#taskItemTemplate")
};

bindEvents();
syncControlsFromState();
render();

function bindEvents() {
  if (elements.taskForm) {
    elements.taskForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const title = elements.taskTitle.value.trim();
      if (!title) {
        elements.taskTitle.focus();
        return;
      }

      state.tasks.unshift({
        id: crypto.randomUUID(),
        title,
        notes: elements.taskNotes.value.trim(),
        category: elements.taskCategory.value,
        duration: clampNumber(Number(elements.taskDuration.value), 5, 480, 30),
        impact: clampNumber(Number(elements.taskImpact.value), 1, 5, 3),
        effort: clampNumber(Number(elements.taskEffort.value), 1, 5, 3),
        energy: normalizeEnergy(elements.taskEnergy.value),
        dueDate: elements.taskDueDate.value,
        scheduledDate: elements.taskScheduledDate.value || state.settings.selectedDate,
        done: false,
        createdAt: Date.now()
      });

      resetTaskForm();
      persistAndRender();
    });
  }

  if (elements.brainDumpBtn && elements.brainDumpInput) {
    elements.brainDumpBtn.addEventListener("click", () => {
      const lines = elements.brainDumpInput.value
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      if (!lines.length) {
        elements.brainDumpInput.focus();
        return;
      }

      const createdTasks = lines.map((title, index) => ({
        id: crypto.randomUUID(),
        title,
        notes: "",
        category: index % 2 === 0 ? "Life admin" : "Work",
        duration: 20,
        impact: 3,
        effort: 2,
        energy: "low",
        dueDate: "",
        scheduledDate: state.settings.selectedDate,
        done: false,
        createdAt: Date.now() + index
      }));

      state.tasks = [...createdTasks.reverse(), ...state.tasks];
      elements.brainDumpInput.value = "";
      persistAndRender();
    });
  }

  if (elements.selectedDateInput) {
    elements.selectedDateInput.addEventListener("change", () => {
      state.settings.selectedDate = normalizeDate(elements.selectedDateInput.value);
      syncControlsFromState();
      persistAndRender();
    });
  }

  if (elements.minutesAvailable) {
    elements.minutesAvailable.addEventListener("input", () => {
      state.settings.minutesAvailable = clampNumber(Number(elements.minutesAvailable.value), 30, 540, 180);
      updateMinutesLabel();
      persistAndRender();
    });
  }

  if (elements.energyLevel) {
    elements.energyLevel.addEventListener("change", () => {
      state.settings.energyLevel = normalizeEnergy(elements.energyLevel.value);
      persistAndRender();
    });
  }

  if (elements.planningMode) {
    elements.planningMode.addEventListener("change", () => {
      state.settings.planningMode = normalizeMode(elements.planningMode.value);
      persistAndRender();
    });
  }

  if (elements.todayBtn) {
    elements.todayBtn.addEventListener("click", () => {
      state.settings.selectedDate = todayString();
      syncControlsFromState();
      persistAndRender();
    });
  }

  if (elements.prevWeekBtn) {
    elements.prevWeekBtn.addEventListener("click", () => {
      state.settings.selectedDate = shiftDate(state.settings.selectedDate, -7);
      syncControlsFromState();
      persistAndRender();
    });
  }

  if (elements.nextWeekBtn) {
    elements.nextWeekBtn.addEventListener("click", () => {
      state.settings.selectedDate = shiftDate(state.settings.selectedDate, 7);
      syncControlsFromState();
      persistAndRender();
    });
  }

  if (elements.loadSampleBtn) {
    elements.loadSampleBtn.addEventListener("click", () => {
      state.tasks = [...sampleData.tasks.map(cloneTask), ...state.tasks];
      state.dayNotes = { ...sampleData.dayNotes, ...state.dayNotes };
      persistAndRender();
    });
  }

  if (elements.dayNoteInput) {
    elements.dayNoteInput.addEventListener("input", () => {
      const value = elements.dayNoteInput.value;
      if (value.trim()) {
        state.dayNotes[state.settings.selectedDate] = value;
      } else {
        delete state.dayNotes[state.settings.selectedDate];
      }

      saveState();
      const rankedTasks = rankTasks(state.tasks, state.settings);
      renderOverview(rankedTasks);
      renderCalendar(rankedTasks);
      renderSelectedDay(rankedTasks);
      renderPriority(rankedTasks);
      renderNoteMeta();
    });
  }

  if (elements.weekGrid) {
    elements.weekGrid.addEventListener("click", (event) => {
      const button = event.target.closest(".week-day");
      if (!button) {
        return;
      }

      state.settings.selectedDate = button.dataset.date;
      syncControlsFromState();
      persistAndRender();
    });
  }

  if (elements.clearDoneBtn) {
    elements.clearDoneBtn.addEventListener("click", () => {
      state.tasks = state.tasks.filter((task) => !task.done);
      persistAndRender();
    });
  }

  if (elements.clearAllBtn) {
    elements.clearAllBtn.addEventListener("click", () => {
      state.tasks = [];
      state.dayNotes = {};
      persistAndRender();
    });
  }

  if (elements.taskList) {
    elements.taskList.addEventListener("change", (event) => {
      const toggle = event.target.closest(".task-toggle");
      if (!toggle) {
        return;
      }

      const task = findTaskFromEventTarget(toggle);
      if (!task) {
        return;
      }

      task.done = toggle.checked;
      persistAndRender();
    });

    elements.taskList.addEventListener("click", (event) => {
      const task = findTaskFromEventTarget(event.target);
      if (!task) {
        return;
      }

      if (event.target.closest(".delete-task")) {
        state.tasks = state.tasks.filter((entry) => entry.id !== task.id);
        persistAndRender();
        return;
      }

      if (event.target.closest(".schedule-task")) {
        task.scheduledDate = state.settings.selectedDate;
        persistAndRender();
        return;
      }

      if (event.target.closest(".unschedule-task")) {
        task.scheduledDate = "";
        persistAndRender();
      }
    });
  }
}

function render() {
  const rankedTasks = rankTasks(state.tasks, state.settings);
  renderOverview(rankedTasks);
  renderCalendar(rankedTasks);
  renderSelectedDay(rankedTasks);
  renderPriority(rankedTasks);
  renderTaskList(rankedTasks);
  renderDayNote();
}

function renderOverview(rankedTasks) {
  if (!elements.overviewCards) {
    return;
  }

  const selectedTasks = getTasksForDate(rankedTasks, state.settings.selectedDate).filter((task) => !task.done);
  const openTasks = rankedTasks.filter((task) => !task.done);
  const noteWords = countWords(state.dayNotes[state.settings.selectedDate] || "");
  const scheduledMinutes = sumMinutes(selectedTasks);
  const dueSoon = openTasks.filter((task) => task.daysUntilDue !== null && task.daysUntilDue <= 3).length;
  const cards = [
    {
      label: "Calendar Load",
      value: `${scheduledMinutes} / ${state.settings.minutesAvailable} min`,
      subtext: scheduledMinutes > state.settings.minutesAvailable ? "Selected day is over capacity" : "Selected day still has breathing room"
    },
    {
      label: "Task Field",
      value: openTasks.length,
      subtext: dueSoon ? `${dueSoon} items due within 3 days` : "No immediate deadline pileup"
    },
    {
      label: "Note Signal",
      value: noteWords ? `${noteWords} words` : "Quiet",
      subtext: noteWords ? "Your selected day has context attached" : "No note captured for this date yet"
    }
  ];

  elements.overviewCards.innerHTML = cards.map((card) => `
    <article class="overview-card">
      <p class="overview-label">${card.label}</p>
      <p class="overview-value">${card.value}</p>
      <p class="overview-subtext">${card.subtext}</p>
    </article>
  `).join("");
}

function renderCalendar(rankedTasks) {
  if (!elements.weekGrid) {
    return;
  }

  const weekDates = getWeekDates(state.settings.selectedDate);
  elements.weekGrid.innerHTML = weekDates.map((dateString) => {
    const tasks = getTasksForDate(rankedTasks, dateString);
    const openTasks = tasks.filter((task) => !task.done);
    const minutes = sumMinutes(openTasks);
    const noteExists = Boolean((state.dayNotes[dateString] || "").trim());
    const dueCount = rankedTasks.filter((task) => !task.done && task.dueDate === dateString).length;
    const classes = [
      "week-day",
      dateString === state.settings.selectedDate ? "active" : "",
      dateString === todayString() ? "today" : "",
      minutes > state.settings.minutesAvailable ? "overbooked" : ""
    ].filter(Boolean).join(" ");

    return `
      <button type="button" class="${classes}" data-date="${dateString}">
        <div class="week-day-head">
          <p class="week-day-name">${formatWeekday(dateString)}</p>
          <span class="slot-pill">${openTasks.length} tasks</span>
        </div>
        <p class="week-day-date">${formatDayNumber(dateString)}</p>
        <p class="week-day-stat">${minutes} min scheduled</p>
        <p class="week-day-stat">${dueCount} due that day</p>
        ${noteExists ? '<span class="week-day-tag">Note attached</span>' : ""}
      </button>
    `;
  }).join("");
}

function renderSelectedDay(rankedTasks) {
  if (!elements.selectedDayHeading || !elements.selectedDaySummary || !elements.selectedDaySchedule) {
    return;
  }

  const selectedTasks = getTasksForDate(rankedTasks, state.settings.selectedDate)
    .sort((a, b) => {
      if (a.done !== b.done) {
        return a.done ? 1 : -1;
      }

      return b.compositeScore - a.compositeScore;
    });
  const scheduledMinutes = sumMinutes(selectedTasks.filter((task) => !task.done));
  const remaining = Math.max(state.settings.minutesAvailable - scheduledMinutes, 0);

  elements.selectedDayHeading.textContent = formatLongDate(state.settings.selectedDate);
  elements.selectedDaySummary.textContent =
    `${scheduledMinutes} min scheduled | ${remaining} min left | ${selectedTasks.length} slotted`;

  if (!selectedTasks.length) {
    elements.selectedDaySchedule.className = "stack-list empty-state";
    elements.selectedDaySchedule.textContent = "No tasks scheduled for this day yet.";
    return;
  }

  elements.selectedDaySchedule.className = "stack-list";
  elements.selectedDaySchedule.innerHTML = selectedTasks.map((task) => `
    <div class="stack-item">
      <div class="stack-copy">
        <strong>${escapeHtml(task.title)}</strong>
        <span>${escapeHtml(scheduleSubtitle(task))}</span>
      </div>
      <span class="score-pill">${Math.round(task.compositeScore)}</span>
    </div>
  `).join("");
}

function renderPriority(rankedTasks) {
  if (!elements.planNarrative || !elements.priorityStack) {
    return;
  }

  const openTasks = rankedTasks.filter((task) => !task.done);
  const selectedDate = state.settings.selectedDate;
  const relevantTasks = openTasks.filter((task) => task.scheduledDate === selectedDate || !task.scheduledDate);
  const stack = (relevantTasks.length ? relevantTasks : openTasks).slice(0, 4);
  const topTask = stack[0] || null;

  if (!topTask) {
    elements.planNarrative.textContent = "No active tasks to rank.";
    elements.priorityStack.className = "stack-list empty-state";
    elements.priorityStack.textContent = "No active tasks to rank yet.";
    return;
  }

  elements.planNarrative.textContent =
    `${capitalize(state.settings.planningMode)} mode with ${state.settings.energyLevel} energy points to "${topTask.title}" first.`;

  elements.priorityStack.className = "stack-list";
  elements.priorityStack.innerHTML = stack.map((task) => `
    <div class="stack-item">
      <div class="stack-copy">
        <strong>${escapeHtml(task.title)}</strong>
        <span>${escapeHtml(prioritySubtitle(task))}</span>
      </div>
      <span class="score-pill">${Math.round(task.compositeScore)}</span>
    </div>
  `).join("");
}

function renderTaskList(rankedTasks) {
  if (!elements.taskList || !elements.taskItemTemplate) {
    return;
  }

  if (!rankedTasks.length) {
    elements.taskList.className = "task-list empty-state";
    elements.taskList.textContent = "Your board is empty. Add a task, drop a quick brain dump, or load the sample data.";
    return;
  }

  elements.taskList.className = "task-list";
  elements.taskList.innerHTML = "";

  rankedTasks.forEach((task) => {
    const node = elements.taskItemTemplate.content.firstElementChild.cloneNode(true);
    const scheduleButton = node.querySelector(".schedule-task");
    const unscheduleButton = node.querySelector(".unschedule-task");

    node.dataset.id = task.id;
    node.classList.toggle("done", task.done);
    node.querySelector(".task-toggle").checked = task.done;
    node.querySelector(".task-title").textContent = task.title;
    node.querySelector(".task-notes").textContent = task.notes;
    node.querySelector(".task-score").textContent = `${Math.round(task.compositeScore)} fit`;

    const meta = [
      renderMetaChip(task.category),
      renderMetaChip(`${task.duration} min`),
      renderMetaChip(`impact ${task.impact}`),
      renderMetaChip(`effort ${task.effort}`),
      renderMetaChip(`${capitalize(task.energy)} energy`, task.energyFitScore > 95 ? "good" : "")
    ];

    if (task.scheduledDate) {
      meta.push(renderMetaChip(`slot ${formatShortDate(task.scheduledDate)}`, "slot"));
    }

    if (task.dueDate) {
      meta.push(renderMetaChip(formatDueLabel(task.daysUntilDue), task.daysUntilDue !== null && task.daysUntilDue <= 1 ? "warn" : ""));
    }

    node.querySelector(".task-meta").innerHTML = meta.join("");

    scheduleButton.textContent = task.scheduledDate === state.settings.selectedDate ? "On Selected Day" : "Send to Selected Day";
    scheduleButton.disabled = task.scheduledDate === state.settings.selectedDate;
    unscheduleButton.disabled = !task.scheduledDate;

    elements.taskList.appendChild(node);
  });
}

function renderDayNote() {
  if (!elements.dayNoteInput) {
    return;
  }

  const note = state.dayNotes[state.settings.selectedDate] || "";
  elements.dayNoteInput.value = note;
  renderNoteMeta();
}

function renderNoteMeta() {
  if (!elements.noteMeta) {
    return;
  }

  const note = state.dayNotes[state.settings.selectedDate] || "";
  const words = countWords(note);
  elements.noteMeta.textContent = words ? `${words} words saved for this date` : "Autosaves as you type";
}

function persistAndRender() {
  saveState();
  render();
}

function rankTasks(tasks, settings) {
  return tasks
    .map((task) => {
      const normalizedTask = normalizeTask(task);
      const daysUntilDue = getDaysUntilDue(normalizedTask.dueDate);
      const urgencyScore = scoreUrgency(daysUntilDue);
      const timeFitScore = scoreTimeFit(normalizedTask.duration, settings.minutesAvailable);
      const energyFitScore = scoreEnergyFit(normalizedTask.energy, settings.energyLevel);
      const selectedDayScore = scoreSelectedDay(normalizedTask.scheduledDate, settings.selectedDate);
      const impactScore = (normalizedTask.impact / 5) * 100;
      const easeScore = ((6 - normalizedTask.effort) / 5) * 100;
      const modeAdjustment = scoreModeAdjustment(normalizedTask, settings.planningMode, daysUntilDue);
      const compositeScore =
        impactScore * 0.28 +
        urgencyScore * 0.24 +
        timeFitScore * 0.16 +
        energyFitScore * 0.15 +
        easeScore * 0.08 +
        selectedDayScore +
        modeAdjustment;

      return {
        ...normalizedTask,
        daysUntilDue,
        urgencyScore,
        timeFitScore,
        energyFitScore,
        compositeScore: Math.max(0, Math.min(100, compositeScore))
      };
    })
    .sort((a, b) => {
      if (a.done !== b.done) {
        return a.done ? 1 : -1;
      }

      if (a.scheduledDate === settings.selectedDate && b.scheduledDate !== settings.selectedDate) {
        return -1;
      }

      if (b.scheduledDate === settings.selectedDate && a.scheduledDate !== settings.selectedDate) {
        return 1;
      }

      return b.compositeScore - a.compositeScore;
    });
}

function normalizeTask(task) {
  return {
    id: task.id || crypto.randomUUID(),
    title: String(task.title || "").trim(),
    notes: String(task.notes || "").trim(),
    category: task.category || "Personal",
    duration: clampNumber(Number(task.duration), 5, 480, 30),
    impact: clampNumber(Number(task.impact), 1, 5, 3),
    effort: clampNumber(Number(task.effort), 1, 5, 3),
    energy: normalizeEnergy(task.energy),
    dueDate: normalizeDate(task.dueDate, ""),
    scheduledDate: normalizeDate(task.scheduledDate, ""),
    done: Boolean(task.done),
    createdAt: Number.isFinite(task.createdAt) ? task.createdAt : Date.now()
  };
}

function getTasksForDate(tasks, dateString) {
  return tasks.filter((task) => task.scheduledDate === dateString);
}

function scoreUrgency(daysUntilDue) {
  if (daysUntilDue === null) {
    return 34;
  }
  if (daysUntilDue < 0) {
    return 100;
  }
  if (daysUntilDue === 0) {
    return 96;
  }
  if (daysUntilDue === 1) {
    return 88;
  }
  if (daysUntilDue <= 3) {
    return 74;
  }
  if (daysUntilDue <= 7) {
    return 58;
  }
  if (daysUntilDue <= 14) {
    return 44;
  }
  return 26;
}

function scoreTimeFit(taskMinutes, availableMinutes) {
  if (taskMinutes <= availableMinutes) {
    return 100 - (taskMinutes / availableMinutes) * 38;
  }

  const overflow = taskMinutes - availableMinutes;
  return Math.max(18, 66 - overflow / 3);
}

function scoreEnergyFit(requiredEnergy, currentEnergy) {
  const levels = { low: 1, medium: 2, high: 3 };
  const gap = levels[currentEnergy] - levels[requiredEnergy];

  if (gap >= 0) {
    return 100 - gap * 6;
  }

  return Math.max(28, 84 + gap * 22);
}

function scoreSelectedDay(scheduledDate, selectedDate) {
  if (!scheduledDate) {
    return 0;
  }

  return scheduledDate === selectedDate ? 11 : -5;
}

function scoreModeAdjustment(task, mode, daysUntilDue) {
  if (mode === "deadline") {
    return daysUntilDue !== null && daysUntilDue <= 3 ? 10 : -2;
  }

  if (mode === "focus") {
    return task.impact >= 4 && task.duration >= 40 ? 8 : task.duration <= 15 ? -4 : 0;
  }

  if (mode === "recovery") {
    return task.energy === "low" ? 9 : task.energy === "high" ? -8 : 1;
  }

  return 0;
}

function scheduleSubtitle(task) {
  const parts = [`${task.duration} min`, task.category, `${capitalize(task.energy)} energy`];

  if (task.dueDate) {
    parts.push(formatDueLabel(task.daysUntilDue));
  }

  return parts.join(" | ");
}

function prioritySubtitle(task) {
  const parts = [
    task.scheduledDate === state.settings.selectedDate ? "slotted today" : "unslotted",
    `${task.duration} min`,
    task.category
  ];

  if (task.dueDate) {
    parts.push(formatDueLabel(task.daysUntilDue));
  }

  return parts.join(" | ");
}

function formatDueLabel(daysUntilDue) {
  if (daysUntilDue === null) {
    return "No due date";
  }
  if (daysUntilDue < 0) {
    return `${Math.abs(daysUntilDue)}d overdue`;
  }
  if (daysUntilDue === 0) {
    return "Due today";
  }
  if (daysUntilDue === 1) {
    return "Due tomorrow";
  }
  return `Due in ${daysUntilDue}d`;
}

function renderMetaChip(text, variant = "") {
  const safeVariant = variant ? ` ${variant}` : "";
  return `<span class="meta-chip${safeVariant}">${escapeHtml(text)}</span>`;
}

function findTaskFromEventTarget(target) {
  const taskId = target.closest(".task-item")?.dataset.id;
  if (!taskId) {
    return null;
  }

  return state.tasks.find((task) => task.id === taskId) || null;
}

function resetTaskForm() {
  if (!elements.taskForm) {
    return;
  }

  elements.taskForm.reset();
  elements.taskCategory.value = "Work";
  elements.taskDuration.value = "30";
  elements.taskImpact.value = "3";
  elements.taskEffort.value = "3";
  elements.taskEnergy.value = "medium";

  if (elements.taskScheduledDate) {
    elements.taskScheduledDate.value = state.settings.selectedDate;
  }
}

function syncControlsFromState() {
  if (elements.selectedDateInput) {
    elements.selectedDateInput.value = state.settings.selectedDate;
  }

  if (elements.taskScheduledDate) {
    elements.taskScheduledDate.value = state.settings.selectedDate;
  }

  if (elements.minutesAvailable) {
    elements.minutesAvailable.value = String(state.settings.minutesAvailable);
  }

  if (elements.energyLevel) {
    elements.energyLevel.value = state.settings.energyLevel;
  }

  if (elements.planningMode) {
    elements.planningMode.value = state.settings.planningMode;
  }

  updateMinutesLabel();
}

function updateMinutesLabel() {
  if (!elements.minutesAvailableValue) {
    return;
  }

  elements.minutesAvailableValue.textContent = `${state.settings.minutesAvailable} min`;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return createDefaultState();
    }

    const parsed = JSON.parse(raw);
    return {
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks.map(normalizeTask) : [],
      dayNotes: isPlainObject(parsed.dayNotes) ? normalizeDayNotes(parsed.dayNotes) : {},
      settings: {
        selectedDate: normalizeDate(parsed.settings?.selectedDate, todayString()),
        minutesAvailable: clampNumber(Number(parsed.settings?.minutesAvailable), 30, 540, 180),
        energyLevel: normalizeEnergy(parsed.settings?.energyLevel),
        planningMode: normalizeMode(parsed.settings?.planningMode)
      }
    };
  } catch (error) {
    console.warn("Failed to load Dark Triad Flow state", error);
    return createDefaultState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function createDefaultState() {
  return {
    tasks: [],
    dayNotes: {},
    settings: {
      selectedDate: todayString(),
      minutesAvailable: 180,
      energyLevel: "medium",
      planningMode: "balanced"
    }
  };
}

function normalizeDayNotes(dayNotes) {
  const normalized = {};

  for (const [dateString, value] of Object.entries(dayNotes)) {
    const safeDate = normalizeDate(dateString, "");
    if (!safeDate) {
      continue;
    }

    normalized[safeDate] = String(value || "");
  }

  return normalized;
}

function normalizeEnergy(value) {
  return ["low", "medium", "high"].includes(value) ? value : "medium";
}

function normalizeMode(value) {
  return ["balanced", "deadline", "focus", "recovery"].includes(value) ? value : "balanced";
}

function normalizeDate(value, fallback = todayString()) {
  if (!value) {
    return fallback;
  }

  const isIsoDate = /^\d{4}-\d{2}-\d{2}$/.test(value);
  return isIsoDate ? value : fallback;
}

function sumMinutes(tasks) {
  return tasks.reduce((sum, task) => sum + task.duration, 0);
}

function countWords(text) {
  const trimmed = String(text || "").trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

function getDaysUntilDue(dateString) {
  if (!dateString) {
    return null;
  }

  const today = startOfDay(new Date());
  const due = new Date(`${dateString}T00:00:00`);
  return Math.round((due - today) / 86400000);
}

function getWeekDates(centerDate) {
  const start = getStartOfWeek(centerDate);
  return Array.from({ length: 7 }, (_, index) => shiftDate(start, index));
}

function getStartOfWeek(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return formatLocalDate(date);
}

function shiftDate(dateString, amount) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + amount);
  return formatLocalDate(date);
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function todayString() {
  return formatLocalDate(new Date());
}

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatWeekday(dateString) {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString(undefined, { weekday: "short" });
}

function formatDayNumber(dateString) {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatShortDate(dateString) {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatLongDate(dateString) {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric"
  });
}

function clampNumber(value, min, max, fallback) {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, value));
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cloneTask(task) {
  return {
    ...normalizeTask(task),
    id: crypto.randomUUID(),
    createdAt: Date.now() + Math.floor(Math.random() * 1000)
  };
}

function createSampleData() {
  const today = todayString();
  const tomorrow = shiftDate(today, 1);
  const plusTwo = shiftDate(today, 2);
  const plusThree = shiftDate(today, 3);

  return {
    tasks: [
      {
        id: crypto.randomUUID(),
        title: "Lock the client kickoff agenda",
        notes: "Keep it to one page and send before noon.",
        category: "Work",
        duration: 45,
        impact: 5,
        effort: 3,
        energy: "high",
        dueDate: tomorrow,
        scheduledDate: today,
        done: false,
        createdAt: Date.now()
      },
      {
        id: crypto.randomUUID(),
        title: "Submit the reimbursement claim",
        notes: "Attach receipts and reference the last email thread.",
        category: "Money",
        duration: 20,
        impact: 4,
        effort: 2,
        energy: "low",
        dueDate: plusTwo,
        scheduledDate: today,
        done: false,
        createdAt: Date.now()
      },
      {
        id: crypto.randomUUID(),
        title: "Plan next week's workouts",
        notes: "",
        category: "Health",
        duration: 25,
        impact: 3,
        effort: 2,
        energy: "low",
        dueDate: plusThree,
        scheduledDate: tomorrow,
        done: false,
        createdAt: Date.now()
      },
      {
        id: crypto.randomUUID(),
        title: "Outline the launch email",
        notes: "Only the skeleton. Subject lines can wait.",
        category: "Work",
        duration: 50,
        impact: 5,
        effort: 4,
        energy: "high",
        dueDate: plusTwo,
        scheduledDate: plusTwo,
        done: false,
        createdAt: Date.now()
      },
      {
        id: crypto.randomUUID(),
        title: "Replace air filter",
        notes: "",
        category: "Home",
        duration: 15,
        impact: 2,
        effort: 1,
        energy: "low",
        dueDate: "",
        scheduledDate: tomorrow,
        done: false,
        createdAt: Date.now()
      }
    ],
    dayNotes: {
      [today]: "Protect the morning for the kickoff agenda. Keep meetings shallow and leave 30 minutes for inbox cleanup.",
      [tomorrow]: "Errand-friendly day. Batch the low-energy items together after lunch."
    }
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
