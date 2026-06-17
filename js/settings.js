import { loadLayout, showToast } from './utils.js';
import { supabase, getProfile } from '../services/supabase.js';
import { ensureRoleAccess } from '../services/roleAuth.js';

async function loadProfile() {
  const profile = await getProfile();
  if (!profile) return;
  document.getElementById('profileFullName').value = profile.full_name || '';
  document.getElementById('profileEmail').value = profile.email || '';
  document.getElementById('profilePhone').value = profile.phone || '';
  document.getElementById('profileAddress').value = profile.address || '';
}

async function saveSettings(event) {
  event.preventDefault();
  const profile = await getProfile();
  if (!profile) return;
  const fullName = document.getElementById('profileFullName').value.trim();
  const phone = document.getElementById('profilePhone').value.trim();
  const address = document.getElementById('profileAddress').value.trim();
  if (!fullName) {
    showToast('Nama lengkap wajib diisi.', 'danger');
    return;
  }
  const { error } = await supabase.from('profiles').update({ full_name: fullName, phone, address }).eq('id', profile.id);
  if (error) {
    showToast('Gagal menyimpan pengaturan.', 'danger');
    return;
  }
  showToast('Pengaturan berhasil disimpan.', 'success');
}

async function initSettings() {
  const profile = await ensureRoleAccess('settings');
  if (!profile) return;
  await loadLayout('Pengaturan');
  await loadProfile();
  document.getElementById('settingsForm').addEventListener('submit', saveSettings);
}

window.addEventListener('DOMContentLoaded', initSettings);
