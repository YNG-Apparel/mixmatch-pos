import { loadLayout, showToast, toRupiah, toTanggal } from "./utils.js";
import { supabase } from "../services/supabase.js";
import { ensureRoleAccess } from "../services/roleAuth.js";

async function loadFilterData() {
  const [categoriesRes, cashiersRes] = await Promise.all([
    supabase.from("categories").select("id, name").order("name"),
    supabase.from("profiles").select("id, full_name").order("full_name"),
  ]);
  if (categoriesRes.error || cashiersRes.error) {
    showToast("Gagal memuat filter laporan.", "danger");
    return;
  }
  const categorySelect = document.getElementById("reportCategory");
  const cashierSelect = document.getElementById("reportCashier");
  if (categorySelect) {
    categorySelect.innerHTML += (categoriesRes.data || [])
      .map((cat) => `<option value="${cat.id}">${cat.name}</option>`)
      .join("");
  }
  if (cashierSelect) {
    cashierSelect.innerHTML += (cashiersRes.data || [])
      .map((user) => `<option value="${user.id}">${user.full_name}</option>`)
      .join("");
  }
}

async function runReport() {
  const startDate = document.getElementById("reportStart").value;
  const endDate = document.getElementById("reportEnd").value;
  const category = document.getElementById("reportCategory").value;
  const cashier = document.getElementById("reportCashier").value;

  let query = supabase
    .from("sales")
    .select(
      "id, receipt_number, created_at, payment_method, total_amount, cashier_id, customer_id, cashier:profiles(full_name), customer:customers(customer_name)",
    )
    .order("created_at", { ascending: false });

  if (startDate)
    query = query.gte("created_at", new Date(startDate).toISOString());
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    query = query.lte("created_at", end.toISOString());
  }
  if (cashier) query = query.eq("cashier_id", Number(cashier));

  const { data, error } = await query;
  if (error) {
    showToast("Gagal memuat data laporan.", "danger");
    return;
  }
  let rows = data || [];
  if (category) {
    const categoryId = Number(category);
    const saleIds = rows.map((row) => row.id);
    const { data: saleItems, error: itemError } = await supabase
      .from("sale_items")
      .select("sale_id, products(category_id)")
      .in("sale_id", saleIds)
      .eq("products.category_id", categoryId);
    if (!itemError && saleItems) {
      const filteredIds = saleItems.map((item) => item.sale_id);
      rows = rows.filter((row) => filteredIds.includes(row.id));
    }
  }

  const tbody = document.getElementById("reportTable");
  if (!tbody) return;
  tbody.innerHTML = rows
    .map(
      (report) => `
  <tr>
    <td>${report.receipt_number}</td>
    <td>${toTanggal(report.created_at)}</td>
    <td>${report.cashier?.full_name || "-"}</td>
    <td>${report.customer?.customer_name || "-"}</td>
    <td>${toRupiah(report.total_amount)}</td>
    <td>${report.payment_method}</td>
        <td>
        <button
            class="btn btn-sm btn-primary receipt-btn"
            data-id="${report.id}">
            Lihat Struk
        </button>
        </td>
  </tr>
`,
    )
    .join("");
  window.currentReport = rows;
  document.querySelectorAll(".receipt-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await showReceipt(btn.dataset.id);
    });
  });
  document.querySelectorAll(".detail-sale").forEach((btn) => {
    btn.addEventListener("click", () => {
      showSaleDetail(btn.dataset.id);
    });
  });
}

async function showReceipt(saleId) {
  const { data: sale, error: saleError } = await supabase
    .from("sales")
    .select("*")
    .eq("id", saleId)
    .single();

  if (saleError || !sale) {
    showToast("Transaksi tidak ditemukan.", "danger");
    return;
  }

  const { data: items, error: itemError } = await supabase
    .from("sale_items")
    .select("*")
    .eq("sale_id", saleId);

  if (itemError) {
    showToast("Gagal memuat detail transaksi.", "danger");
    return;
  }

  const html = `
    <div style="
      font-family: monospace;
      font-size: 14px;
    ">

      <div style="text-align:center">

        <h4>MIX & MATCH</h4>

        <p>
          ${new Date(sale.created_at).toLocaleString("id-ID")}
        </p>

      </div>

      <hr>

      <p>
        No Struk:
        ${sale.receipt_number}
      </p>

      <hr>

      ${items
        .map(
          (item) => `
        <div>

          <strong>
            ${item.product_name}
          </strong>

          <br>

          ${item.quantity}
          x
          ${toRupiah(item.unit_price)}

          <span style="float:right">
            ${toRupiah(item.subtotal)}
          </span>

        </div>

        <br>
      `,
        )
        .join("")}

      <hr>

      <h5>
        TOTAL:
        ${toRupiah(sale.total_amount)}
      </h5>

      <p>
        Metode:
        ${sale.payment_method}
      </p>

      <p style="text-align:center">
        Terima kasih
      </p>

    </div>
  `;

  document.getElementById("receiptContent").innerHTML = html;

  const modal = new bootstrap.Modal(document.getElementById("receiptModal"));

  modal.show();
}

async function showSaleDetail(saleId) {
  const { data, error } = await supabase
    .from("sale_items")
    .select("*")
    .eq("sale_id", saleId);

  if (error) {
    showToast("Gagal memuat detail transaksi.", "danger");
    return;
  }

  let detailText = "";

  data.forEach((item) => {
    detailText +=
      `${item.product_name}\n` +
      `Qty: ${item.quantity}\n` +
      `Subtotal: ${toRupiah(item.subtotal)}\n\n`;
  });

  alert(detailText);
}

function downloadCsv() {
  const rows = window.currentReport || [];
  if (!rows.length) {
    showToast("Tidak ada data untuk diekspor.", "warning");
    return;
  }
  const header = [
    "Nomor Struk",
    "Tanggal",
    "Kasir",
    "Pelanggan",
    "Total",
    "Metode Pembayaran",
  ];
  const csv = [header.join(",")].concat(
    rows.map((row) =>
      [
        row.receipt_number,
        new Date(row.created_at).toLocaleDateString("id-ID"),
        row.cashier?.full_name || "-",
        row.customer?.customer_name || "-",
        row.total_amount,
        row.payment_method,
      ]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(","),
    ),
  );
  const blob = new Blob([csv.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `laporan-penjualan-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportPdf() {
  window.print();
}

async function initReports() {
  const profile = await ensureRoleAccess("reports");
  if (!profile) return;
  await loadLayout("Laporan");
  await loadFilterData();
  document.getElementById("runReport").addEventListener("click", runReport);
  document.getElementById("exportExcel").addEventListener("click", downloadCsv);
  document.getElementById("exportPdf").addEventListener("click", exportPdf);
  const today = new Date().toISOString().slice(0, 10);
  document.getElementById("reportEnd").value = today;
  document.getElementById("reprintReceipt").addEventListener("click", () => {
    const content = document.getElementById("receiptContent").innerHTML;

    const win = window.open("", "", "width=400,height=600");

    win.document.write(`
      <html>
      <body>
      ${content}
      </body>
      </html>
    `);

    win.document.close();
    win.print();
  });
}

window.addEventListener("DOMContentLoaded", initReports);
