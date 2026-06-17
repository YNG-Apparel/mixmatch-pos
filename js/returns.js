import { loadLayout, showToast, toTanggal } from './utils.js';
import { supabase } from '../services/supabase.js';
import { ensureRoleAccess } from '../services/roleAuth.js';

async function loadReturns() {
  const { data, error } = await supabase.from('returns').select('id, original_sale_id, customer_id, return_reason, total_refund, created_at, cashier_id, customers(customer_name)').order('created_at', { ascending: false });
  if (error) {
    showToast('Gagal memuat data retur.', 'danger');
    return;
  }
  const tbody = document.getElementById('returnsTable');
  if (!tbody) return;
  tbody.innerHTML = (data || []).map(ret => `
    <tr>
      <td>RET-${ret.id}</td>
      <td>${ret.customers?.customer_name || '-'}</td>
      <td>${ret.original_sale_id || '-'}</td>
      <td>${toNumber(ret.total_refund)}</td>
      <td>${ret.return_reason || '-'}</td>
      <td>${ret.cashier_id || '-'}</td>
      <td>${toTanggal(ret.created_at)}</td>
    </tr>
  `).join('');
}

function toNumber(value) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value) || 0);
}

async function submitReturn(event) {
  event.preventDefault();
  const receipt = document.getElementById('originalReceipt').value.trim();
  const customerName = document.getElementById('returnCustomer').value.trim();
  const productCode = document.getElementById('returnProduct').value.trim();
  const quantity = Number(document.getElementById('returnQuantity').value) || 0;
  const amount = Number(document.getElementById('returnAmount').value) || 0;
  const reason = document.getElementById('returnReason').value.trim();
  if (!receipt || !productCode || quantity < 1) {
    showToast('Lengkapi semua kolom wajib.', 'danger');
    return;
  }

  const { data: customer } = await supabase.from('customers').select('id').ilike('customer_name', `%${customerName}%`).limit(1);
  const customerId = customer?.[0]?.id || null;
  const { data: product } = await supabase.from('products').select('id').ilike('product_code', `%${productCode}%`).limit(1);
  const productId = product?.[0]?.id || null;
  if (!productId) {
    showToast('Produk untuk retur tidak ditemukan.', 'danger');
    return;
  }

  const { data: newReturn, error } = await supabase.from('returns').insert({
    original_sale_id: receipt,
    customer_id: customerId,
    return_reason: reason,
    total_refund: amount,
    status: 'Returned'
  }).select('id').single();

  if (error || !newReturn) {
    showToast('Gagal menyimpan retur.', 'danger');
    return;
  }

  await supabase.from('return_items').insert({
    return_id: newReturn.id,
    product_id: productId,
    quantity,
    amount,
    notes: reason
  });

  const { data: stockProduct } = await supabase.from('products').select('current_stock').eq('id', productId).single();
  const newStock = (stockProduct?.current_stock || 0) + quantity;
  await supabase.from('products').update({ current_stock: newStock }).eq('id', productId);
  await supabase.from('inventory_logs').insert({
    product_id: productId,
    action_type: 'Return',
    quantity_before: stockProduct?.current_stock || 0,
    quantity_changed: quantity,
    quantity_after: newStock,
    notes: `Retur ${receipt}`
  });

  showToast('Retur berhasil dicatat.', 'success');
  document.getElementById('returnForm').reset();
  const modal = bootstrap.Modal.getInstance(document.getElementById('returnModal'));
  modal?.hide();
  loadReturns();
}

async function initReturns() {
  const profile = await ensureRoleAccess('returns');
  if (!profile) return;
  await loadLayout('Retur');
  document.getElementById('returnForm').addEventListener('submit', submitReturn);
  loadReturns();
}

window.addEventListener('DOMContentLoaded', initReturns);
