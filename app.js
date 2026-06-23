const storageKey = "ato-ikura-months";

const monthInput = document.querySelector("#monthInput");
const incomeForm = document.querySelector("#incomeForm");
const incomeInput = document.querySelector("#incomeInput");
const expenseForm = document.querySelector("#expenseForm");
const expenseNameInput = document.querySelector("#expenseNameInput");
const expenseAmountInput = document.querySelector("#expenseAmountInput");
const expenseDateInput = document.querySelector("#expenseDateInput");
const expenseCategoryInput = document.querySelector("#expenseCategoryInput");
const clearMonthButton = document.querySelector("#clearMonthButton");
const copyBalanceButton = document.querySelector("#copyBalanceButton");
const remainingAmount = document.querySelector("#remainingAmount");
const incomeAmount = document.querySelector("#incomeAmount");
const spentAmount = document.querySelector("#spentAmount");
const spentMeter = document.querySelector("#spentMeter");
const balanceTone = document.querySelector("#balanceTone");
const entryCount = document.querySelector("#entryCount");
const expenseTableBody = document.querySelector("#expenseTableBody");
const expenseRowTemplate = document.querySelector("#expenseRowTemplate");
const tablePanel = document.querySelector(".table-panel");

let state = loadState();

function monthKeyFromDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function todayValue() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createId() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getCurrentMonth() {
  return monthInput.value;
}

function getMonthData(month) {
  if (!state[month]) {
    state[month] = { income: 0, expenses: [] };
  }
  return state[month];
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

function formatMoney(value) {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatShortDate(value) {
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
  }).format(date);
}

function totalsFor(monthData) {
  const spent = monthData.expenses.reduce((sum, expense) => sum + expense.amount, 0);
  return {
    income: monthData.income,
    spent,
    remaining: monthData.income - spent,
  };
}

function render() {
  const monthData = getMonthData(getCurrentMonth());
  const totals = totalsFor(monthData);
  const ratio = totals.income > 0 ? Math.min(100, (totals.spent / totals.income) * 100) : 0;

  incomeInput.value = monthData.income ? String(monthData.income) : "";
  remainingAmount.textContent = formatMoney(totals.remaining);
  incomeAmount.textContent = formatMoney(totals.income);
  spentAmount.textContent = formatMoney(totals.spent);
  spentMeter.style.width = `${ratio}%`;
  entryCount.textContent = `${monthData.expenses.length}件`;

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

  renderExpenses(monthData.expenses);
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
      row.querySelector('[data-cell="amount"]').textContent = formatMoney(expense.amount);
      row.querySelector("button").addEventListener("click", () => deleteExpense(expense.id));
      expenseTableBody.append(row);
    });
}

function deleteExpense(id) {
  const monthData = getMonthData(getCurrentMonth());
  monthData.expenses = monthData.expenses.filter((expense) => expense.id !== id);
  saveState();
  render();
}

monthInput.value = monthKeyFromDate(new Date());
expenseDateInput.value = todayValue();

monthInput.addEventListener("change", () => {
  const firstDay = `${getCurrentMonth()}-01`;
  expenseDateInput.value = firstDay;
  render();
});

incomeForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const monthData = getMonthData(getCurrentMonth());
  monthData.income = parseMoney(incomeInput.value);
  saveState();
  render();
});

expenseForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const amount = parseMoney(expenseAmountInput.value);
  const name = expenseNameInput.value.trim() || "支出";

  if (amount <= 0) {
    expenseAmountInput.focus();
    return;
  }

  const monthData = getMonthData(getCurrentMonth());
  monthData.expenses.push({
    id: createId(),
    name,
    amount,
    date: expenseDateInput.value || todayValue(),
    category: expenseCategoryInput.value,
    createdAt: Date.now(),
  });

  expenseNameInput.value = "";
  expenseAmountInput.value = "";
  expenseDateInput.value = todayValue();
  saveState();
  render();
  expenseNameInput.focus();
});

clearMonthButton.addEventListener("click", () => {
  const month = getCurrentMonth();
  const monthData = getMonthData(month);
  const hasData = monthData.income > 0 || monthData.expenses.length > 0;

  if (!hasData) {
    return;
  }

  if (confirm("この月の収入と支出をすべて削除しますか？")) {
    delete state[month];
    saveState();
    render();
  }
});

copyBalanceButton.addEventListener("click", async () => {
  const totals = totalsFor(getMonthData(getCurrentMonth()));
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

render();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {
      // The app still works if offline support is unavailable.
    });
  });
}
