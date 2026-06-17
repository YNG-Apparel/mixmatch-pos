import { loadLayout, showToast, toRupiah } from "./utils.js";
import { supabase, getProfile } from "../services/supabase.js";
import { ensureRoleAccess } from "../services/roleAuth.js";

const cart = [];

async function initPOS() {
  const profile = await ensureRoleAccess("pos");
  if (!profile) return;
  await loadLayout("POS");

  document
    .getElementById("productCode")
    .addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        searchProduct();
      }
    });
  document
    .getElementById("searchButton")
    .addEventListener("click", searchProduct);
  document
    .getElementById("discountAmount")
    .addEventListener("change", updateTotals);
  document
    .getElementById("completeButton")
    .addEventListener("click", completePayment);
  document.getElementById("clearButton").addEventListener("click", clearCart);

  renderCart();
}

async function searchProduct() {
  const code = document.getElementById("productCode").value.trim();
  if (!code) {
    showToast("Masukkan kode produk.", "warning");
    return;
  }

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("product_code", code)
    .single();

  if (error || !data) {
    showToast(`Produk dengan kode "${code}" tidak ditemukan.`, "danger");
    document.getElementById("productCode").value = "";
    document.getElementById("productCode").focus();
    return;
  }

  if (data.current_stock === 0) {
    showToast("Produk ini tidak ada stok.", "warning");
    document.getElementById("productCode").value = "";
    document.getElementById("productCode").focus();
    return;
  }

  const quantity = 1;
  const existing = cart.find((item) => item.product_id === data.id);

  if (existing) {
    if (existing.quantity < data.current_stock) {
      existing.quantity += quantity;
      existing.subtotal =
        existing.unit_price * existing.quantity - existing.discount;
    } else {
      showToast("Tidak dapat menambah lebih banyak, stok terbatas.", "warning");
    }
  } else {
    cart.push({
      product_id: data.id,
      product_code: data.product_code,
      product_name: data.product_name,
      quantity,
      unit_price: Number(data.selling_price),
      cost_price: Number(data.cost_price),
      discount: 0,
      subtotal: Number(data.selling_price),
      stock: data.current_stock,
    });
  }

  renderCart();
  document.getElementById("productCode").value = "";
  document.getElementById("productCode").focus();
}

function renderCart() {
  const tbody = document.getElementById("cartTable");
  if (!tbody) return;

  if (cart.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" class="text-center py-4 text-muted">Keranjang kosong</td></tr>';
    updateTotals();
    return;
  }

  tbody.innerHTML = cart
    .map(
      (item, index) => `
    <tr>
      <td>${item.product_code}</td>
      <td>${item.product_name}</td>
      <td>
        <input type="number" min="1" max="${item.stock}" value="${item.quantity}" class="form-control form-control-sm cart-qty" data-index="${index}" />
      </td>
      <td>${toRupiah(item.unit_price)}</td>
      <td>${toRupiah(item.subtotal)}</td>
      <td>
        <button class="btn btn-sm btn-danger remove-item" data-index="${index}">Hapus</button>
      </td>
    </tr>
  `,
    )
    .join("");

  tbody.querySelectorAll(".cart-qty").forEach((input) => {
    input.addEventListener("change", (event) => {
      const index = Number(event.target.dataset.index);
      const newQty = Number(event.target.value);
      if (newQty < 1) cart.splice(index, 1);
      else {
        if (newQty > cart[index].stock) {
          showToast(`Stok hanya tersedia ${cart[index].stock}`, "warning");

          event.target.value = cart[index].stock;
          return;
        }

        cart[index].quantity = newQty;
        cart[index].subtotal =
          cart[index].unit_price * newQty - cart[index].discount;
      }
      renderCart();
    });
  });

  tbody.querySelectorAll(".remove-item").forEach((button) => {
    button.addEventListener("click", () => {
      cart.splice(Number(button.dataset.index), 1);
      renderCart();
    });
  });

  updateTotals();
}

function updateTotals() {
  const subtotal = cart.reduce(
    (sum, item) => sum + item.unit_price * item.quantity,
    0,
  );

  const discountPercent =
    Number(document.getElementById("discountAmount").value) || 0;

  const discountAmount = subtotal * (discountPercent / 100);

  const total = Math.max(0, subtotal - discountAmount);

  document.getElementById("subtotalValue").textContent = toRupiah(subtotal);

  document.getElementById("totalValue").textContent = toRupiah(total);
}

async function completePayment() {
  if (cart.length === 0) {
    showToast("Keranjang kosong. Tambahkan produk terlebih dahulu.", "warning");
    return;
  }

  const profile = await getProfile();

  if (!profile) {
    window.location.href = "login.html";
    return;
  }
  // VALIDASI STOK TERBARU DARI DATABASE
  for (const item of cart) {
    const { data: product, error } = await supabase
      .from("products")
      .select("current_stock, product_name")
      .eq("id", item.product_id)
      .single();

    if (error || !product) {
      showToast(`Produk ${item.product_name} tidak ditemukan.`, "danger");
      return;
    }

    if (product.current_stock < item.quantity) {
      showToast(
        `Stok ${product.product_name} tidak mencukupi. Tersedia ${product.current_stock}, diminta ${item.quantity}.`,
        "danger",
      );
      return;
    }
  }

  const paymentMethod = document.getElementById("paymentMethod").value;

  const discountPercent =
    Number(document.getElementById("discountAmount").value) || 0;

  const subtotal = cart.reduce(
    (sum, item) => sum + item.unit_price * item.quantity,
    0,
  );

  const discount = subtotal * (discountPercent / 100);

  const total = Math.max(0, subtotal - discount);

  if (total <= 0) {
    showToast("Total transaksi tidak valid.", "danger");
    return;
  }

  const receiptNumber = `BTQ-${Date.now()}`;
  const totalCost = cart.reduce(
    (sum, item) => sum + item.cost_price * item.quantity,
    0,
  );
  const totalProfit = total - totalCost;

  const { data: saleData, error: saleError } = await supabase
    .from("sales")
    .insert({
      receipt_number: receiptNumber,
      customer_id: null,
      cashier_id: profile.id,
      total_amount: total,
      total_cost: totalCost,
      total_profit: totalProfit,
      total_discount: discount,
      payment_method: paymentMethod,
      status: "Completed",
    })
    .select("id")
    .single();

  if (saleError || !saleData) {
    console.error("SALE ERROR:", saleError);
    console.error("SALE DATA:", saleData);

    showToast(
      saleError?.message || "Gagal menyimpan transaksi. Hubungi admin.",
      "danger",
    );

    return;
  }

  const saleItems = cart.map((item) => ({
    sale_id: saleData.id,
    product_id: item.product_id,
    product_code: item.product_code,
    product_name: item.product_name,
    quantity: item.quantity,
    unit_price: item.unit_price,
    cost_price: item.cost_price,
    discount: 0,
    subtotal: item.subtotal,
  }));

  const { data: itemData, error: itemError } = await supabase
    .from("sale_items")
    .insert(saleItems);

  console.log("SALE ITEMS DATA:", itemData);
  console.log("SALE ITEMS ERROR:", itemError);

  if (itemError) {
    console.error(itemError);
    showToast("Gagal menyimpan detail transaksi.", "danger");
    return;
  }
  const { error: paymentError } = await supabase.from("payments").insert({
    sale_id: saleData.id,
    payment_method: paymentMethod,
    amount: total,
  });

  if (paymentError) {
    console.error(paymentError);
    showToast("Gagal menyimpan pembayaran.", "danger");
    return;
  }

  for (const item of cart) {
    const { data: product } = await supabase
      .from("products")
      .select("current_stock")
      .eq("id", item.product_id)
      .single();
    if (product) {
      const newStock = product.current_stock - item.quantity;
      const { error: stockError } = await supabase
        .from("products")
        .update({ current_stock: newStock })
        .eq("id", item.product_id);

      console.log("STOCK ERROR:", stockError);
      const { error: inventoryError } = await supabase
        .from("inventory_logs")
        .insert({
          product_id: item.product_id,
          action_type: "Stock Out",
          quantity_before: product.current_stock,
          quantity_changed: -item.quantity,
          quantity_after: newStock,
          notes: `Penjualan ${receiptNumber}`,
        });

      console.log("INVENTORY ERROR:", inventoryError);
    }
  }

  showToast(`✓ Transaksi ${receiptNumber} berhasil disimpan.`, "success");
  printReceipt(receiptNumber, cart, total, paymentMethod);
  cart.length = 0;
  renderCart();
  document.getElementById("productCode").focus();
}

function printReceipt(receiptNumber, items, total, paymentMethod) {
  const receiptWindow = window.open("", "", "width=400,height=600");
  const receiptHTML = `
    <html>
      <head><title>${receiptNumber}</title></head>
      <body style="font-family:monospace; font-size:12px; margin:0; padding:10px;">
        <div style="text-align:center; margin-bottom:15px;">
          <h2>MIX & MATCH</h2>
          <p style="margin:0;">${new Date().toLocaleDateString("id-ID")} ${new Date().toLocaleTimeString("id-ID")}</p>
        </div>
        <div style="border-bottom:1px solid #000; padding-bottom:10px; margin-bottom:10px;">
          <p style="margin:0;"><strong>No. Struk: ${receiptNumber}</strong></p>
        </div>
        <table style="width:100%; border-collapse:collapse;">
          <tr style="border-bottom:1px solid #000;">
            <th style="text-align:left;">Produk</th>
            <th style="text-align:right;">Qty</th>
            <th style="text-align:right;">Harga</th>
          </tr>
          ${items
            .map(
              (item) => `
          <tr>
            <td>${item.product_code} - ${item.product_name.substring(0, 20)}</td>
            <td style="text-align:right;">${item.quantity}</td>
            <td style="text-align:right;">Rp ${(item.unit_price * item.quantity).toLocaleString("id-ID")}</td>
          </tr>
          `,
            )
            .join("")}
        </table>
        <div style="border-top:1px solid #000; border-bottom:1px solid #000; padding:10px 0; margin:10px 0; text-align:right;">
          <strong>TOTAL: Rp ${total.toLocaleString("id-ID")}</strong>
        </div>
        <p style="text-align:center; margin:10px 0;">Metode: ${paymentMethod}</p>
        <p style="text-align:center; margin-top:20px; font-size:10px;">Terima kasih telah berbelanja!</p>
      </body>
    </html>
  `;
  receiptWindow.document.write(receiptHTML);
  receiptWindow.document.close();
  receiptWindow.print();
}

function clearCart() {
  if (!confirm("Hapus semua item dari keranjang?")) return;
  cart.length = 0;
  renderCart();
  document.getElementById("productCode").focus();
}

window.addEventListener("DOMContentLoaded", initPOS);
