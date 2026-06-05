/* =====================================================
   TASKLY — APP LOGIC
   All state and interactions managed in vanilla JS
   ===================================================== */

'use strict';

/* ── STATE ── */
let tasks = [];          // [{ id, text, completed, createdAt }]
let currentFilter = 'all'; // 'all' | 'active' | 'completed'
let toastTimer = null;

/* ── DOM REFS ── */
const taskInput        = document.getElementById('task-input');
const addTaskBtn       = document.getElementById('add-task-btn');
const taskList         = document.getElementById('task-list');
const emptyState       = document.getElementById('empty-state');
const emptyTitle       = document.getElementById('empty-title');
const emptySub         = document.getElementById('empty-sub');
const inputHint        = document.getElementById('input-hint');
const toast            = document.getElementById('toast');
const filterBtns       = document.querySelectorAll('.filter-btn[data-filter]');
const clearCompletedBtn = document.getElementById('clear-completed-btn');

const countTotal       = document.getElementById('count-total');
const countCompleted   = document.getElementById('count-completed');
const countUncompleted = document.getElementById('count-uncompleted');
const progressFill     = document.getElementById('progress-fill');
const progressPct      = document.getElementById('progress-pct');
const progressTrack    = document.getElementById('progress-track');
const footerYear       = document.getElementById('footer-year');

/* ── INIT ── */
function init() {
  footerYear.textContent = new Date().getFullYear();
  renderAll();
  taskInput.focus();
}

/* ── GENERATE ID ── */
function generateId() {
  return `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/* ── FORMAT TIME ── */
function formatTime(date) {
  const now  = new Date();
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60)  return 'Just now';
  if (diff < 3600) {
    const m = Math.floor(diff / 60);
    return `${m}m ago`;
  }
  if (diff < 86400) {
    const h = Math.floor(diff / 3600);
    return `${h}h ago`;
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/* ── ADD TASK ── */
function addTask() {
  const raw  = taskInput.value;
  const text = raw.trim();

  // Validation
  if (!text) {
    shakeInput();
    showHint('Please enter a task description.');
    return;
  }

  if (text.length > 200) {
    shakeInput();
    showHint('Task is too long (max 200 characters).');
    return;
  }

  // Duplicate check (case-insensitive)
  const isDuplicate = tasks.some(
    t => t.text.toLowerCase() === text.toLowerCase()
  );
  if (isDuplicate) {
    shakeInput();
    showHint('This task already exists.');
    return;
  }

  clearHint();

  const newTask = {
    id:        generateId(),
    text,
    completed: false,
    createdAt: new Date(),
  };

  tasks.unshift(newTask);
  taskInput.value = '';
  taskInput.focus();

  // If we're on a filter that wouldn't show the new item, switch to All
  if (currentFilter === 'completed') {
    setFilter('all');
  }

  renderAll();
  showToast('✦ Task added!');
}

/* ── TOGGLE TASK ── */
function toggleTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  task.completed = !task.completed;
  renderAll();

  showToast(task.completed ? '✓ Marked as done!' : '↩ Marked as active!');
}

/* ── DELETE TASK ── */
function deleteTask(id) {
  const index = tasks.findIndex(t => t.id === id);
  if (index === -1) return;

  // Animate out the DOM element before removing from state
  const el = document.getElementById(id);
  if (el) {
    el.classList.add('removing');
    el.addEventListener('animationend', () => {
      tasks.splice(index, 1);
      renderAll();
    }, { once: true });
  } else {
    tasks.splice(index, 1);
    renderAll();
  }

  showToast('🗑 Task removed.');
}

/* ── CLEAR COMPLETED ── */
function clearCompleted() {
  const completedCount = tasks.filter(t => t.completed).length;
  if (completedCount === 0) {
    showToast('No completed tasks to clear.');
    return;
  }

  // Animate each completed item out
  const completedEls = taskList.querySelectorAll('.task-item.completed');
  completedEls.forEach(el => el.classList.add('removing'));

  const delay = completedEls.length > 0 ? 280 : 0;
  setTimeout(() => {
    tasks = tasks.filter(t => !t.completed);
    if (currentFilter === 'completed') setFilter('all');
    renderAll();
    showToast(`🗑 Cleared ${completedCount} completed task${completedCount > 1 ? 's' : ''}.`);
  }, delay);
}

/* ── FILTER ── */
function setFilter(filter) {
  currentFilter = filter;
  filterBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
  });
  renderTaskList();
  updateEmptyState();
}

/* ── RENDER ALL ── */
function renderAll() {
  updateKPIs();
  updateProgress();
  renderTaskList();
  updateEmptyState();
}

/* ── UPDATE KPIs ── */
function updateKPIs() {
  const total       = tasks.length;
  const completed   = tasks.filter(t => t.completed).length;
  const uncompleted = total - completed;

  animateCount(countTotal,       total);
  animateCount(countCompleted,   completed);
  animateCount(countUncompleted, uncompleted);
}

function animateCount(el, newVal) {
  const oldVal = parseInt(el.textContent, 10) || 0;
  if (oldVal === newVal) return;

  el.textContent = newVal;

  // Pop the parent kpi-card
  const card = el.closest('.kpi-card');
  if (card) {
    card.classList.remove('kpi-pop');
    // Force reflow
    void card.offsetWidth;
    card.classList.add('kpi-pop');
    card.addEventListener('animationend', () => card.classList.remove('kpi-pop'), { once: true });
  }
}

/* ── UPDATE PROGRESS ── */
function updateProgress() {
  const total     = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const pct       = total === 0 ? 0 : Math.round((completed / total) * 100);

  progressFill.style.width = `${pct}%`;
  progressPct.textContent  = `${pct}%`;
  progressTrack.setAttribute('aria-valuenow', pct);

  // Color the fill based on progress
  if (pct === 100 && total > 0) {
    progressFill.style.background = 'linear-gradient(90deg, #00B894 0%, #00CBA7 100%)';
  } else {
    progressFill.style.background = 'linear-gradient(90deg, #6C5CE7 0%, #9B87F5 100%)';
  }
}

/* ── RENDER TASK LIST ── */
function renderTaskList() {
  // Get filtered tasks
  const filtered = getFilteredTasks();

  // Preserve existing DOM nodes for items already rendered (avoid flicker)
  const existingIds = new Set(
    [...taskList.querySelectorAll('.task-item:not(.removing)')].map(el => el.id)
  );
  const newIds = new Set(filtered.map(t => t.id));

  // Remove items no longer in view (due to filter change)
  existingIds.forEach(id => {
    if (!newIds.has(id)) {
      const el = document.getElementById(id);
      if (el) el.remove();
    }
  });

  // Render or update each task in filtered order
  filtered.forEach((task, index) => {
    const existing = document.getElementById(task.id);
    if (existing && !existing.classList.contains('removing')) {
      // Update in-place (completed state might have changed)
      updateTaskElement(existing, task);
      // Ensure order
      taskList.appendChild(existing);
    } else if (!existing) {
      const el = createTaskElement(task, index);
      taskList.appendChild(el);
    }
  });
}

/* ── CREATE TASK ELEMENT ── */
function createTaskElement(task) {
  const li = document.createElement('li');
  li.className = `task-item${task.completed ? ' completed' : ''}`;
  li.id        = task.id;
  li.setAttribute('role', 'listitem');

  li.innerHTML = `
    <button
      class="task-checkbox${task.completed ? ' checked' : ''}"
      aria-label="${task.completed ? 'Mark as active' : 'Mark as done'}: ${escapeHtml(task.text)}"
      data-id="${task.id}"
    >
      <span class="check-icon" aria-hidden="true">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </span>
    </button>

    <span class="task-text">${escapeHtml(task.text)}</span>

    <span class="task-meta" aria-label="Created ${formatTime(task.createdAt)}">
      ${formatTime(task.createdAt)}
    </span>

    <button
      class="task-delete"
      aria-label="Delete task: ${escapeHtml(task.text)}"
      data-id="${task.id}"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6"/>
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
        <path d="M10 11v6"/>
        <path d="M14 11v6"/>
        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
      </svg>
    </button>
  `;

  // Events
  li.querySelector('.task-checkbox').addEventListener('click', () => toggleTask(task.id));
  li.querySelector('.task-delete').addEventListener('click', () => deleteTask(task.id));

  return li;
}

/* ── UPDATE TASK ELEMENT IN-PLACE ── */
function updateTaskElement(el, task) {
  el.classList.toggle('completed', task.completed);

  const checkbox = el.querySelector('.task-checkbox');
  checkbox.classList.toggle('checked', task.completed);
  checkbox.setAttribute(
    'aria-label',
    `${task.completed ? 'Mark as active' : 'Mark as done'}: ${escapeHtml(task.text)}`
  );

  const meta = el.querySelector('.task-meta');
  if (meta) {
    meta.textContent = formatTime(task.createdAt);
    meta.setAttribute('aria-label', `Created ${formatTime(task.createdAt)}`);
  }
}

/* ── EMPTY STATE ── */
function updateEmptyState() {
  const filtered = getFilteredTasks();
  const isEmpty  = filtered.length === 0;

  emptyState.style.display = isEmpty ? 'flex' : 'none';
  taskList.style.display   = isEmpty ? 'none' : 'flex';

  if (isEmpty) {
    if (tasks.length === 0) {
      emptyTitle.textContent = 'No tasks yet';
      emptySub.textContent   = 'Add your first task above to get started.';
    } else if (currentFilter === 'active') {
      emptyTitle.textContent = 'All done! 🎉';
      emptySub.textContent   = 'No active tasks — you\'re crushing it!';
    } else if (currentFilter === 'completed') {
      emptyTitle.textContent = 'Nothing completed yet';
      emptySub.textContent   = 'Complete some tasks to see them here.';
    }
  }
}

/* ── GET FILTERED TASKS ── */
function getFilteredTasks() {
  switch (currentFilter) {
    case 'active':    return tasks.filter(t => !t.completed);
    case 'completed': return tasks.filter(t =>  t.completed);
    default:          return [...tasks];
  }
}

/* ── INPUT HELPERS ── */
function shakeInput() {
  taskInput.classList.add('input-error');
  taskInput.addEventListener('input', clearHint, { once: true });
}

function showHint(msg) {
  inputHint.textContent = msg;
}

function clearHint() {
  inputHint.textContent = '';
  taskInput.classList.remove('input-error');
}

/* ── ESCAPE HTML ── */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* ── TOAST ── */
function showToast(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add('show');
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
}

/* ── EVENT LISTENERS ── */

// Add task button
addTaskBtn.addEventListener('click', addTask);

// Enter key in input
taskInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    addTask();
  }
  if (e.key === 'Escape') {
    taskInput.value = '';
    clearHint();
  }
});

// Clear hint on input
taskInput.addEventListener('input', () => {
  if (taskInput.value.trim()) clearHint();
});

// Filter buttons
filterBtns.forEach(btn => {
  btn.addEventListener('click', () => setFilter(btn.dataset.filter));
});

// Clear completed
clearCompletedBtn.addEventListener('click', clearCompleted);

// Refresh timestamps every minute
setInterval(() => {
  taskList.querySelectorAll('.task-item').forEach(el => {
    const task = tasks.find(t => t.id === el.id);
    if (task) {
      const meta = el.querySelector('.task-meta');
      if (meta) meta.textContent = formatTime(task.createdAt);
    }
  });
}, 60_000);

/* ── BOOTSTRAP ── */
init();
