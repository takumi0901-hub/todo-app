// ==========================================
// ToDo アプリケーション JavaScript
// ==========================================

// ストレージキー
const STORAGE_KEY = 'todo_app_tasks';
const THEME_KEY = 'todo_app_theme';

// カテゴリ名称・アイコンのマッピング
const CATEGORY_MAP = {
  general: { label: '一般', icon: 'fa-folder' },
  work: { label: '仕事', icon: 'fa-briefcase' },
  private: { label: 'プライベート', icon: 'fa-house-user' },
  shopping: { label: '買い物', icon: 'fa-cart-shopping' },
  study: { label: '勉強', icon: 'fa-graduation-cap' }
};

// 優先度マッピング
const PRIORITY_MAP = {
  high: { label: '高', order: 3 },
  medium: { label: '中', order: 2 },
  low: { label: '低', order: 1 }
};

// アプリケーションの状態
let tasks = [];
let currentFilter = 'all';
let currentCategory = 'all';
let currentSearch = '';
let currentSort = 'createdAt-desc';

// 初期サンプルデータ（初回起動時のみ）
const DEFAULT_TASKS = [
  {
    id: 'sample-1',
    text: 'ToDoリストの使い方を確認する',
    completed: true,
    priority: 'medium',
    category: 'general',
    dueDate: '',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
  },
  {
    id: 'sample-2',
    text: '新しいタスクを追加してみる',
    completed: false,
    priority: 'high',
    category: 'work',
    dueDate: new Date().toISOString().split('T')[0],
    createdAt: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 'sample-3',
    text: '牛乳とパンを買う',
    completed: false,
    priority: 'low',
    category: 'shopping',
    dueDate: '',
    createdAt: new Date().toISOString()
  }
];

// DOM 要素
const elements = {
  todoForm: document.getElementById('todoForm'),
  taskInput: document.getElementById('taskInput'),
  prioritySelect: document.getElementById('prioritySelect'),
  categorySelect: document.getElementById('categorySelect'),
  dueDateInput: document.getElementById('dueDateInput'),
  taskList: document.getElementById('taskList'),
  emptyState: document.getElementById('emptyState'),
  progressText: document.getElementById('progressText'),
  progressBar: document.getElementById('progressBar'),
  taskCountLabel: document.getElementById('taskCountLabel'),
  searchInput: document.getElementById('searchInput'),
  clearSearchBtn: document.getElementById('clearSearchBtn'),
  filterTabs: document.querySelectorAll('.filter-tab'),
  filterCategory: document.getElementById('filterCategory'),
  sortBy: document.getElementById('sortBy'),
  clearCompletedBtn: document.getElementById('clearCompletedBtn'),
  themeToggleBtn: document.getElementById('themeToggleBtn'),
  toast: document.getElementById('toast'),
  
  // 編集モーダル
  editModal: document.getElementById('editModal'),
  editForm: document.getElementById('editForm'),
  closeEditModal: document.getElementById('closeEditModal'),
  cancelEditBtn: document.getElementById('cancelEditBtn'),
  editTaskId: document.getElementById('editTaskId'),
  editTaskInput: document.getElementById('editTaskInput'),
  editPrioritySelect: document.getElementById('editPrioritySelect'),
  editCategorySelect: document.getElementById('editCategorySelect'),
  editDueDateInput: document.getElementById('editDueDateInput'),

  // バックアップモーダル
  backupBtn: document.getElementById('backupBtn'),
  backupModal: document.getElementById('backupModal'),
  closeBackupModal: document.getElementById('closeBackupModal'),
  exportBtn: document.getElementById('exportBtn'),
  importFile: document.getElementById('importFile')
};

// ==========================================
// 初期化 & イベントリスナー設定
// ==========================================
function init() {
  loadTheme();
  loadTasks();
  setupEventListeners();
  render();
}

function setupEventListeners() {
  // フォーム送信（新規タスク追加）
  elements.todoForm.addEventListener('submit', handleAddTask);

  // 検索入力
  elements.searchInput.addEventListener('input', (e) => {
    currentSearch = e.target.value.trim().toLowerCase();
    if (currentSearch) {
      elements.clearSearchBtn.classList.add('show');
    } else {
      elements.clearSearchBtn.classList.remove('show');
    }
    render();
  });

  // 検索クリアボタン
  elements.clearSearchBtn.addEventListener('click', () => {
    elements.searchInput.value = '';
    currentSearch = '';
    elements.clearSearchBtn.classList.remove('show');
    render();
  });

  // ステータスフィルター切り替え
  elements.filterTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      elements.filterTabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      currentFilter = tab.dataset.filter;
      render();
    });
  });

  // カテゴリフィルター
  elements.filterCategory.addEventListener('change', (e) => {
    currentCategory = e.target.value;
    render();
  });

  // ソート順変更
  elements.sortBy.addEventListener('change', (e) => {
    currentSort = e.target.value;
    render();
  });

  // 完了済みタスク一括削除
  elements.clearCompletedBtn.addEventListener('click', handleClearCompleted);

  // テーマ切り替え
  elements.themeToggleBtn.addEventListener('click', toggleTheme);

  // 編集モーダル開閉
  elements.closeEditModal.addEventListener('click', closeEditModal);
  elements.cancelEditBtn.addEventListener('click', closeEditModal);
  elements.editForm.addEventListener('submit', handleSaveEdit);
  elements.editModal.addEventListener('click', (e) => {
    if (e.target === elements.editModal) closeEditModal();
  });

  // バックアップモーダル開閉
  elements.backupBtn.addEventListener('click', () => {
    elements.backupModal.classList.add('show');
  });
  elements.closeBackupModal.addEventListener('click', () => {
    elements.backupModal.classList.remove('show');
  });
  elements.backupModal.addEventListener('click', (e) => {
    if (e.target === elements.backupModal) elements.backupModal.classList.remove('show');
  });

  // バックアップ エクスポート / インポート
  elements.exportBtn.addEventListener('click', handleExport);
  elements.importFile.addEventListener('change', handleImport);

  // ESCキーでモーダルを閉じる
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeEditModal();
      elements.backupModal.classList.remove('show');
    }
  });
}

// ==========================================
// ストレージ & データ操作
// ==========================================
function loadTasks() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      tasks = JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse tasks from storage', e);
      tasks = DEFAULT_TASKS;
    }
  } else {
    // 初回利用時はデフォルトタスクを表示
    tasks = DEFAULT_TASKS;
    saveTasks();
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

// ==========================================
// タスクハンドラー
// ==========================================
function handleAddTask(e) {
  e.preventDefault();
  const text = elements.taskInput.value.trim();
  if (!text) return;

  const newTask = {
    id: 'task-' + Date.now(),
    text: text,
    completed: false,
    priority: elements.prioritySelect.value,
    category: elements.categorySelect.value,
    dueDate: elements.dueDateInput.value || '',
    createdAt: new Date().toISOString()
  };

  tasks.unshift(newTask);
  saveTasks();
  render();

  // フォームリセット
  elements.taskInput.value = '';
  elements.dueDateInput.value = '';
  elements.taskInput.focus();

  showToast('タスクを追加しました！');
}

function handleToggleTask(id) {
  tasks = tasks.map((task) => {
    if (task.id === id) {
      return { ...task, completed: !task.completed };
    }
    return task;
  });
  saveTasks();
  render();
}

function handleDeleteTask(id) {
  tasks = tasks.filter((task) => task.id !== id);
  saveTasks();
  render();
  showToast('タスクを削除しました');
}

function handleClearCompleted() {
  const completedCount = tasks.filter((t) => t.completed).length;
  if (completedCount === 0) {
    showToast('完了済みのタスクはありません');
    return;
  }

  if (confirm(`完了済みのタスク（${completedCount}件）を削除しますか？`)) {
    tasks = tasks.filter((t) => !t.completed);
    saveTasks();
    render();
    showToast(`${completedCount}件のタスクを削除しました`);
  }
}

// ==========================================
// 編集モーダル
// ==========================================
function openEditModal(task) {
  elements.editTaskId.value = task.id;
  elements.editTaskInput.value = task.text;
  elements.editPrioritySelect.value = task.priority;
  elements.editCategorySelect.value = task.category;
  elements.editDueDateInput.value = task.dueDate || '';

  elements.editModal.classList.add('show');
  elements.editTaskInput.focus();
}

function closeEditModal() {
  elements.editModal.classList.remove('show');
}

function handleSaveEdit(e) {
  e.preventDefault();
  const id = elements.editTaskId.value;
  const updatedText = elements.editTaskInput.value.trim();
  if (!updatedText) return;

  tasks = tasks.map((task) => {
    if (task.id === id) {
      return {
        ...task,
        text: updatedText,
        priority: elements.editPrioritySelect.value,
        category: elements.editCategorySelect.value,
        dueDate: elements.editDueDateInput.value || ''
      };
    }
    return task;
  });

  saveTasks();
  closeEditModal();
  render();
  showToast('変更を保存しました');
}

// ==========================================
// フィルター・ソート・描画
// ==========================================
function getFilteredAndSortedTasks() {
  let result = [...tasks];

  // 1. ステータスフィルター
  if (currentFilter === 'active') {
    result = result.filter((t) => !t.completed);
  } else if (currentFilter === 'completed') {
    result = result.filter((t) => t.completed);
  }

  // 2. カテゴリフィルター
  if (currentCategory !== 'all') {
    result = result.filter((t) => t.category === currentCategory);
  }

  // 3. 検索
  if (currentSearch) {
    result = result.filter((t) => t.text.toLowerCase().includes(currentSearch));
  }

  // 4. ソート
  result.sort((a, b) => {
    if (currentSort === 'createdAt-desc') {
      return new Date(b.createdAt) - new Date(a.createdAt);
    } else if (currentSort === 'createdAt-asc') {
      return new Date(a.createdAt) - new Date(b.createdAt);
    } else if (currentSort === 'dueDate-asc') {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    } else if (currentSort === 'dueDate-desc') {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(b.dueDate) - new Date(a.dueDate);
    } else if (currentSort === 'priority-desc') {
      return PRIORITY_MAP[b.priority].order - PRIORITY_MAP[a.priority].order;
    }
    return 0;
  });

  return result;
}

function render() {
  const filteredTasks = getFilteredAndSortedTasks();

  // リストの描画
  elements.taskList.innerHTML = '';
  if (filteredTasks.length === 0) {
    elements.emptyState.classList.add('show');
  } else {
    elements.emptyState.classList.remove('show');
    filteredTasks.forEach((task) => {
      elements.taskList.appendChild(createTaskElement(task));
    });
  }

  // 進捗バーの更新
  const totalCount = tasks.length;
  const completedCount = tasks.filter((t) => t.completed).length;
  const percentage = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  elements.progressBar.style.width = `${percentage}%`;
  elements.progressText.textContent = `${completedCount} / ${totalCount} 完了 (${percentage}%)`;
  elements.taskCountLabel.textContent = `表示中: ${filteredTasks.length} 件 (全 ${totalCount} 件)`;
}

function createTaskElement(task) {
  const li = document.createElement('li');
  li.className = `task-item priority-${task.priority} ${task.completed ? 'completed' : ''}`;

  // 左側エリア (チェックボックス + テキスト + メタ情報)
  const leftDiv = document.createElement('div');
  leftDiv.className = 'task-left';

  // チェックボックス
  const checkboxContainer = document.createElement('div');
  checkboxContainer.className = 'checkbox-container';
  checkboxContainer.title = task.completed ? '未完了に戻す' : '完了にする';
  checkboxContainer.innerHTML = '<div class="custom-checkbox"></div>';
  checkboxContainer.addEventListener('click', () => handleToggleTask(task.id));

  // テキスト・メタ情報
  const contentDiv = document.createElement('div');
  contentDiv.className = 'task-content';

  const titleSpan = document.createElement('span');
  titleSpan.className = 'task-title';
  titleSpan.textContent = task.text;

  // メタ情報 (バッジ)
  const metaDiv = document.createElement('div');
  metaDiv.className = 'task-meta';

  // カテゴリバッジ
  const cat = CATEGORY_MAP[task.category] || CATEGORY_MAP.general;
  const catBadge = document.createElement('span');
  catBadge.className = 'badge badge-category';
  catBadge.innerHTML = `<i class="fa-solid ${cat.icon}"></i> ${cat.label}`;
  metaDiv.appendChild(catBadge);

  // 優先度バッジ
  const pri = PRIORITY_MAP[task.priority] || PRIORITY_MAP.medium;
  const priBadge = document.createElement('span');
  priBadge.className = `badge badge-priority-${task.priority}`;
  priBadge.innerHTML = `<i class="fa-solid fa-flag"></i> ${pri.label}`;
  metaDiv.appendChild(priBadge);

  // 期限バッジ
  if (task.dueDate) {
    const dueBadge = createDueDateBadge(task.dueDate);
    metaDiv.appendChild(dueBadge);
  }

  contentDiv.appendChild(titleSpan);
  contentDiv.appendChild(metaDiv);

  leftDiv.appendChild(checkboxContainer);
  leftDiv.appendChild(contentDiv);

  // 右側アクションボタン (編集・削除)
  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'task-actions';

  const editBtn = document.createElement('button');
  editBtn.className = 'action-btn edit-btn';
  editBtn.title = '編集';
  editBtn.innerHTML = '<i class="fa-regular fa-pen-to-square"></i>';
  editBtn.addEventListener('click', () => openEditModal(task));

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'action-btn delete-btn';
  deleteBtn.title = '削除';
  deleteBtn.innerHTML = '<i class="fa-regular fa-trash-can"></i>';
  deleteBtn.addEventListener('click', () => handleDeleteTask(task.id));

  actionsDiv.appendChild(editBtn);
  actionsDiv.appendChild(deleteBtn);

  li.appendChild(leftDiv);
  li.appendChild(actionsDiv);

  return li;
}

function createDueDateBadge(dateString) {
  const badge = document.createElement('span');
  badge.className = 'badge badge-due';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [y, m, d] = dateString.split('-').map(Number);
  const targetDate = new Date(y, m - 1, d);
  targetDate.setHours(0, 0, 0, 0);

  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let labelText = `${m}/${d}`;
  if (diffDays < 0) {
    badge.classList.add('due-overdue');
    labelText = `期限切れ (${Math.abs(diffDays)}日超過)`;
  } else if (diffDays === 0) {
    badge.classList.add('due-today');
    labelText = '今日が期限！';
  } else if (diffDays === 1) {
    labelText = '明日が期限';
  }

  badge.innerHTML = `<i class="fa-regular fa-calendar"></i> ${labelText}`;
  return badge;
}

// ==========================================
// テーマ切り替え (ダーク/ライト)
// ==========================================
function loadTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY);
  if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.setAttribute('data-theme', 'dark');
    updateThemeIcon(true);
  } else {
    document.documentElement.removeAttribute('data-theme');
    updateThemeIcon(false);
  }
}

function toggleTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  if (isDark) {
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem(THEME_KEY, 'light');
    updateThemeIcon(false);
  } else {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem(THEME_KEY, 'dark');
    updateThemeIcon(true);
  }
}

function updateThemeIcon(isDark) {
  elements.themeToggleBtn.innerHTML = isDark
    ? '<i class="fa-solid fa-sun"></i>'
    : '<i class="fa-solid fa-moon"></i>';
}

// ==========================================
// データのエクスポート / インポート
// ==========================================
function handleExport() {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(tasks, null, 2));
  const downloadAnchor = document.createElement('a');
  const dateStr = new Date().toISOString().split('T')[0];
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `todo-backup-${dateStr}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  showToast('バックアップを出力しました');
}

function handleImport(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (event) {
    try {
      const importedTasks = JSON.parse(event.target.result);
      if (Array.isArray(importedTasks)) {
        tasks = importedTasks;
        saveTasks();
        render();
        elements.backupModal.classList.remove('show');
        showToast(`${tasks.length}件のタスクを復元しました`);
      } else {
        alert('無効なファイル形式です。JSON配列を含むファイルを選択してください。');
      }
    } catch (err) {
      alert('ファイルの読み込みに失敗しました。正しいJSONファイルかご確認ください。');
    }
  };
  reader.readAsText(file);
  e.target.value = ''; // ファイル選択をリセット
}

// ==========================================
// トースト通知ユーティリティ
// ==========================================
let toastTimeout;
function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add('show');

  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    elements.toast.classList.remove('show');
  }, 2500);
}

// アプリ開始
document.addEventListener('DOMContentLoaded', init);
