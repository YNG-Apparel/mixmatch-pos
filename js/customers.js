import { loadLayout, showToast, toNumber } from './utils.js';
import { supabase } from '../services/supabase.js';
import { ensureRoleAccess } from '../services/roleAuth.js';

async function loadCustomers() {
  const query = document.getElementById('customerSearch')?.value.trim();
  let builder = supabase.from('customers').select('*').order('customer_name');
  if (query) builder = builder.or(`customer_name.ilike.%${query}%,phone.ilike.%${query}%`);
  const { data, error } = await builder;
  if (error) {
    showToast('Gagal memuat daftar pelanggan.', 'danger');
    return;
  }
  const tbody = document.getElementById('customersTable');
  if (!tbody) return;
  tbody.innerHTML = (data || []).map(customer => `
    <tr>
      <td>${customer.customer_name}</td>
      <td>${customer.phone || '-'}</td>
      <td>${customer.address || '-'}</td>
      <td>${toNumber(customer.total_spending)}</td>
      <td>${customer.loyalty_points}</td>
      <td><button class="btn btn-sm btn-outline-secondary" data-id="${customer.id}">Detail</button></td>
    </tr>
  `).join('');
}

async function submitCustomer(event) {
  event.preventDefault();
  const name = document.getElementById('customerNameInput').value.trim();
  const phone = document.getElementById('customerPhoneInput').value.trim();
  const address = document.getElementById('customerAddressInput').value.trim();
  const notes = document.getElementById('customerNotesInput').value.trim();
  if (!name) {
    showToast('Nama pelanggan wajib diisi.', 'danger');
    return;
  }
  const { error } = await supabase.from('customers').insert({ customer_name: name, phone, address, notes });
  if (error) {
    showToast('Gagal menyimpan pelanggan.', 'danger');
    return;
  }
  showToast('Pelanggan berhasil ditambahkan.', 'success');
  document.getElementById('customerForm').reset();
  const modal = bootstrap.Modal.getInstance(document.getElementById('customerModal'));
  modal?.hide();
  loadCustomers();
}

async function initCustomers() {
  const profile = await ensureRoleAccess('customers');
  if (!profile) return;
  await loadLayout('Pelanggan');
  loadCustomers();
  document.getElementById('searchCustomerButton').addEventListener('click', loadCustomers);
  document.getElementById('customerForm').addEventListener('submit', submitCustomer);
}

window.addEventListener('DOMContentLoaded', initCustomers);
