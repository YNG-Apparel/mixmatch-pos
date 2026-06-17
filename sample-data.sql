-- Data sample for Boutique POS
-- Insert kategori, produk, pelanggan, dan aktivitas awal.

INSERT INTO categories (name, description) VALUES
('Kaos', 'Produk kaos siap pakai'),
('Kemeja', 'Kemeja formal dan casual'),
('Celana', 'Celana panjang dan pendek'),
('Dress', 'Dress wanita elegan'),
('Jaket', 'Jaket dan outerwear'),
('Rok', 'Rok wanita'),
('Aksesoris', 'Syal, topi, dan aksesori lainnya')
ON CONFLICT (name) DO NOTHING;

INSERT INTO products (product_code, product_name, category_id, brand, color, size, material, cost_price, selling_price, current_stock, min_stock_level, notes, status)
VALUES
('ATS-001', 'Atasan Katun Polos', 1, 'Maju', 'Hitam', 'M', 'Katun', 45000, 75000, 40, 10, 'Atasan kasual', 'Active'),
('DRS-024', 'Dress Batik Modern', 4, 'Cantik', 'Merah', 'L', 'Satin', 120000, 220000, 12, 5, 'Dress acara', 'Active'),
('KEM-155', 'Kemeja Lengan Panjang', 2, 'Urban', 'Putih', 'M', 'Oxford', 95000, 170000, 25, 8, 'Kemeja kerja', 'Active'),
('JKT-081', 'Jaket Denim', 5, 'Classic', 'Biru', 'L', 'Denim', 185000, 300000, 18, 6, 'Jaket pria', 'Active');

INSERT INTO customers (customer_name, phone, address, notes, loyalty_points, total_spending)
VALUES
('Nur Aisyah', '081234567890', 'Jl. Merdeka No. 12, Bandung', 'Pelanggan setia', 120, 1500000),
('Budi Santoso', '082345678901', 'Jl. Sudirman No. 34, Jakarta', 'Membeli untuk karyawan', 90, 820000),
('Maya Dewi', '083456789012', 'Jl. H. Nawi No. 56, Depok', 'Belanja bulanan', 75, 680000);

INSERT INTO activity_logs (user_id, action, module, details) VALUES
(NULL, 'Inisialisasi data awal', 'Sistem', 'Sample data produk dan kategori berhasil dibuat');
