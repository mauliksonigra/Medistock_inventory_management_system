const AUTH = { username: "admin", password: "admin123" };
const KEYS = { session: "medistock_session", items: "medistock_items", moves: "medistock_moves" };
const CATEGORIES = ["Antibiotics", "Analgesics", "Vitamins", "OTC", "Cardiac", "Diabetes", "Respiratory", "Surgical"];

const seedItems = [
  { id: "1", name: "Amoxicillin 500mg", sku: "AMX-500-B12", category: "Antibiotics", qty: 48, unit: "strips", reorder: 20, price: 86, expiry: "2026-12-18", supplier: "Sun Pharma", shelf: "A-12" },
  { id: "2", name: "Paracetamol 650mg", sku: "PCM-650-C04", category: "Analgesics", qty: 12, unit: "strips", reorder: 30, price: 32, expiry: "2026-11-02", supplier: "Cipla", shelf: "B-03" },
  { id: "3", name: "Vitamin D3 60K", sku: "VIT-D3-A08", category: "Vitamins", qty: 80, unit: "capsules", reorder: 25, price: 45, expiry: "2027-03-14", supplier: "Abbott", shelf: "C-01" },
  { id: "4", name: "Cetirizine 10mg", sku: "CET-10-D21", category: "OTC", qty: 0, unit: "strips", reorder: 15, price: 18, expiry: "2026-10-28", supplier: "Dr Reddy's", shelf: "B-18" },
  { id: "5", name: "Amlodipine 5mg", sku: "AML-5-E09", category: "Cardiac", qty: 36, unit: "strips", reorder: 18, price: 54, expiry: "2027-01-09", supplier: "Pfizer", shelf: "D-04" },
  { id: "6", name: "Metformin 500mg", sku: "MET-500-F11", category: "Diabetes", qty: 22, unit: "strips", reorder: 25, price: 41, expiry: "2026-10-20", supplier: "USV", shelf: "D-11" },
  { id: "7", name: "Salbutamol Inhaler", sku: "SAL-INH-G02", category: "Respiratory", qty: 9, unit: "packs", reorder: 10, price: 185, expiry: "2026-09-15", supplier: "GSK", shelf: "E-02" },
  { id: "8", name: "Surgical Gloves M", sku: "GLV-M-H33", category: "Surgical", qty: 140, unit: "packs", reorder: 40, price: 220, expiry: "2028-05-01", supplier: "3M", shelf: "F-07" }
];

const $ = (id) => document.getElementById(id);
let items = [];
let moves = [];

function load() {
  const saved = localStorage.getItem(KEYS.items);
  items = saved ? JSON.parse(saved) : seedItems;
  moves = JSON.parse(localStorage.getItem(KEYS.moves) || "[]");
  persist();
}

function persist() {
  localStorage.setItem(KEYS.items, JSON.stringify(items));
  localStorage.setItem(KEYS.moves, JSON.stringify(moves.slice(0, 40)));
}

function daysToExpiry(date) {
  return Math.ceil((new Date(date) - new Date()) / 86400000);
}

function statusOf(item) {
  if (item.qty <= 0) return { label: "Out of stock", cls: "badge-out", key: "out" };
  if (item.qty <= item.reorder) return { label: "Low stock", cls: "badge-low", key: "low" };
  if (daysToExpiry(item.expiry) <= 60) return { label: "Expiring", cls: "badge-exp", key: "ok" };
  return { label: "In stock", cls: "badge-ok", key: "ok" };
}

function toast(msg) {
  const el = $("toast");
  el.textContent = msg;
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 2200);
}

function rupee(n) {
  return "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function showApp() {
  $("login-screen").classList.add("hidden");
  $("app").classList.remove("hidden");
  renderAll();
}

function showLogin() {
  $("app").classList.add("hidden");
  $("login-screen").classList.remove("hidden");
}

function renderCategories() {
  const select = $("filter-category");
  select.innerHTML = `<option value="">All categories</option>` + CATEGORIES.map((c) => `<option>${c}</option>`).join("");
}

function renderDashboard() {
  const units = items.reduce((s, i) => s + Number(i.qty), 0);
  const value = items.reduce((s, i) => s + i.qty * i.price, 0);
  const low = items.filter((i) => i.qty <= i.reorder);
  const expiring = items.filter((i) => daysToExpiry(i.expiry) <= 60);
  $("stat-total").textContent = items.length;
  $("stat-units").textContent = units;
  $("stat-value").textContent = rupee(value);
  $("stat-low").textContent = low.length;
  $("stat-expiring").textContent = expiring.length;

  const counts = Object.fromEntries(CATEGORIES.map((c) => [c, 0]));
  items.forEach((i) => { counts[i.category] = (counts[i.category] || 0) + 1; });
  const max = Math.max(1, ...Object.values(counts));
  $("category-bars").innerHTML = CATEGORIES.map((c) => `
    <div class="bar-row">
      <span>${c}</span>
      <div class="bar"><span style="width:${(counts[c] / max) * 100}%"></span></div>
      <span>${counts[c]}</span>
    </div>`).join("");

  const attention = [...low, ...expiring.filter((i) => !low.includes(i))].slice(0, 8);
  $("attention-list").innerHTML = attention.length
    ? attention.map((i) => {
        const st = statusOf(i);
        const extra = daysToExpiry(i.expiry) <= 60 ? ` · ${daysToExpiry(i.expiry)}d left` : "";
        return `<li><span>${i.name}<small class="item-meta"> ${i.qty} ${i.unit}${extra}</small></span><span class="badge ${st.cls}">${st.label}</span></li>`;
      }).join("")
    : "<li>All stock looks healthy.</li>";
}

function renderInventory() {
  const q = $("search").value.toLowerCase();
  const cat = $("filter-category").value;
  const stock = $("filter-stock").value;
  const rows = items.filter((i) => {
    const matchQ = !q || [i.name, i.sku, i.supplier, i.shelf].join(" ").toLowerCase().includes(q);
    const matchC = !cat || i.category === cat;
    const key = statusOf(i).key;
    const matchS = !stock || (stock === "ok" ? key === "ok" : key === stock);
    return matchQ && matchC && matchS;
  });
  $("inventory-body").innerHTML = rows.map((i) => {
    const st = statusOf(i);
    const d = daysToExpiry(i.expiry);
    return `<tr>
      <td><span class="item-name">${i.name}</span><span class="item-meta">${i.supplier} · ${i.shelf || "—"}</span></td>
      <td>${i.sku}</td>
      <td>${i.category}</td>
      <td>${i.qty}</td>
      <td>${i.unit}</td>
      <td>${rupee(i.price)}</td>
      <td>${i.expiry}${d <= 60 ? ` (${d}d)` : ""}</td>
      <td><span class="badge ${st.cls}">${st.label}</span></td>
      <td class="row-actions">
        <button class="btn btn-ghost" data-edit="${i.id}">Edit</button>
        <button class="btn btn-danger" data-del="${i.id}">Delete</button>
      </td>
    </tr>`;
  }).join("") || `<tr><td colspan="9">No medicines match your filters.</td></tr>`;
}

function fillStockSelect() {
  $("stock-item").innerHTML = items.map((i) => `<option value="${i.id}">${i.name} (${i.qty} ${i.unit})</option>`).join("");
}

function renderMoves() {
  $("movement-list").innerHTML = moves.length
    ? moves.map((m) => `<li><span><strong>${m.action === "in" ? "IN" : "OUT"}</strong> ${m.name} × ${m.qty}<span class="item-meta"> ${m.note || ""}</span></span><span class="item-meta">${m.at}</span></li>`).join("")
    : "<li>No stock movements yet.</li>";
}

function renderAlerts() {
  const low = items.filter((i) => i.qty <= i.reorder);
  const exp = items.filter((i) => daysToExpiry(i.expiry) <= 60);
  $("low-list").innerHTML = low.length
    ? low.map((i) => `<li><span>${i.name}</span><span>${i.qty}/${i.reorder} ${i.unit}</span></li>`).join("")
    : "<li>No low-stock items.</li>";
  $("expiry-list").innerHTML = exp.length
    ? exp.map((i) => `<li><span>${i.name}</span><span>${i.expiry} (${daysToExpiry(i.expiry)} days)</span></li>`).join("")
    : "<li>Nothing expiring soon.</li>";
}

function renderAll() {
  renderCategories();
  renderDashboard();
  renderInventory();
  fillStockSelect();
  renderMoves();
  renderAlerts();
}

function openModal(item) {
  $("modal").classList.remove("hidden");
  $("modal-title").textContent = item ? "Edit medicine" : "Add medicine";
  $("item-id").value = item?.id || "";
  $("item-name").value = item?.name || "";
  $("item-sku").value = item?.sku || "";
  $("item-category").value = item?.category || "OTC";
  $("item-unit").value = item?.unit || "strips";
  $("item-qty").value = item?.qty ?? 0;
  $("item-reorder").value = item?.reorder ?? 10;
  $("item-price").value = item?.price ?? 0;
  $("item-expiry").value = item?.expiry || "";
  $("item-supplier").value = item?.supplier || "";
  $("item-shelf").value = item?.shelf || "";
}

function closeModal() {
  $("modal").classList.add("hidden");
  $("item-form").reset();
}

const titles = {
  dashboard: ["Dashboard", "Overview of pharmacy stock"],
  inventory: ["Inventory", "Search, filter, and manage medicines"],
  stock: ["Stock In / Out", "Receive deliveries or dispense stock"],
  alerts: ["Alerts", "Low stock and near-expiry medicines"]
};

document.querySelectorAll(".nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    const view = btn.dataset.view;
    document.querySelectorAll(".view").forEach((v) => v.classList.add("hidden"));
    $(`view-${view}`).classList.remove("hidden");
    $("page-title").textContent = titles[view][0];
    $("page-sub").textContent = titles[view][1];
  });
});

$("login-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const user = $("login-user").value.trim();
  const pass = $("login-pass").value;
  if (user === AUTH.username && pass === AUTH.password) {
    localStorage.setItem(KEYS.session, "1");
    $("login-error").classList.add("hidden");
    showApp();
  } else {
    $("login-error").textContent = "Invalid username or password.";
    $("login-error").classList.remove("hidden");
  }
});

$("logout-btn").addEventListener("click", () => {
  localStorage.removeItem(KEYS.session);
  showLogin();
});

$("add-item-btn").addEventListener("click", () => openModal(null));
$("cancel-modal").addEventListener("click", closeModal);
$("modal").addEventListener("click", (e) => { if (e.target.id === "modal") closeModal(); });

$("item-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const data = {
    id: $("item-id").value || String(Date.now()),
    name: $("item-name").value.trim(),
    sku: $("item-sku").value.trim(),
    category: $("item-category").value,
    unit: $("item-unit").value,
    qty: Number($("item-qty").value),
    reorder: Number($("item-reorder").value),
    price: Number($("item-price").value),
    expiry: $("item-expiry").value,
    supplier: $("item-supplier").value.trim(),
    shelf: $("item-shelf").value.trim()
  };
  const idx = items.findIndex((i) => i.id === data.id);
  if (idx >= 0) items[idx] = data;
  else items.unshift(data);
  persist();
  renderAll();
  closeModal();
  toast(idx >= 0 ? "Medicine updated" : "Medicine added");
});

$("inventory-body").addEventListener("click", (e) => {
  const editId = e.target.dataset.edit;
  const delId = e.target.dataset.del;
  if (editId) openModal(items.find((i) => i.id === editId));
  if (delId) {
    const item = items.find((i) => i.id === delId);
    if (confirm(`Delete ${item.name}?`)) {
      items = items.filter((i) => i.id !== delId);
      persist();
      renderAll();
      toast("Medicine deleted");
    }
  }
});

["search", "filter-category", "filter-stock"].forEach((id) => {
  $(id).addEventListener("input", renderInventory);
  $(id).addEventListener("change", renderInventory);
});

$("stock-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const id = $("stock-item").value;
  const action = $("stock-action").value;
  const qty = Number($("stock-qty").value);
  const note = $("stock-note").value.trim();
  const item = items.find((i) => i.id === id);
  if (!item) return;
  if (action === "out" && qty > item.qty) {
    toast("Not enough stock to dispense");
    return;
  }
  item.qty += action === "in" ? qty : -qty;
  moves.unshift({
    name: item.name,
    action,
    qty,
    note,
    at: new Date().toLocaleString("en-IN")
  });
  persist();
  renderAll();
  $("stock-form").reset();
  fillStockSelect();
  toast(action === "in" ? "Stock received" : "Stock dispensed");
});

function tick() {
  $("clock").textContent = new Date().toLocaleString("en-IN");
}

load();
tick();
setInterval(tick, 1000);
if (localStorage.getItem(KEYS.session) === "1") showApp();
else showLogin();
