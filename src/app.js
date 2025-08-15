// Vanilla JS Task Manager — external script aligned to index.html

// Storage keys
const STORE_KEY = 'tm_tasks_v1';
const THEME_KEY = 'tm_theme_v1';

// State
let tasks = loadTasks(); // array of task objects
let query = '';
let draggingId = null;
let editingId = null;

// Elements
const els = {
  board: document.getElementById('board'),
  lists: {
    'todo': document.getElementById('todo'),
    'in-progress': document.getElementById('in-progress'),
    'done': document.getElementById('done')
  },
  counts: {
    'todo': document.getElementById('count-todo'),
    'in-progress': document.getElementById('count-in-progress'),
    'done': document.getElementById('count-done')
  },
  createForm: document.getElementById('create'),
  title: document.getElementById('title'),
  due: document.getElementById('due'),
  prio: document.getElementById('prio'),
  desc: document.getElementById('desc'),
  search: document.getElementById('search'),
  themeBtn: document.getElementById('themeBtn'),
  clearAll: document.getElementById('clearAll'),
  tpl: document.getElementById('cardTpl'),
  body: document.getElementById('body'),
  // Edit dialog
  dlg: document.getElementById('editDialog'),
  editForm: document.getElementById('editForm'),
  eTitle: document.getElementById('eTitle'),
  eDue: document.getElementById('eDue'),
  ePrio: document.getElementById('ePrio'),
  eDesc: document.getElementById('eDesc'),
};

// Notification (small toast)
function notify(msg, type = 'info') {
  const n = document.createElement('div');
  n.className = 'toast';
  n.textContent = msg;
  n.style.background = type === 'success' ? '#16a34a' : type === 'error' ? '#dc2626' : '#2563eb';
  document.body.appendChild(n);
  requestAnimationFrame(() => n.classList.add('show'));
  setTimeout(() => {
    n.classList.remove('show');
    setTimeout(() => n.remove(), 250);
  }, 1800);
}

// Load/save
function loadTasks() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function saveTasks() {
  localStorage.setItem(STORE_KEY, JSON.stringify(tasks));
}

// Helpers
function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
function prioLabel(p) { return p === 'P1' ? 'High' : p === 'P3' ? 'Low' : 'Medium'; }
function formatDue(d) {
  if (!d) return '';
  try {
    const dt = new Date(d + 'T00:00:00');
    return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch { return d; }
}

// Render
function render() {
  const q = query.trim().toLowerCase();
  ['todo','in-progress','done'].forEach(status => {
    const listEl = els.lists[status];
    listEl.innerHTML = '';
    const visible = tasks.filter(t => t.status === status && (!q || t.title.toLowerCase().includes(q) || (t.desc||'').toLowerCase().includes(q)));
    els.counts[status].textContent = visible.length;
    visible.forEach(t => listEl.appendChild(cardFor(t)));
  });
}

function cardFor(task) {
  const node = els.tpl.content.firstElementChild.cloneNode(true);
  node.dataset.id = task.id;
  node.querySelector('.title').textContent = task.title;
  const descEl = node.querySelector('.desc');
  if (task.desc && task.desc.trim()) { descEl.textContent = task.desc; }
  else { descEl.remove(); }
  const pr = node.querySelector('.priority');
  pr.textContent = prioLabel(task.prio);
  pr.classList.add(task.prio);
  const due = node.querySelector('.due');
  due.textContent = task.due ? `Due ${formatDue(task.due)}` : '';

  // Actions
  node.querySelector('.del').addEventListener('click', () => {
    tasks = tasks.filter(t => t.id !== task.id);
    saveTasks();
    render();
    notify('Task deleted', 'error');
  });
  node.querySelector('.edit').addEventListener('click', () => openEdit(task.id));

  // DnD
  node.addEventListener('dragstart', (e) => {
    draggingId = task.id;
    node.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', task.id); } catch {}
  });
  node.addEventListener('dragend', () => {
    node.classList.remove('dragging');
    draggingId = null;
  });
  return node;
}

// DnD on lists
Object.entries(els.lists).forEach(([status, list]) => {
  list.addEventListener('dragover', (e) => {
    e.preventDefault();
    list.classList.add('over');
    e.dataTransfer.dropEffect = 'move';
  });
  list.addEventListener('dragleave', () => list.classList.remove('over'));
  list.addEventListener('drop', (e) => {
    e.preventDefault();
    list.classList.remove('over');
    const id = draggingId || (e.dataTransfer ? e.dataTransfer.getData('text/plain') : null);
    if (!id) return;
    const idx = tasks.findIndex(t => t.id === id);
    if (idx === -1) return;
    if (tasks[idx].status !== status) {
      tasks[idx].status = status;
      saveTasks();
      render();
      notify('Task moved', 'success');
    }
  });
});

// Create task
els.createForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const title = els.title.value.trim();
  if (!title) return;
  const task = {
    id: uid(),
    title,
    desc: els.desc.value.trim(),
    due: els.due.value || '',
    prio: els.prio.value || 'P2',
    status: 'todo',
    createdAt: Date.now(),
  };
  tasks.push(task);
  saveTasks();
  els.createForm.reset();
  render();
  notify('Task added', 'success');
});

// Search
els.search.addEventListener('input', (e) => { query = e.target.value; render(); });

// Theme
function applyTheme(t) {
  els.body.classList.remove('light','dark');
  els.body.classList.add(t);
}
function loadTheme() {
  const t = localStorage.getItem(THEME_KEY) || 'light';
  applyTheme(t);
}
els.themeBtn.addEventListener('click', () => {
  const next = els.body.classList.contains('dark') ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem(THEME_KEY, next);
});
loadTheme();

// Clear all
els.clearAll.addEventListener('click', () => {
  if (!tasks.length) return;
  const ok = confirm('Clear all tasks? This cannot be undone.');
  if (!ok) return;
  tasks = [];
  saveTasks();
  render();
  notify('All tasks cleared');
});

// Edit dialog
function openEdit(id) {
  const t = tasks.find(x => x.id === id);
  if (!t) return;
  editingId = id;
  els.eTitle.value = t.title;
  els.eDesc.value = t.desc || '';
  els.eDue.value = t.due || '';
  els.ePrio.value = t.prio || 'P2';
  els.dlg.returnValue = 'cancel';
  els.dlg.showModal();
}

els.editForm.addEventListener('submit', (e) => {
  // Prevent default closing to set returnValue via button value
  // Not strictly necessary, but keep for clarity
});

els.dlg.addEventListener('close', () => {
  if (els.dlg.returnValue !== 'save') { editingId = null; return; }
  if (!editingId) return;
  const idx = tasks.findIndex(t => t.id === editingId);
  if (idx === -1) return;
  tasks[idx].title = els.eTitle.value.trim();
  tasks[idx].desc = els.eDesc.value.trim();
  tasks[idx].due = els.eDue.value || '';
  tasks[idx].prio = els.ePrio.value || 'P2';
  saveTasks();
  editingId = null;
  render();
  notify('Task updated', 'success');
});

// Cross-tab sync
window.addEventListener('storage', (e) => {
  if (e.key === STORE_KEY) { tasks = loadTasks(); render(); }
  if (e.key === THEME_KEY) { applyTheme(localStorage.getItem(THEME_KEY) || 'light'); }
});

// Initial render
render();
