# Arsitektur Sistem Boutique POS

## Analisis Bisnis

Sistem ini dirancang untuk boutique pakaian tradisional yang membutuhkan kecepatan input, pencarian produk berdasarkan kode internal, dan operasi kasir yang sederhana. Tidak ada penggunaan foto produk atau barcode scanner. Fokus ada pada:

- Kode Produk sebagai identitas utama
- Pencarian cepat berdasarkan Kode Produk atau Nama Produk
- Transaksi kasir yang keyboard-friendly
- Pelaporan dan analitik untuk manajemen stok dan penjualan
- Pengelolaan inventaris dengan pencatatan setiap perubahan stok

## Sistem dan Teknologi

- Frontend static HTML/CSS/JavaScript
- Supabase sebagai backend untuk autentikasi dan PostgreSQL
- Netlify sebagai hosting static site
- Bootstrap 5 untuk tata letak responsif dan UI profesional
- Bahasa Indonesia lengkap untuk semua label, pesan, dan format

## Komponen Aplikasi

- Authentication: `login.html`, `services/supabase.js`, `js/auth.js`
- Dashboard: `dashboard.html`, `js/dashboard.js`
- Produk: `products.html`, `product-form.html`, `js/products.js`
- Kategori: `categories.html`, `js/categories.js`
- Inventaris: `inventory.html`, `js/inventory.js`
- POS Kasir: `cashier.html`, `js/cashier.js`
- Pelanggan: `customers.html`, `js/customers.js`
- Retur: `returns.html`, `js/returns.js`
- Laporan: `reports.html`, `js/reports.js`
- Analisis: `analytics.html`, `js/analytics.js`
- Pengaturan: `settings.html`, `js/settings.js`

## Arsitektur Data

Tabel utama:

- `profiles` -> user Supabase dengan peran dan detail kontak
- `roles` -> daftar hak akses
- `categories` -> kategori produk
- `products` -> produk yang dijual
- `customers` -> pelanggan dan loyalitas
- `sales` -> transaksi penjualan
- `sale_items` -> item per transaksi
- `payments` -> metode pembayaran per transaksi
- `inventory_logs` -> histori perubahan stok
- `returns` -> transaksi retur/exchange
- `return_items` -> produk yang dikembalikan
- `activity_logs` -> audit trail aktivitas pengguna

## Jalur Pengguna

- Admin: akses penuh untuk manajemen produk, kategori, inventaris, laporan, dan pengaturan.
- Manager: akses baca untuk laporan, analitik, inventaris, dan penjualan.
- Cashier: akses kasir, pelanggan, retur, dan cetak struk.

## Keamanan

- Supabase Authentication
- Role Based Access Control di Supabase
- Row Level Security untuk seluruh tabel
- Proteksi CSRF built-in melalui Supabase session
- Validasi input di sisi klien sebelum operasi CRUD

## Roadmap Pengembangan

1. Definisikan model data dan hubungan tabel
2. Siapkan schema Supabase dan kebijakan RLS
3. Bangun layanan Supabase dan modul autentikasi
4. Buat halaman login dan proteksi akses
5. Kembangkan Dashboard dan modul laporan
6. Implementasikan manajemen produk dan kategori
7. Bangun modul inventaris dengan catatan stok
8. Kembangkan POS kasir dengan workflow cepat
9. Tambahkan pelanggan, retur, dan analitik bisnis
10. Uji fungsi, responsivitas, dan alur pengguna
11. Deploy ke Netlify
