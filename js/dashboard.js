import { loadLayout, showToast, toRupiah } from "./utils.js";
import { supabase } from "../services/supabase.js";
import { ensureRoleAccess } from "../services/roleAuth.js";

function getDateRange() {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfDay.getDate() - 6);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  return { startOfDay, startOfWeek, startOfMonth };
}

async function fetchDashboardData() {
  const { startOfDay, startOfWeek, startOfMonth } = getDateRange();

  const [
    { data: daily },
    { data: weekly },
    { data: monthly },
    { data: products },
    { data: lowStock },
    { data: topProducts },
    { data: recent },
  ] = await Promise.all([
    supabase
      .from("sales")
      .select("total_amount, total_profit")
      .gte("created_at", startOfDay.toISOString()),
    supabase
      .from("sales")
      .select("total_amount, total_profit")
      .gte("created_at", startOfWeek.toISOString()),
    supabase
      .from("sales")
      .select("total_amount, total_profit")
      .gte("created_at", startOfMonth.toISOString()),
    supabase.from("products").select("id, current_stock"),
    supabase
      .from("products")
      .select("product_code, product_name, current_stock, min_stock_level"),
    supabase
      .from("sale_items")
      .select("product_code, product_name, quantity")
      .order("quantity", { ascending: false })
      .limit(5),
    supabase
      .from("sales")
      .select("receipt_number, payment_method, total_amount, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const calculateTotal = (arr) =>
    arr.reduce((sum, item) => sum + Number(item.total_amount || 0), 0);
  const calculateProfit = (arr) =>
    arr.reduce((sum, item) => sum + Number(item.total_profit || 0), 0);
  console.log("DAILY SALES:", daily);
  console.log("WEEKLY SALES:", weekly);
  console.log("MONTHLY SALES:", monthly);

  const monthlySalesValue = calculateTotal(monthly || []);
  const monthlyProfitValue = calculateProfit(monthly || []);

  const margin =
    monthlySalesValue > 0 ? (monthlyProfitValue / monthlySalesValue) * 100 : 0;

  const lowStockProducts = (lowStock || []).filter(
    (p) => Number(p.current_stock) <= Number(p.min_stock_level),
  );

  return {
    dailySales: calculateTotal(daily || []),
    weeklySales: calculateTotal(weekly || []),
    monthlySales: monthlySalesValue,
    dailyProfit: calculateProfit(daily || []),
    monthlyProfit: monthlyProfitValue,
    margin,
    productCount: products?.length || 0,
    totalStock: products?.reduce(
      (sum, item) => sum + Number(item.current_stock || 0),
      0,
    ),
    lowStock: lowStockProducts,
    topProducts: topProducts || [],
    recentTransactions: recent || [],
  };
}

function renderSummary(summary) {
  const summaryContainer = document.getElementById("dashboardSummary");
  if (!summaryContainer) return;
  summaryContainer.innerHTML = `
  <div class="col-lg-3 col-sm-6">
    <div class="card p-3 shadow-sm">
      <div class="text-muted">Omzet Hari Ini</div>
      <div class="fs-4 fw-bold">${toRupiah(summary.dailySales)}</div>
    </div>
  </div>

  <div class="col-lg-3 col-sm-6">
    <div class="card p-3 shadow-sm">
      <div class="text-muted">Omzet Bulan Ini</div>
      <div class="fs-4 fw-bold">${toRupiah(summary.monthlySales)}</div>
    </div>
  </div>

  <div class="col-lg-3 col-sm-6">
    <div class="card p-3 shadow-sm">
      <div class="text-muted">Laba Bersih Bulan Ini</div>
      <div class="fs-4 fw-bold text-success">
        ${toRupiah(summary.monthlyProfit)}
      </div>
    </div>
  </div>

  <div class="col-lg-3 col-sm-6">
  <div class="card p-3 shadow-sm">
    <div class="text-muted">Margin Bulan Ini</div>
    <div class="fs-4 fw-bold text-primary">
      ${summary.margin.toFixed(1)}%
    </div>
  </div>
</div>
<div class="col-lg-3 col-sm-6">
  <div class="card p-3 shadow-sm">
    <div class="text-muted">Total Stok</div>
    <div class="fs-4 fw-bold">
      ${summary.totalStock}
    </div>
  </div>
</div>
`;
}

function renderLowStock(lowStock) {
  const container = document.getElementById("lowStockAlerts");
  if (!container) return;
  if (!lowStock.length) {
    container.innerHTML =
      '<div class="text-success">Tidak ada produk hampir habis.</div>';
    return;
  }
  container.innerHTML = lowStock
    .slice(0, 5)
    .map(
      (product) => `
    <div class="border-bottom py-2">
      <div class="fw-semibold">${product.product_code} - ${product.product_name}</div>
      <div class="small text-muted">Stok: ${product.current_stock}, Ambang: ${product.min_stock_level}</div>
    </div>
  `,
    )
    .join("");
}

function renderTopProducts(topProducts) {
  const tbody = document.getElementById("topProducts");
  if (!tbody) return;
  tbody.innerHTML = topProducts
    .map(
      (item) => `
    <tr>
      <td>${item.product_code}</td>
      <td>${item.product_name}</td>
      <td>${item.quantity}</td>
    </tr>
  `,
    )
    .join("");
}

function renderRecentTransactions(transactions) {
  const list = document.getElementById("recentTransactions");
  if (!list) return;
  list.innerHTML = transactions
    .map(
      (tx) => `
    <li class="list-group-item">
      <div class="d-flex justify-content-between">
        <div>
          <div class="fw-semibold">${tx.receipt_number}</div>
          <div class="small text-muted">${toRupiah(tx.total_amount)} · ${tx.payment_method}</div>
        </div>
        <div class="small text-muted">${new Date(tx.created_at).toLocaleDateString("id-ID")}</div>
      </div>
    </li>
  `,
    )
    .join("");
}

async function renderChart() {
  const start = new Date();
  start.setDate(start.getDate() - 6);
  const { data } = await supabase
    .from("sales")
    .select("created_at, total_amount")
    .gte("created_at", start.toISOString())
    .order("created_at", { ascending: true });
  const counts = {};
  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const key = date.toLocaleDateString("id-ID");
    counts[key] = 0;
  }
  (data || []).forEach((row) => {
    const key = new Date(row.created_at).toLocaleDateString("id-ID");
    counts[key] = (counts[key] || 0) + Number(row.total_amount || 0);
  });

  const ctx = document.getElementById("salesChart");
  if (!ctx) return;
  new Chart(ctx, {
    type: "line",
    data: {
      labels: Object.keys(counts),
      datasets: [
        {
          label: "Penjualan (Rp)",
          data: Object.values(counts),
          borderColor: "#0d6efd",
          backgroundColor: "rgba(13,110,253,0.2)",
          fill: true,
          tension: 0.3,
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        y: {
          ticks: {
            callback: (value) =>
              new Intl.NumberFormat("id-ID", {
                style: "currency",
                currency: "IDR",
                maximumFractionDigits: 0,
              }).format(value),
          },
        },
      },
    },
  });
}

async function initDashboard() {
  const profile = await ensureRoleAccess("dashboard");
  if (!profile) return;
  await loadLayout("Dashboard");
  const summary = await fetchDashboardData();
  if (!summary) {
    showToast("Tidak dapat memuat data dashboard.", "danger");
    return;
  }
  renderSummary(summary);
  renderLowStock(summary.lowStock);
  renderTopProducts(summary.topProducts);
  renderRecentTransactions(summary.recentTransactions);
  await renderChart();
}

window.addEventListener("DOMContentLoaded", initDashboard);
