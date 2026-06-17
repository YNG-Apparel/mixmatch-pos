import { loadLayout, showToast, toTanggal } from './utils.js';
import { supabase } from '../services/supabase.js';
import { ensureRoleAccess } from '../services/roleAuth.js';

async function loadProducts() {
  const { data, error } = await supabase.from('products').select('id, product_code, product_name, current_stock').order('product_code');
  if (error) {
    showToast('Gagal memuat daftar produk.', 'danger');
    return [];
  }
  const select = document.getElementById('inventoryProduct');
  if (!select) return [];
  select.innerHTML = `<option value="">Pilih produk</option>${(data || []).map(product => `<option value="${product.id}" data-stock="${product.current_stock}" data-name="${product.product_code} - ${product.product_name}">${product.product_code} - ${product.product_name}</option>`).join('')}`;
  return data || [];
}

function updateStockDisplay() {
  const productSelect = document.getElementById('inventoryProduct');
  const action = document.getElementById('inventoryAction').value;
  const quantity = Number(document.getElementById('inventoryQuantity').value) || 0;
  const selected = productSelect.selectedOptions[0];
  const currentStock = Number(selected?.dataset.stock || 0);
  const beforeField = document.getElementById('inventoryBefore');
  const afterField = document.getElementById('inventoryAfter');
  beforeField.value = currentStock;
  let after = currentStock;
  if (action === 'Stock In') after = currentStock + quantity;
  if (action === 'Stock Out') after = currentStock - quantity;
  if (action === 'Adjustment') after = currentStock + quantity;
  afterField.value = after < 0 ? 0 : after;
}

async function loadInventoryLogs() {
  const { data, error } = await supabase.from('inventory_logs').select('id, action_type, quantity_before, quantity_changed, quantity_after, notes, created_at, products(product_code, product_name), profiles(full_name)').order('created_at', { ascending: false }).limit(50);
  if (error) {
    showToast('Gagal memuat riwayat inventaris.', 'danger');
    return;
  }
  const tbody = document.getElementById('inventoryLogTable');
  if (!tbody) return;
  tbody.innerHTML = (data || []).map(log => `
    <tr>
      <td>${log.products?.product_code || '-'} - ${log.products?.product_name || '-'}</td>
      <td>${log.action_type}</td>
      <td>${log.quantity_before}</td>
      <td>${log.quantity_changed}</td>
      <td>${log.quantity_after}</td>
      <td>${log.profiles?.full_name || 'Sistem'}</td>
      <td>${toTanggal(log.created_at)}</td>
      <td>${log.notes || '-'}</td>
    </tr>
  `).join('');
}

async function submitInventory(event) {
  event.preventDefault();
  const productId = Number(document.getElementById('inventoryProduct').value);
  const actionType = document.getElementById('inventoryAction').value;
  const quantity = Number(document.getElementById('inventoryQuantity').value) || 0;
  const notes = document.getElementById('inventoryNotes').value.trim();

  if (!productId || !quantity) {
    showToast('Pilih produk dan masukkan jumlah yang valid.', 'danger');
    return;
  }

  const selected = document.querySelector('#inventoryProduct option:checked');
  const before = Number(selected.dataset.stock || 0);
  let after = before;
  if (actionType === 'Stock In') after = before + quantity;
  if (actionType === 'Stock Out') after = before - quantity;
  if (actionType === 'Adjustment') after = before + quantity;
  if (after < 0) {
    showToast('Jumlah stok tidak boleh negatif.', 'danger');
    return;
  }

  const { error: updateError } = await supabase.from('products').update({ current_stock: after }).eq('id', productId);
  if (updateError) {
    showToast('Gagal memperbarui stok produk.', 'danger');
    return;
  }

  const { error: logError } = await supabase.from('inventory_logs').insert({
    product_id: productId,
    action_type: actionType,
    quantity_before: before,
    quantity_changed: actionType === 'Stock Out' ? -quantity : quantity,
    quantity_after: after,
    notes
  });

  if (logError) {
    showToast('Gagal menyimpan log inventaris.', 'danger');
    return;
  }

  showToast('Log inventaris berhasil disimpan.', 'success');
  document.getElementById('inventoryForm').reset();
  loadProducts();
  loadInventoryLogs();
}

async function initInventory() {
  const profile = await ensureRoleAccess('inventory');
  if (!profile) return;
  await loadLayout('Inventaris');
  await loadProducts();
  await loadInventoryLogs();
  document.getElementById('inventoryProduct').addEventListener('change', updateStockDisplay);
  document.getElementById('inventoryAction').addEventListener('change', updateStockDisplay);
  document.getElementById('inventoryQuantity').addEventListener('input', updateStockDisplay);
  document.getElementById('inventoryForm').addEventListener('submit', submitInventory);
}

window.addEventListener('DOMContentLoaded', initInventory);
