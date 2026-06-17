import { loadLayout, showToast } from './utils.js';
import { supabase, getProfile } from '../services/supabase.js';
import { ensureRoleAccess } from '../services/roleAuth.js';

async function loadStaff() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, phone, role_id, roles(name)')
    .order('full_name');

  if (error) {
    showToast('Gagal memuat daftar staf.', 'danger');
    return;
  }

  const tbody = document.getElementById('staffTable');
  if (!tbody) return;

  if (!data || data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">Tidak ada staf</td></tr>';
    return;
  }

  tbody.innerHTML = data.map(staff => `
    <tr>
      <td>${staff.full_name}</td>
      <td>${staff.email}</td>
      <td>${staff.username || '-'}</td>
      <td><span class="badge bg-info">${staff.roles?.name || 'Unknown'}</span></td>
      <td>${staff.phone || '-'}</td>
      <td>
        <button class="btn btn-sm btn-outline-secondary" disabled>Edit</button>
      </td>
    </tr>
  `).join('');
}

async function submitStaff(event) {
  event.preventDefault();
  const name = document.getElementById('staffName').value.trim();
  const email = document.getElementById('staffEmail').value.trim();
  const username = document.getElementById('staffUsername').value.trim();
  const password = document.getElementById('staffPassword').value;
  const roleId = Number(document.getElementById('staffRole').value);
  const phone = document.getElementById('staffPhone').value.trim();

  if (!name || !email || !username || !password) {
    showToast('Lengkapi semua kolom wajib.', 'danger');
    return;
  }

  try {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name }
      }
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('User creation failed');

    const { error: profileError } = await supabase.from('profiles').insert({
      id: authData.user.id,
      email,
      full_name: name,
      phone,
      role_id: roleId,
      username
    });

    if (profileError) throw profileError;

    showToast('Staf berhasil ditambahkan.', 'success');
    document.getElementById('staffForm').reset();
    const modal = bootstrap.Modal.getInstance(document.getElementById('staffModal'));
    modal?.hide();
    loadStaff();
  } catch (error) {
    showToast(`Error: ${error.message}`, 'danger');
  }
}

async function initStaff() {
  const profile = await ensureRoleAccess('staff');
  if (!profile) return;
  await loadLayout('Kelola Staf');
  await loadStaff();
  document.getElementById('staffForm').addEventListener('submit', submitStaff);
}

window.addEventListener('DOMContentLoaded', initStaff);
