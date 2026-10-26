const fs = require("fs");
const path = require("path");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");

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

describe("ToDoアプリの基本チェック", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.resetModules();
    mockMatchMedia();
    setupDom();
  });

  test("index.html に、入力欄とボタンがある", () => {
    expect(document.querySelector("input")).not.toBeNull();
    expect(document.querySelector("button")).not.toBeNull();
  });

  test("app.js を読み込んでも、エラーにならない", () => {
    const errors = [];
    const onError = (e) => errors.push(e.error || e.message);
    window.addEventListener("error", onError);

    require("../app.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));

    window.removeEventListener("error", onError);
    expect(errors).toEqual([]);
  });
});