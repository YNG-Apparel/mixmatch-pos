import { loadLayout, showToast, toRupiah, toTanggal } from './utils.js';
import { supabase, getProfile } from '../services/supabase.js';
import { ensureRoleAccess } from '../services/roleAuth.js';

async function loadSalesHistory() {
  const profile = await getProfile();
  if (!profile) return;

  const { data, error } = await supabase
    .from('sales')
    .select('id, receipt_number, created_at, total_amount, payment_method, status')
    .eq('cashier_id', profile.id)
    .order('created_at', { ascending: false });

  if (error) {
    showToast('Gagal memuat riwayat penjualan.', 'danger');
    return;
  }

  const tbody = document.getElementById('salesTable');
  if (!tbody) return;

  if (!data || data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">Tidak ada transaksi</td></tr>';
    return;
  }

  tbody.innerHTML = data.map(sale => `
    <tr>
      <td><strong>${sale.receipt_number}</strong></td>
      <td>${new Date(sale.created_at).toLocaleDateString('id-ID')} ${new Date(sale.created_at).toLocaleTimeString('id-ID')}</td>
      <td>${toRupiah(sale.total_amount)}</td>
      <td>${sale.payment_method}</td>
      <td><span class="badge bg-success">${sale.status}</span></td>
    </tr>
  `).join('');
}

async function initSalesHistory() {
  const profile = await ensureRoleAccess('sales-history');
  if (!profile) return;
  await loadLayout('Riwayat Penjualan');
  await loadSalesHistory();
}

window.addEventListener('DOMContentLoaded', initSalesHistory);
