import { loadLayout, showToast, toRupiah, toNumber } from './utils.js';
import { supabase } from '../services/supabase.js';
import { ensureRoleAccess } from '../services/roleAuth.js';

function renderCards(recommendations) {
  const container = document.getElementById('analyticsCards');
  if (!container) return;
  container.innerHTML = `
    <div class="col-md-4">
      <div class="card p-3">
        <h6>Produk Best Seller</h6>
        <div class="fs-5 fw-bold">${recommendations.bestSelling?.product_code || '-'}</div>
        <div class="text-muted">${recommendations.bestSelling?.quantity || 0} terjual</div>
      </div>
    </div>
    <div class="col-md-4">
      <div class="card p-3">
        <h6>Produk Profit Tertinggi</h6>
        <div class="fs-5 fw-bold">${recommendations.highestProfit?.product_code || '-'}</div>
        <div class="text-muted">${recommendations.highestProfit?.profit ? toRupiah(recommendations.highestProfit.profit) : '-'}</div>
      </div>
    </div>
    <div class="col-md-4">
      <div class="card p-3">
        <h6>Pertumbuhan Bulanan</h6>
        <div class="fs-5 fw-bold">${recommendations.monthlyGrowthTitle}</div>
        <div class="text-muted">${recommendations.monthlyGrowthValue}</div>
      </div>
    </div>
  `;
}

function renderProducts(list, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = (list || []).map(item => `
    <li class="list-group-item">
      <div class="d-flex justify-content-between">
        <span>${item.product_code} - ${item.product_name}</span>
        <span class="text-primary">${item.quantity || item.profit || 0}</span>
      </div>
    </li>
  `).join('');
}

function renderRecommendations(statements) {
  const container = document.getElementById('businessRecommendations');
  if (!container) return;
  container.innerHTML = statements.map(text => `<p class="mb-2">• ${text}</p>`).join('');
}

function toDateRange(days) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - days);
  return { start: start.toISOString(), end: end.toISOString() };
}

async function initAnalytics() {
  const profile = await ensureRoleAccess('analytics');
  if (!profile) return;
  await loadLayout('Analisis Bisnis');
  const { start: last30Start } = toDateRange(30);
  const { start: last60Start, end: last30End } = toDateRange(60);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  const [bestSellingRes, profitRes, salesRes, lastMonthRes] = await Promise.all([
    supabase.from('sale_items').select('product_code, product_name, quantity').gte('created_at', last30Start),
    supabase.from('sale_items').select('product_code, product_name, ((unit_price - cost_price) * quantity) as profit').gte('created_at', last30Start),
    supabase.from('sales').select('total_amount, total_profit').gte('created_at', monthStart),
    supabase.from('sales').select('total_amount').gte('created_at', lastMonthStart).lte('created_at', currentMonthEnd)
  ]);

  if (bestSellingRes.error || profitRes.error || salesRes.error || lastMonthRes.error) {
    showToast('Gagal memuat data analisis.', 'danger');
    return;
  }

  const groupByProduct = (items, key) => items.reduce((acc, item) => {
    const id = item.product_code;
    if (!acc[id]) acc[id] = { ...item, quantity: 0, profit: 0 };
    acc[id].quantity += Number(item.quantity || 0);
    acc[id].profit += Number(item.profit || 0);
    return acc;
  }, {});

  const bestSelling = Object.values(groupByProduct(bestSellingRes.data)).sort((a, b) => b.quantity - a.quantity)[0] || {};
  const highestProfit = Object.values(groupByProduct(profitRes.data)).sort((a, b) => b.profit - a.profit)[0] || {};
  const slowMoving = Object.values(groupByProduct(bestSellingRes.data)).sort((a, b) => a.quantity - b.quantity).slice(0, 5);

  const monthlyTotal = salesRes.data.reduce((sum, row) => sum + Number(row.total_amount || 0), 0);
  const lastMonthTotal = lastMonthRes.data.reduce((sum, row) => sum + Number(row.total_amount || 0), 0);
  const growth = lastMonthTotal ? ((monthlyTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0;

  renderCards({
    bestSelling,
    highestProfit,
    monthlyGrowthTitle: `${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%`,
    monthlyGrowthValue: `Dibanding bulan lalu`
  });
  renderProducts([bestSelling], 'bestSellingProducts');
  renderProducts(slowMoving, 'slowMovingProducts');

  const recommendations = [];
  if (bestSelling.product_code) {
    recommendations.push(`Produk ${bestSelling.product_code} merupakan produk dengan penjualan tertinggi bulan ini.`);
  }
  if (slowMoving.length) {
    recommendations.push(`Produk ${slowMoving[0]?.product_code || '---'} tidak memiliki penjualan selama 60 hari terakhir.`);
  }
  if (highestProfit.product_code) {
    recommendations.push(`Produk ${highestProfit.product_code} memberikan profit terbaik.`);
  }
  recommendations.push(`Lakukan pengecekan stok untuk produk dengan pertumbuhan penjualan lebih cepat dari bulan lalu.`);

  renderRecommendations(recommendations);
}

window.addEventListener('DOMContentLoaded', initAnalytics);
