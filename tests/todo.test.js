const fs = require("fs");
const path = require("path");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");

// テスト中の「現在時刻」を固定する（タスクの id や作成日時が毎回同じになる）
const FIXED_NOW = new Date("2026-01-15T09:00:00.000Z");

const STORAGE_KEY = "todo_app_tasks";

// テスト用の初期タスク（作成日時が新しい順に A → B → C と並ぶ）
const SEED_TASKS = [
  {
    id: "seed-a",
    text: "企画書を書く",
    completed: false,
    priority: "high",
    category: "work",
    dueDate: "",
    createdAt: "2026-01-15T08:00:00.000Z",
  },
  {
    id: "seed-b",
    text: "牛乳を買う",
    completed: true,
    priority: "low",
    category: "shopping",
    dueDate: "",
    createdAt: "2026-01-15T07:00:00.000Z",
  },
  {
    id: "seed-c",
    text: "英単語を覚える",
    completed: false,
    priority: "medium",
    category: "study",
    dueDate: "",
    createdAt: "2026-01-15T06:00:00.000Z",
  },
];

// index.html の <body> の中身を、擬似ブラウザに読み込む（<script> は除く）
function setupDom() {
  const match = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const bodyHtml = (match ? match[1] : html).replace(/<script[\s\S]*?<\/script>/gi, "");
  document.body.innerHTML = bodyHtml;
}

// 擬似ブラウザ(jsdom)にない matchMedia の、代わりを用意する（常に「ダークモードではない」と答える）
function mockMatchMedia() {
  window.matchMedia = jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));
}

// app.js を読み込んで、アプリを起動する
// DOMContentLoaded を毎回発火すると、前のテストで読み込んだ app.js まで動いてしまうため、
// 今回読み込んだ app.js の init だけを取り出して呼ぶ
function startApp() {
  const spy = jest.spyOn(document, "addEventListener");
  require("../app.js");
  const call = spy.mock.calls.find(([type]) => type === "DOMContentLoaded");
  spy.mockRestore();
  call[1]();
}

function savedTasks() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY));
}

function visibleTitles() {
  return [...document.querySelectorAll("#taskList .task-title")].map((el) => el.textContent);
}

function findTaskItem(text) {
  return [...document.querySelectorAll("#taskList .task-item")].find(
    (li) => li.querySelector(".task-title").textContent === text
  );
}

function submitNewTask(text) {
  document.getElementById("taskInput").value = text;
  document
    .getElementById("todoForm")
    .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
}

function clickFilterTab(filter) {
  document.querySelector(`.filter-tab[data-filter="${filter}"]`).click();
}

describe("ToDoアプリの主要な動作", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(FIXED_NOW);
    localStorage.clear();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_TASKS));
    jest.resetModules();
    mockMatchMedia();
    setupDom();
    startApp();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("タスクの追加", () => {
    test("入力したタスクが、選んだ優先度・カテゴリで一覧の先頭に追加され、保存される", () => {
      // 確認すること: フォーム送信で新しいタスクが一覧の先頭に表示され、
      // 固定した時刻に基づく id・作成日時で localStorage に保存されること
      document.getElementById("prioritySelect").value = "high";
      document.getElementById("categorySelect").value = "private";

      submitNewTask("  ジムに行く  ");

      expect(visibleTitles()).toEqual(["ジムに行く", "企画書を書く", "牛乳を買う", "英単語を覚える"]);
      expect(savedTasks()[0]).toEqual({
        id: `task-${FIXED_NOW.getTime()}`,
        text: "ジムに行く",
        completed: false,
        priority: "high",
        category: "private",
        dueDate: "",
        createdAt: FIXED_NOW.toISOString(),
      });
      expect(document.getElementById("taskInput").value).toBe("");
      expect(document.getElementById("progressText").textContent).toBe("1 / 4 完了 (25%)");
    });

    test("空白だけの入力では、タスクは追加されない", () => {
      // 確認すること: 空白のみを入力して送信しても、一覧と保存内容が変わらないこと
      submitNewTask("   ");

      expect(visibleTitles()).toHaveLength(3);
      expect(savedTasks()).toEqual(SEED_TASKS);
    });
  });

  describe("完了の切り替え", () => {
    test("チェックボックスを押すと完了になり、もう一度押すと未完了に戻る", () => {
      // 確認すること: チェックボックスのクリックで completed が切り替わり、
      // 表示（completed クラス・進捗）と保存内容の両方に反映されること
      findTaskItem("企画書を書く").querySelector(".checkbox-container").click();

      expect(findTaskItem("企画書を書く").classList.contains("completed")).toBe(true);
      expect(savedTasks().find((t) => t.id === "seed-a").completed).toBe(true);
      expect(document.getElementById("progressText").textContent).toBe("2 / 3 完了 (67%)");

      findTaskItem("企画書を書く").querySelector(".checkbox-container").click();

      expect(findTaskItem("企画書を書く").classList.contains("completed")).toBe(false);
      expect(savedTasks().find((t) => t.id === "seed-a").completed).toBe(false);
      expect(document.getElementById("progressText").textContent).toBe("1 / 3 完了 (33%)");
    });
  });

  describe("削除", () => {
    test("削除ボタンを押すと、そのタスクだけが一覧と保存内容から消える", () => {
      // 確認すること: 削除ボタンで対象のタスクだけが消え、他のタスクは残ること
      findTaskItem("牛乳を買う").querySelector(".delete-btn").click();

      expect(visibleTitles()).toEqual(["企画書を書く", "英単語を覚える"]);
      expect(savedTasks().map((t) => t.id)).toEqual(["seed-a", "seed-c"]);
      expect(document.getElementById("toast").textContent).toBe("タスクを削除しました");
    });

    test("全部削除すると、「タスクがありません」の表示になる", () => {
      // 確認すること: タスクが 0 件になったとき、空の状態の表示に切り替わること
      ["企画書を書く", "牛乳を買う", "英単語を覚える"].forEach((text) => {
        findTaskItem(text).querySelector(".delete-btn").click();
      });

      expect(visibleTitles()).toEqual([]);
      expect(savedTasks()).toEqual([]);
      expect(document.getElementById("emptyState").classList.contains("show")).toBe(true);
    });
  });

  describe("絞り込み", () => {
    test("「未完了」「完了済み」「すべて」のタブで、表示が切り替わる", () => {
      // 確認すること: ステータスのタブごとに、該当するタスクだけが表示されること
      clickFilterTab("active");
      expect(visibleTitles()).toEqual(["企画書を書く", "英単語を覚える"]);
      expect(document.querySelector('.filter-tab[data-filter="active"]').classList.contains("active")).toBe(true);

      clickFilterTab("completed");
      expect(visibleTitles()).toEqual(["牛乳を買う"]);

      clickFilterTab("all");
      expect(visibleTitles()).toEqual(["企画書を書く", "牛乳を買う", "英単語を覚える"]);
    });

    test("カテゴリを選ぶと、そのカテゴリのタスクだけが表示される", () => {
      // 確認すること: カテゴリの絞り込みで、選んだカテゴリのタスクだけが表示され、件数表示も変わること
      const select = document.getElementById("filterCategory");
      select.value = "study";
      select.dispatchEvent(new Event("change"));

      expect(visibleTitles()).toEqual(["英単語を覚える"]);
      expect(document.getElementById("taskCountLabel").textContent).toBe("表示中: 1 件 (全 3 件)");
    });

    test("検索欄に入力すると、文字を含むタスクだけが表示され、クリアで元に戻る", () => {
      // 確認すること: 検索語を含むタスクだけが表示され、クリアボタンで全件表示に戻ること
      const input = document.getElementById("searchInput");
      input.value = "牛乳";
      input.dispatchEvent(new Event("input"));

      expect(visibleTitles()).toEqual(["牛乳を買う"]);

      document.getElementById("clearSearchBtn").click();

      expect(input.value).toBe("");
      expect(visibleTitles()).toEqual(["企画書を書く", "牛乳を買う", "英単語を覚える"]);
    });

    test("ステータスとカテゴリの絞り込みは、組み合わせて使える", () => {
      // 確認すること: 「未完了」と「買い物」を同時に選ぶと、該当なしで空の状態が表示されること
      clickFilterTab("active");
      const select = document.getElementById("filterCategory");
      select.value = "shopping";
      select.dispatchEvent(new Event("change"));

      expect(visibleTitles()).toEqual([]);
      expect(document.getElementById("emptyState").classList.contains("show")).toBe(true);
    });
  });
});
