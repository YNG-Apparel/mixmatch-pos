import { loadLayout, showToast, toTanggal } from "./utils.js";
import { supabase } from "../services/supabase.js";
import { ensureRoleAccess } from "../services/roleAuth.js";

let editingId = null;

async function loadCategories() {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name");
  if (error) {
    showToast("Gagal memuat kategori.", "danger");
    return;
  }
  const tbody = document.getElementById("categoriesTable");
  if (!tbody) return;
  tbody.innerHTML = (data || [])
    .map(
      (category) => `
    <tr>
      <td>${category.name}</td>
      <td>${category.description || "-"}</td>
      <td>${toTanggal(category.created_at)}</td>
      <td>
        <button type="button" class="btn btn-sm btn-outline-primary me-1" data-action="edit" data-id="${category.id}" data-name="${category.name}" data-description="${category.description || ""}">Ubah</button>
        <button
        type="button"
        class="btn btn-sm btn-outline-danger"
        data-action="delete"
        data-id="${category.id}"
        data-name="${category.name}">
        Hapus
        </button>
      </td>
    </tr>
  `,
    )
    .join("");
  tbody.querySelectorAll("button").forEach((button) => {
    const action = button.dataset.action;
    const id = button.dataset.id;
    if (action === "edit") {
      button.addEventListener("click", () =>
        openEditModal(id, button.dataset.name, button.dataset.description),
      );
    }
    if (action === "delete") {
      button.addEventListener("click", async () => {
        if (!confirm("Yakin ingin menghapus kategori ini?")) {
          return;
        }

        // cek apakah masih dipakai produk
        const { data: products, error: checkError } = await supabase
          .from("products")
          .select("id")
          .eq("category_id", id);

        if (checkError) {
          showToast("Gagal mengecek kategori.", "danger");
          return;
        }

        if (products.length > 0) {
          showToast(
            "Kategori tidak dapat dihapus karena masih digunakan oleh produk.",
            "warning",
          );
          return;
        }

        const { error } = await supabase
          .from("categories")
          .delete()
          .eq("id", id);

        if (error) {
          showToast(error.message, "danger");
          return;
        }

        showToast("Kategori berhasil dihapus.", "success");
        loadCategories();
      });
    }
  });
}

function openEditModal(id, name, description) {
  editingId = id;
  document.getElementById("categoryModalLabel").textContent = "Ubah Kategori";
  document.getElementById("categoryName").value = name;
  document.getElementById("categoryDescription").value = description;
  const modal = new bootstrap.Modal(document.getElementById("categoryModal"));
  modal.show();
}

async function handleCategorySubmit(event) {
  event.preventDefault();
  const name = document.getElementById("categoryName").value.trim();
  const description = document
    .getElementById("categoryDescription")
    .value.trim();
  if (!name) {
    showToast("Nama kategori wajib diisi.", "danger");
    return;
  }

  let response;
  if (editingId) {
    response = await supabase
      .from("categories")
      .update({ name, description })
      .eq("id", editingId);
  } else {
    response = await supabase.from("categories").insert({ name, description });
  }
  if (response.error) {
    showToast(response.error.message || "Gagal menyimpan kategori.", "danger");
    return;
  }

  editingId = null;
  document.getElementById("categoryModalLabel").textContent = "Tambah Kategori";
  document.getElementById("categoryForm").reset();
  const modal = bootstrap.Modal.getInstance(
    document.getElementById("categoryModal"),
  );
  modal?.hide();
  showToast("Kategori berhasil disimpan.", "success");
  loadCategories();
}

async function initCategories() {
  const profile = await ensureRoleAccess("categories");
  if (!profile) return;
  await loadLayout("Kategori");
  document
    .getElementById("categoryForm")
    .addEventListener("submit", handleCategorySubmit);
  loadCategories();
}

window.addEventListener("DOMContentLoaded", initCategories);
