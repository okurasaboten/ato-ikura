const storageKey = "ato-ikura-months";
const fixedCostsKey = "__fixedCosts";
const lunchBudget = 500;
const foodBudget = 10000;

const monthInput = document.querySelector("#monthInput");
const periodLabel = document.querySelector("#periodLabel");
const incomeForm = document.querySelector("#incomeForm");
const incomeInput = document.querySelector("#incomeInput");
const fixedCostForm = document.querySelector("#fixedCostForm");
const fixedCostNameInput = document.querySelector("#fixedCostNameInput");
const fixedCostAmountInput = document.querySelector("#fixedCostAmountInput");
const fixedCostList = document.querySelector("#fixedCostList");
const fixedCostCount = document.querySelector("#fixedCostCount");
const expenseForm = document.querySelector("#expenseForm");
const expenseNameInput = document.querySelector("#expenseNameInput");
const expenseAmountInput = document.querySelector("#expenseAmountInput");
const expenseDateInput = document.querySelector("#expenseDateInput");
const expenseCategoryInput = document.querySelector("#expenseCategoryInput");
const quickAmountButtons = document.querySelectorAll("[data-quick-amount]");
const clearMonthButton = document.querySelector("#clearMonthButton");
const copyBalanceButton = document.querySelector("#copyBalanceButton");
const exportCsvButton = document.querySelector("#exportCsvButton");
const remainingAmount = document.querySelector("#remainingAmount");
const incomeAmount = document.querySelector("#incomeAmount");
const fixedAmount = document.querySelector("#fixedAmount");
const spentAmount = document.querySelector("#spentAmount");
const foodBudgetStatus = document.querySelector("#foodBudgetStatus");
const foodBudgetMeter = document.querySelector("#foodBudgetMeter");
const spentMeter = document.querySelector("#spentMeter");
const balanceTone = document.querySelector("#balanceTone");
const mascotFace = document.querySelector("#mascotFace");
const mascotMessage = document.querySelector("#mascotMessage");
const entryCount = document.querySelector("#entryCount");
const expenseTableBody = document.querySelector("#expenseTableBody");
const expenseRowTemplate = document.querySelector("#expenseRowTemplate");
const tablePanel = document.querySelector(".table-panel");
const primaryBalanceCard = document.querySelector(".balance-card.primary");
const foodBudgetPanel = document.querySelector(".food-budget-panel");

let state = loadState();

function pad(value) {
  return String(value).padStart(2, "0");
}

function dateValue(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function monthValue(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

function dateFromParts(year, monthIndex, day) {
  return new Date(year, monthIndex, day);
}

function periodKeyFromDate(date) {
  const start = date.getDate() >= 12
    ? dateFromParts(date.getFullYear(), date.getMonth(), 12)
    : dateFromParts(date.getFullYear(), date.getMonth() - 1, 12);
  return monthValue(start);
}

function periodStartDate(periodKey) {
  const [year, month] = periodKey.split("-").map(Number);
  return dateFromParts(year, month - 1, 12);
}

function periodEndDate(periodKey) {
  const [year, month] = periodKey.split("-").map(Number);
  return dateFromParts(year, month, 11);
}

function formatPeriodLabel(periodKey) {
  const start = periodStartDate(periodKey);
  const end = periodEndDate(periodKey);
  return `${start.getFullYear()}年${start.getMonth() + 1}月12日〜${end.getFullYear()}年${end.getMonth() + 1}月11日`;
}

function todayValue() {
  return dateValue(new Date());
}

function createId() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getCurrentPeriod() {
  return monthInput.value;
}

function getPeriodData(periodKey) {
  if (!state[periodKey] || Array.isArray(state[periodKey])) {
    state[periodKey] = { income: 0, expenses: [] };
  }

  if (!Array.isArray(state[periodKey].expenses)) {
    state[periodKey].expenses = [];
  }

  return state[periodKey];
}

function getFixedCosts() {
  if (!Array.isArray(state[fixedCostsKey])) {
    state[fixedCostsKey] = [];
  }
  return state[fixedCostsKey];
}

function loadState() {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) || {};
  } catch {
    return {};
  }
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function parseMoney(value) {
  const normalized = String(value).replace(/[^\d.-]/g, "");
  const number = Number(normalized);
  return Number.isFinite(number) ? Math.max(0, Math.round(number)) : 0;
}

function formatInputMoney(value) {
  return value ? String(value) : "";
}

function celebrate(element) {
  if (!element) {
    return;
  }

  element.classList.remove("celebrate");
  void element.offsetWidth;
  element.classList.add("celebrate");
}

function formatMoney(value) {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(value);
}

function isLunchExpense(expense) {
  const target = `${expense.category} ${expense.name}`.toLowerCase();
  return target.includes("ランチ") || target.includes("昼食") || target.includes("昼ごはん");
}

function isFoodExpense(expense) {
  return expense.category === "食費" || expense.category === "ランチ";
}

function isOverFoodSingleBudget(expense) {
  return isFoodExpense(expense) && expense.amount >= lunchBudget;
}

function lunchBudgetStatus(expense) {
  if (!isFoodExpense(expense)) {
    return "";
  }

  return expense.amount >= lunchBudget ? "食費500円以上" : "食費500円未満";
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv(filename, rows) {
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportCurrentPeriodCsv() {
  const periodKey = getCurrentPeriod();
  const periodData = getPeriodData(periodKey);
  const totals = totalsFor(periodData);
  const rows = [
    ["期間", formatPeriodLabel(periodKey)],
    ["収入", totals.income],
    ["固定費合計", totals.fixed],
    ["支出合計", totals.spent],
    ["残り使える金額", totals.remaining],
    ["食費予算", foodBudget],
    ["食費使用額", totals.foodSpent],
    ["食費残り", foodBudget - totals.foodSpent],
    ["食費単品目安", lunchBudget],
    [],
    ["種別", "日付", "内容", "カテゴリ", "金額", "食費判定"],
  ];

  getFixedCosts().forEach((item) => {
    rows.push(["固定費", "", item.name, "固定費", item.amount, ""]);
  });

  [...periodData.expenses]
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt)
    .forEach((expense) => {
      rows.push(["支出", expense.date, expense.name, expense.category, expense.amount, lunchBudgetStatus(expense)]);
    });

  downloadCsv(`ato-ikura-${periodKey}.csv`, rows);
}

function formatShortDate(value) {
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
  }).format(date);
}

function totalsFor(periodData) {
  const fixedTotal = getFixedCosts().reduce((sum, item) => sum + item.amount, 0);
  const spent = periodData.expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const foodSpent = periodData.expenses
    .filter(isFoodExpense)
    .reduce((sum, expense) => sum + expense.amount, 0);

  return {
    income: periodData.income,
    fixed: fixedTotal,
    spent,
    foodSpent,
    used: fixedTotal + spent,
    remaining: periodData.income - fixedTotal - spent,
  };
}

function mascotFor(totals, ratio) {
  const pick = (messages) => messages[Math.floor(Math.random() * messages.length)];

  if (totals.income === 0) {
    return {
      mood: "idle",
      message: pick([
        "まずは収入を入れてみよう",
        "今月のスタート地点、決めていこ",
        "収入を入れたら作戦会議スタート",
        "ここから一緒に見守るよ",
      ]),
    };
  }

  if (totals.remaining < 0) {
    return {
      mood: "pinch",
      message: pick([
        "ちょっとオーバー。今日は守りの日にしよ",
        "ここから巻き返せる。まず深呼吸",
        "使いすぎサイン。今日はお財布を休ませよ",
        "大丈夫、気づけた時点で勝ちに近い",
        "次の一手は慎重にいこ",
      ]),
    };
  }

  if (ratio >= 85) {
    return {
      mood: "careful",
      message: pick([
        "残り少なめ。小さな出費に気をつけよ",
        "ここは節約モードでスマートに",
        "ラストスパート、無理なくいこ",
        "今日は買う前に一拍おこ",
        "まだ守れる範囲。落ち着いていこ",
      ]),
    };
  }

  if (ratio >= 55) {
    return {
      mood: "steady",
      message: pick([
        "いいペース。あと半分、落ち着いていこ",
        "ちゃんと見えてる。管理うまいよ",
        "ここからの調整がいい感じに効くよ",
        "使うところは使って、締めるところは締めよ",
        "順調。今日の選択もいい感じ",
      ]),
    };
  }

  return {
    mood: "happy",
    message: pick([
      "まだ余裕あり。今日も上手に使えてるね",
      "いい感じ。お財布に余白があるって最高",
      "このペース、かなりきれい",
      "上手にコントロールできてるよ",
      "今日はちょっとごきげんに過ごせそう",
      "余裕あり。小さなごほうびも計画的にね",
    ]),
  };
}

function render() {
  const periodKey = getCurrentPeriod();
  const periodData = getPeriodData(periodKey);
  const totals = totalsFor(periodData);
  const ratio = totals.income > 0 ? Math.min(100, (totals.used / totals.income) * 100) : 0;

  periodLabel.textContent = formatPeriodLabel(periodKey);
  incomeInput.value = formatInputMoney(periodData.income);
  remainingAmount.textContent = formatMoney(totals.remaining);
  incomeAmount.textContent = formatMoney(totals.income);
  fixedAmount.textContent = formatMoney(totals.fixed);
  spentAmount.textContent = formatMoney(totals.spent);
  foodBudgetStatus.textContent = `${formatMoney(totals.foodSpent)} / ${formatMoney(foodBudget)}`;
  foodBudgetStatus.classList.toggle("over-budget", totals.foodSpent > foodBudget);
  foodBudgetMeter.style.width = `${Math.min(100, (totals.foodSpent / foodBudget) * 100)}%`;
  spentMeter.style.width = `${ratio}%`;
  entryCount.textContent = `${periodData.expenses.length}件`;

  if (totals.income === 0) {
    balanceTone.textContent = "収入を入力すると表示されます";
  } else if (totals.remaining < 0) {
    balanceTone.textContent = "予算を超えています";
  } else if (ratio >= 85) {
    balanceTone.textContent = "残り少なめです";
  } else if (ratio >= 55) {
    balanceTone.textContent = "半分以上使っています";
  } else {
    balanceTone.textContent = "まだ余裕があります";
  }

  const mascot = mascotFor(totals, ratio);
  mascotFace.className = `mascot-face ${mascot.mood}`;
  mascotMessage.textContent = mascot.message;

  renderFixedCosts();
  renderExpenses(periodData.expenses);
}

function renderFixedCosts() {
  const fixedCosts = getFixedCosts();
  fixedCostCount.textContent = `${fixedCosts.length}件`;
  fixedCostList.replaceChildren();

  if (fixedCosts.length === 0) {
    const empty = document.createElement("p");
    empty.className = "mini-empty";
    empty.textContent = "固定費はまだありません";
    fixedCostList.append(empty);
    return;
  }

  fixedCosts.forEach((item) => {
    const row = document.createElement("div");
    row.className = "mini-row";

    const text = document.createElement("span");
    text.textContent = `${item.name} ${formatMoney(item.amount)}`;

    const button = document.createElement("button");
    button.className = "mini-delete";
    button.type = "button";
    button.textContent = "削除";
    button.addEventListener("click", () => deleteFixedCost(item.id));

    row.append(text, button);
    fixedCostList.append(row);
  });
}

function renderExpenses(expenses) {
  expenseTableBody.replaceChildren();
  tablePanel.classList.toggle("is-empty", expenses.length === 0);

  [...expenses]
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
    .forEach((expense) => {
      const row = expenseRowTemplate.content.firstElementChild.cloneNode(true);
      row.querySelector('[data-cell="date"]').textContent = formatShortDate(expense.date);
      row.querySelector('[data-cell="name"]').textContent = expense.name;
      row.querySelector('[data-cell="category"]').textContent = expense.category;
      const amountCell = row.querySelector('[data-cell="amount"]');
      amountCell.textContent = formatMoney(expense.amount);
      amountCell.classList.toggle("over-budget", isOverFoodSingleBudget(expense));
      row.addEventListener("click", (event) => {
        if (event.target.closest("button")) {
          return;
        }
        row.classList.toggle("is-open");
      });
      row.querySelector("button").addEventListener("click", () => deleteExpense(expense.id));
      expenseTableBody.append(row);
    });
}

function deleteExpense(id) {
  const periodData = getPeriodData(getCurrentPeriod());
  periodData.expenses = periodData.expenses.filter((expense) => expense.id !== id);
  saveState();
  render();
}

function deleteFixedCost(id) {
  state[fixedCostsKey] = getFixedCosts().filter((item) => item.id !== id);
  saveState();
  render();
}

monthInput.value = periodKeyFromDate(new Date());
expenseDateInput.value = todayValue();

monthInput.addEventListener("change", () => {
  expenseDateInput.value = dateValue(periodStartDate(getCurrentPeriod()));
  render();
});

incomeForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const periodData = getPeriodData(getCurrentPeriod());
  periodData.income = parseMoney(incomeInput.value);
  saveState();
  render();
  celebrate(primaryBalanceCard);
});

fixedCostForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const amount = parseMoney(fixedCostAmountInput.value);
  const name = fixedCostNameInput.value.trim() || "固定費";

  if (amount <= 0) {
    fixedCostAmountInput.focus();
    return;
  }

  getFixedCosts().push({
    id: createId(),
    name,
    amount,
    createdAt: Date.now(),
  });

  fixedCostNameInput.value = "";
  fixedCostAmountInput.value = "";
  saveState();
  render();
  celebrate(primaryBalanceCard);
  fixedCostNameInput.focus();
});

expenseForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const amount = parseMoney(expenseAmountInput.value);
  const name = expenseNameInput.value.trim() || "支出";

  if (amount <= 0) {
    expenseAmountInput.focus();
    return;
  }

  const expenseDate = expenseDateInput.value || todayValue();
  const targetPeriod = periodKeyFromDate(new Date(`${expenseDate}T00:00:00`));
  const periodData = getPeriodData(targetPeriod);
  periodData.expenses.push({
    id: createId(),
    name,
    amount,
    date: expenseDate,
    category: expenseCategoryInput.value,
    createdAt: Date.now(),
  });

  monthInput.value = targetPeriod;
  expenseNameInput.value = "";
  expenseAmountInput.value = "";
  expenseDateInput.value = todayValue();
  saveState();
  render();
  celebrate(primaryBalanceCard);
  if (isFoodExpense({ name, amount, category: expenseCategoryInput.value })) {
    celebrate(foodBudgetPanel);
  }
  expenseNameInput.focus();
});

quickAmountButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const current = parseMoney(expenseAmountInput.value);
    const next = current + Number(button.dataset.quickAmount);
    expenseAmountInput.value = String(next);
    expenseAmountInput.focus();
  });
});

clearMonthButton.addEventListener("click", () => {
  const periodKey = getCurrentPeriod();
  const periodData = getPeriodData(periodKey);
  const hasData = periodData.income > 0 || periodData.expenses.length > 0;

  if (!hasData) {
    return;
  }

  if (confirm("この期間の収入と支出履歴をすべて削除しますか？固定費の設定は残ります。")) {
    delete state[periodKey];
    saveState();
    render();
  }
});

copyBalanceButton.addEventListener("click", async () => {
  const totals = totalsFor(getPeriodData(getCurrentPeriod()));
  const text = `残り使える金額: ${formatMoney(totals.remaining)}`;

  try {
    await navigator.clipboard.writeText(text);
    copyBalanceButton.title = "コピーしました";
    setTimeout(() => {
      copyBalanceButton.title = "残額をコピー";
    }, 1300);
  } catch {
    alert(text);
  }
});

exportCsvButton.addEventListener("click", exportCurrentPeriodCsv);

render();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {
      // The app still works if offline support is unavailable.
    });
  });
}
