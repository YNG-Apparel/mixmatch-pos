# Mix & Match POS & Inventory Management System

Sistem Point of Sale dan Manajemen Inventaris untuk toko pakaian "Mix & Match" — boutique tradisional di Indonesia.

## Ringkasan

Aplikasi ini dibangun sebagai static web app dengan Supabase Authentication dan Supabase PostgreSQL sebagai backend. Fokus utama adalah kecepatan transaksi kasir, kemudahan penggunaan untuk staf non-teknis, dan dukungan Bahasa Indonesia dengan format Rupiah dan tanggal DD/MM/YYYY.

## Fitur Utama

- Autentikasi Supabase dan manajemen peran (Admin, Manager, Cashier)
- Dashboard bisnis dengan ringkasan penjualan, pendapatan, profit, stok, dan produk terlaris
- Manajemen produk tanpa foto: diidentifikasi hanya dengan Kode Produk
- Manajemen kategori, pelanggan, inventaris, retur, dan laporan
- POS kasir cepat dan keyboard-friendly
- Cetak struk untuk setiap transaksi
- Laporan harian, mingguan, bulanan, tahunan, profit, produk, inventaris, retur, dan pelanggan
- Analisis bisnis otomatis dan rekomendasi tindakan
- Ekspor data ke Excel / PDF

## Struktur Proyek

- `/pages` - semua halaman HTML utama
- `/css` - file stylesheet
- `/js` - module aplikasi dan logika halaman
- `/services` - wrapper Supabase dan layanan data
- `/components` - potongan UI bersama seperti sidebar dan topbar
- `/utils` - helper format dan DOM
- `/assets` - aset statis seperti logo

## Persyaratan

- Netlify untuk hosting static page
- Supabase untuk autentikasi, database PostgreSQL, dan RLS
- Browser modern dengan dukungan ES Modules

## Pengaturan Supabase

1. Buat project baru di Supabase.
2. Tambahkan `supabase-schema.sql` ke query editor untuk membuat tabel dan kebijakan.
3. Salin `SUPABASE_URL` dan `SUPABASE_ANON_KEY` ke `services/supabase.js`.
4. Aktifkan Row Level Security untuk semua tabel dan terapkan kebijakan.

## Pengaturan Lokal

1. Pasang dependencies jika Anda ingin menggunakan bundler / live server, tetapi aplikasi ini berjalan sebagai static site.
2. Buat file `.env` jika diperlukan oleh Netlify atau build tools.
3. Unggah semua file ke Netlify.

## Deployment di Netlify

1. Buat site baru di Netlify.
2. Hubungkan repositori atau upload folder `Mix&Match`.
3. Pastikan build command kosong karena aplikasi static.
4. Set `publish` ke root folder.
5. Tambahkan environment variables jika menggunakan Netlify ENV untuk Supabase.

## Supabase Schema dan Kebijakan

- `supabase-schema.sql` berisi definisi tabel, relasi, indeks, dan RLS policy.
- Pastikan kebijakan Supabase memeriksa `auth.uid()` dan `roles.name` untuk setiap operasi.

## Panduan Penggunaan

- Login sebagai `Admin` untuk mengelola produk, inventaris, dan pengguna.
- Cashier menggunakan halaman `cashier.html` untuk transaksi cepat.
- Manager melihat laporan, analisis, dan data inventaris.

## Catatan

Semua teks UI sudah dirancang dalam Bahasa Indonesia. Sistem ini menghindari foto produk dan barcode untuk kebutuhan boutique tradisional.
