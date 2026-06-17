import { loadLayout, showToast, toRupiah } from "./utils.js";
import { supabase } from "../services/supabase.js";
import { ensureRoleAccess } from "../services/roleAuth.js";

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

async function loadCategories() {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name")
    .order("name");

  console.log("CATEGORY DATA:", data);
  console.log("CATEGORY ERROR:", error);

  if (error) return [];

  return data || [];
}

async function loadProducts() {
  const searchText = document.querySelector("#searchInput")?.value.trim();
  const brand = document.querySelector("#brandFilter")?.value.trim();
  const color = document.querySelector("#colorFilter")?.value.trim();
  let query = supabase
    .from("products")
    .select(
      "id, product_code, product_name, brand, color, size, current_stock, selling_price, status, category_id, categories(name)",
    );

  if (searchText) {
    query = query.or(
      `product_code.ilike.%${searchText}%,product_name.ilike.%${searchText}%,brand.ilike.%${searchText}%,color.ilike.%${searchText}%`,
    );
  }
  if (brand) query = query.ilike("brand", `%${brand}%`);
  if (color) query = query.ilike("color", `%${color}%`);
  const { data, error } = await query.order("product_code");
  if (error) {
    showToast("Gagal memuat daftar produk.", "danger");
    return;
  }
  const tbody = document.getElementById("productsTable");
  if (!tbody) return;
  tbody.innerHTML = (data || [])
    .map(
      (product) => `
    <tr>
      <td>${product.product_code}</td>
      <td>${product.product_name}</td>
      <td>${product.categories?.name || "-"}</td>
      <td>${product.brand || "-"}</td>
      <td>${product.color || "-"}</td>
      <td>${product.size || "-"}</td>
      <td>${product.current_stock}</td>
      <td>${toRupiah(product.selling_price)}</td>
      <td>${product.status}</td>
      <td>
        <a href="product-form.html?id=${product.id}" class="btn btn-sm btn-outline-primary">Ubah</a>
        <button class="btn btn-sm btn-outline-danger ms-1" data-product-id="${product.id}">Hapus</button>
      </td>
    </tr>
  `,
    )
    .join("");
  tbody.querySelectorAll("button[data-product-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!confirm("Hapus produk ini?")) return;
      const id = button.dataset.productId;
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) {
        showToast("Gagal menghapus produk.", "danger");
        return;
      }
      showToast("Produk berhasil dihapus.", "success");
      loadProducts();
    });
  });
}

async function saveProduct(event) {
  event.preventDefault();
  const id = getQueryParam("id");
  const payload = {
    product_code: document.querySelector("#productCode").value.trim(),
    product_name: document.querySelector("#productName").value.trim(),
    category_id: Number(document.querySelector("#categoryId").value) || null,
    brand: "Mix & Match",
    color: document.querySelector("#color").value.trim(),
    size: document.querySelector("#size").value.trim(),
    material: document.querySelector("#material").value.trim(),
    cost_price: Number(document.querySelector("#costPrice").value) || 0,
    selling_price: Number(document.querySelector("#sellingPrice").value) || 0,
    current_stock: Number(document.querySelector("#currentStock").value) || 0,
    min_stock_level:
      Number(document.querySelector("#minStockLevel").value) || 0,
    notes: document.querySelector("#notes").value.trim(),
    status: document.querySelector("#status").value,
  };

  if (
    !payload.product_code ||
    !payload.product_name ||
    !payload.selling_price
  ) {
    showToast("Lengkapi semua kolom wajib.", "danger");
    return;
  }
  console.log("PAYLOAD:", payload);

  const {
    data: { session },
  } = await supabase.auth.getSession();

  console.log("SESSION:", session);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log("USER:", user);

  let response;
  if (id) {
    response = await supabase.from("products").update(payload).eq("id", id);
  } else {
    response = await supabase.from("products").insert(payload);
  }

  if (response.error) {
    showToast(response.error.message || "Gagal menyimpan produk.", "danger");
    return;
  }

  showToast("Produk berhasil disimpan.", "success");
  window.location.href = "products.html";
}

async function loadProductForm() {
  const id = getQueryParam("id");
  if (!id) return;
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) {
    showToast("Produk tidak ditemukan.", "warning");
    return;
  }
  document.querySelector("#formTitle").textContent = "Ubah Produk";
  document.querySelector("#productCode").value = data.product_code;
  document.querySelector("#productName").value = data.product_name;
  document.querySelector("#categoryId").value = data.category_id || "";
  //   document.querySelector('#brand').value = data.brand || '';
  document.querySelector("#color").value = data.color || "";
  document.querySelector("#size").value = data.size || "";
  document.querySelector("#material").value = data.material || "";
  document.querySelector("#costPrice").value = data.cost_price;
  document.querySelector("#sellingPrice").value = data.selling_price;
  document.querySelector("#currentStock").value = data.current_stock;
  document.querySelector("#minStockLevel").value = data.min_stock_level;
  document.querySelector("#notes").value = data.notes || "";
  document.querySelector("#status").value = data.status;
}

async function initProducts() {
  const profile = await ensureRoleAccess("products");
  if (!profile) return;
  await loadLayout("Produk");
  const categories = await loadCategories();
  const select = document.querySelector("#categoryId");
  if (select) {
    select.innerHTML = `<option value="">Pilih kategori</option>${categories.map((cat) => `<option value="${cat.id}">${cat.name}</option>`).join("")}`;
  }

  const searchButton = document.querySelector("#filterButton");
  if (searchButton) searchButton.addEventListener("click", loadProducts);

  if (document.getElementById("productForm")) {
    document
      .querySelector("#productForm")
      .addEventListener("submit", saveProduct);
    await loadProductForm();
    return;
  }

  await loadProducts();
}

window.addEventListener("DOMContentLoaded", initProducts);
