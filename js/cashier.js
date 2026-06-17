import { loadLayout, showToast, toRupiah } from './utils.js';
import { supabase, getProfile } from '../services/supabase.js';
import { ensureRoleAccess } from '../services/roleAuth.js';

const cart = [];

function renderCart() {
  const tbody = document.getElementById('cartTable');
  if (!tbody) return;
  tbody.innerHTML = cart.map((item, index) => `
    <tr>
      <td>${item.product_code}</td>
      <td>${item.product_name}</td>
      <td><input type="number" min="1" value="${item.quantity}" data-index="${index}" class="form-control form-control-sm cart-qty" style="width: 80px;" /></td>
      <td>${toRupiah(item.unit_price)}</td>
      <td><input type="number" min="0" value="${item.discount}" data-index="${index}" class="form-control form-control-sm cart-discount" style="width: 80px;" /></td>
      <td>${toRupiah(item.subtotal)}</td>
      <td><button class="btn btn-sm btn-outline-danger remove-item" data-index="${index}">Hapus</button></td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.cart-qty').forEach(input => {
    input.addEventListener('change', event => {
      const index = Number(event.target.dataset.index);
      cart[index].quantity = Number(event.target.value) || 1;
      cart[index].subtotal = (cart[index].unit_price * cart[index].quantity) - cart[index].discount;
      renderCart();
    });
  });
  tbody.querySelectorAll('.cart-discount').forEach(input => {
    input.addEventListener('change', event => {
      const index = Number(event.target.dataset.index);
      cart[index].discount = Number(event.target.value) || 0;
      cart[index].subtotal = (cart[index].unit_price * cart[index].quantity) - cart[index].discount;
      renderCart();
    });
  });
  tbody.querySelectorAll('.remove-item').forEach(button => {
    button.addEventListener('click', () => {
      cart.splice(Number(button.dataset.index), 1);
      renderCart();
    });
  });
  updateTotals();
}

function updateTotals() {
  const subtotal = cart.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  const transactionDiscount = Number(document.getElementById('transactionDiscount').value) || 0;
  const total = subtotal - transactionDiscount;
  document.getElementById('subtotalValue').textContent = toRupiah(subtotal);
  document.getElementById('totalValue').textContent = toRupiah(total > 0 ? total : 0);
}

async function findProduct() {
  const searchTerm = document.getElementById('productSearch').value.trim();
  if (!searchTerm) {
    showToast('Masukkan Kode Produk atau Nama Produk.', 'warning');
    return;
  }
  const { data, error } = await supabase.from('products').select('*').or(`product_code.ilike.%${searchTerm}%,product_name.ilike.%${searchTerm}%`).limit(5);
  if (error || !data?.length) {
    showToast('Produk tidak ditemukan.', 'warning');
    return;
  }
  const product = data[0];
  const quantity = Number(prompt(`Masukkan jumlah untuk ${product.product_code} - ${product.product_name}`, '1')) || 1;
  if (quantity < 1 || quantity > product.current_stock) {
    showToast('Jumlah tidak valid atau melebihi stok tersedia.', 'danger');
    return;
  }
  const discount = Number(prompt('Masukkan diskon per item (Rp)', '0')) || 0;
  const existing = cart.find(item => item.product_id === product.id);
  if (existing) {
    existing.quantity += quantity;
    existing.discount += discount;
    existing.subtotal = (existing.unit_price * existing.quantity) - existing.discount;
  } else {
    cart.push({
      product_id: product.id,
      product_code: product.product_code,
      product_name: product.product_name,
      quantity,
      unit_price: Number(product.selling_price),
      cost_price: Number(product.cost_price),
      discount,
      subtotal: (Number(product.selling_price) * quantity) - discount
    });
  }
  renderCart();
}

async function completePayment() {
  if (!cart.length) {
    showToast('Keranjang masih kosong.', 'warning');
    return;
  }
  const profile = await getProfile();
  if (!profile) {
    window.location.href = 'login.html';
    return;
  }
  const customerName = document.getElementById('customerName').value.trim();
  const paymentMethod = document.getElementById('paymentMethod').value;
  const notes = document.getElementById('transactionNotes').value.trim();
  const transactionDiscount = Number(document.getElementById('transactionDiscount').value) || 0;
  const subtotal = cart.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  const total = subtotal - transactionDiscount;
  if (total <= 0) {
    showToast('Total transaksi tidak valid.', 'danger');
    return;
  }

  let customerId = null;
  if (customerName) {
    const { data } = await supabase.from('customers').select('id').ilike('customer_name', `%${customerName}%`).limit(1);
    customerId = data?.[0]?.id || null;
    if (!customerId) {
      const { data: insertCustomer } = await supabase.from('customers').insert({ customer_name: customerName }).select('id').single();
      customerId = insertCustomer?.id || null;
    }
  }

  const receiptNumber = `BTQ-${Date.now()}`;
  const totalCost = cart.reduce((sum, item) => sum + item.cost_price * item.quantity, 0);
  const totalProfit = total - totalCost;

  const { data: saleData, error: saleError } = await supabase.from('sales').insert({
    receipt_number: receiptNumber,
    customer_id: customerId,
    cashier_id: profile.id,
    total_amount: total,
    total_cost: totalCost,
    total_profit: totalProfit,
    total_discount: transactionDiscount,
    payment_method: paymentMethod,
    transaction_notes: notes
  }).select('id').single();

  if (saleError || !saleData) {
    showToast('Gagal menyimpan transaksi.', 'danger');
    return;
  }

  const saleItems = cart.map(item => ({
    sale_id: saleData.id,
    product_id: item.product_id,
    product_code: item.product_code,
    product_name: item.product_name,
    quantity: item.quantity,
    unit_price: item.unit_price,
    cost_price: item.cost_price,
    discount: item.discount,
    subtotal: item.subtotal
  }));
  const { error: itemError } = await supabase.from('sale_items').insert(saleItems);
  await supabase.from('payments').insert({ sale_id: saleData.id, payment_method: paymentMethod, amount: total });

  if (itemError) {
    showToast('Transaksi berhasil, tetapi ada kesalahan saat menyimpan item.', 'warning');
  }

  for (const item of cart) {
    const { data: product, error: productError } = await supabase.from('products').select('current_stock').eq('id', item.product_id).single();
    if (productError) continue;
    const newStock = Number(product.current_stock) - item.quantity;
    await supabase.from('products').update({ current_stock: newStock >= 0 ? newStock : 0 }).eq('id', item.product_id);
    await supabase.from('inventory_logs').insert({
      product_id: item.product_id,
      action_type: 'Stock Out',
      quantity_before: product.current_stock,
      quantity_changed: -item.quantity,
      quantity_after: newStock >= 0 ? newStock : 0,
      notes: `Penjualan ${receiptNumber}`
    });
  }

  showToast('Transaksi berhasil disimpan.', 'success');
  cart.length = 0;
  renderCart();
}

async function initCashier() {
  const profile = await ensureRoleAccess('cashier');
  if (!profile) return;
  await loadLayout('Kasir');
  document.getElementById('searchProductButton').addEventListener('click', findProduct);
  document.getElementById('productSearch').addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      findProduct();
    }
  });
  document.getElementById('transactionDiscount').addEventListener('change', updateTotals);
  document.getElementById('completePayment').addEventListener('click', completePayment);
  renderCart();
}

window.addEventListener('DOMContentLoaded', initCashier);
