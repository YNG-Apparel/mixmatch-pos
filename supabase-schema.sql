-- Supabase PostgreSQL schema for Boutique POS / Inventory Management
-- Run this SQL script in your Supabase SQL editor.

-- ROLES TABLE
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NULL
);

-- PROFILES / USERS
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT auth.uid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  role_id INT NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CATEGORIES
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PRODUCTS
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  product_code TEXT NOT NULL UNIQUE,
  product_name TEXT NOT NULL,
  category_id INT REFERENCES categories(id) ON DELETE SET NULL,
  brand TEXT,
  color TEXT,
  size TEXT,
  material TEXT,
  cost_price NUMERIC(14,2) NOT NULL DEFAULT 0,
  selling_price NUMERIC(14,2) NOT NULL DEFAULT 0,
  current_stock INT NOT NULL DEFAULT 0,
  min_stock_level INT NOT NULL DEFAULT 0,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'Active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_search ON products (
  product_code,
  product_name,
  brand,
  color,
  size
);

-- CUSTOMERS
CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  customer_name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  notes TEXT,
  loyalty_points INT NOT NULL DEFAULT 0,
  total_spending NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SALES
CREATE TABLE IF NOT EXISTS sales (
  id SERIAL PRIMARY KEY,
  receipt_number TEXT NOT NULL UNIQUE,
  customer_id INT REFERENCES customers(id) ON DELETE SET NULL,
  cashier_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_profit NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_discount NUMERIC(14,2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL,
  transaction_notes TEXT,
  status TEXT NOT NULL DEFAULT 'Completed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_date ON sales (created_at);

-- SALE ITEMS
CREATE TABLE IF NOT EXISTS sale_items (
  id SERIAL PRIMARY KEY,
  sale_id INT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id INT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  product_code TEXT NOT NULL,
  product_name TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price NUMERIC(14,2) NOT NULL DEFAULT 0,
  cost_price NUMERIC(14,2) NOT NULL DEFAULT 0,
  discount NUMERIC(14,2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PAYMENTS
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  sale_id INT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  payment_method TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- INVENTORY LOGS
CREATE TABLE IF NOT EXISTS inventory_logs (
  id SERIAL PRIMARY KEY,
  product_id INT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  quantity_before INT NOT NULL DEFAULT 0,
  quantity_changed INT NOT NULL DEFAULT 0,
  quantity_after INT NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_logs_product ON inventory_logs (product_id);

-- RETURNS
CREATE TABLE IF NOT EXISTS returns (
  id SERIAL PRIMARY KEY,
  original_sale_id INT REFERENCES sales(id) ON DELETE SET NULL,
  customer_id INT REFERENCES customers(id) ON DELETE SET NULL,
  cashier_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  return_reason TEXT,
  total_refund NUMERIC(14,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Returned',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RETURN ITEMS
CREATE TABLE IF NOT EXISTS return_items (
  id SERIAL PRIMARY KEY,
  return_id INT NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
  sale_item_id INT REFERENCES sale_items(id) ON DELETE SET NULL,
  product_id INT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity INT NOT NULL DEFAULT 0,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ACTIVITY LOGS
CREATE TABLE IF NOT EXISTS activity_logs (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  module TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SEED ROLES
INSERT INTO roles (name, description)
VALUES
  ('Admin', 'Akses penuh untuk manajemen sistem'),
  ('Manager', 'Akses laporan dan statistik'),
  ('Cashier', 'Akses modul kasir dan transaksi')
ON CONFLICT (name) DO NOTHING;

-- RLS and policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Policy helpers
CREATE FUNCTION public.has_role(required_role TEXT) RETURNS BOOLEAN LANGUAGE SQL AS $$
  SELECT EXISTS(
    SELECT 1 FROM profiles p
    JOIN roles r ON p.role_id = r.id
    WHERE p.id = auth.uid() AND r.name = required_role
  );
$$;

CREATE POLICY "Profiles must be owned by user" ON profiles FOR ALL USING (id = auth.uid());

CREATE POLICY "Admin can manage all" ON categories FOR ALL USING (EXISTS (SELECT 1 FROM profiles p JOIN roles r ON p.role_id = r.id WHERE p.id = auth.uid() AND r.name = 'Admin')) WITH CHECK (EXISTS (SELECT 1 FROM profiles p JOIN roles r ON p.role_id = r.id WHERE p.id = auth.uid() AND r.name = 'Admin'));
CREATE POLICY "Admin can manage products" ON products FOR ALL USING (EXISTS (SELECT 1 FROM profiles p JOIN roles r ON p.role_id = r.id WHERE p.id = auth.uid() AND r.name IN ('Admin','Manager'))) WITH CHECK (EXISTS (SELECT 1 FROM profiles p JOIN roles r ON p.role_id = r.id WHERE p.id = auth.uid() AND r.name IN ('Admin','Manager')));
CREATE POLICY "Cashier can read products" ON products FOR SELECT USING (TRUE);
CREATE POLICY "Manage customers" ON customers FOR ALL USING (EXISTS (SELECT 1 FROM profiles p JOIN roles r ON p.role_id = r.id WHERE p.id = auth.uid() AND r.name IN ('Admin','Cashier','Manager'))) WITH CHECK (EXISTS (SELECT 1 FROM profiles p JOIN roles r ON p.role_id = r.id WHERE p.id = auth.uid() AND r.name IN ('Admin','Cashier','Manager')));
CREATE POLICY "Sale access" ON sales FOR ALL USING (EXISTS (SELECT 1 FROM profiles p JOIN roles r ON p.role_id = r.id WHERE p.id = auth.uid() AND r.name IN ('Admin','Cashier','Manager'))) WITH CHECK (EXISTS (SELECT 1 FROM profiles p JOIN roles r ON p.role_id = r.id WHERE p.id = auth.uid() AND r.name IN ('Admin','Cashier','Manager')));
CREATE POLICY "Inventory log access" ON inventory_logs FOR ALL USING (EXISTS (SELECT 1 FROM profiles p JOIN roles r ON p.role_id = r.id WHERE p.id = auth.uid() AND r.name IN ('Admin','Manager'))) WITH CHECK (EXISTS (SELECT 1 FROM profiles p JOIN roles r ON p.role_id = r.id WHERE p.id = auth.uid() AND r.name IN ('Admin','Manager')));
CREATE POLICY "Return access" ON returns FOR ALL USING (EXISTS (SELECT 1 FROM profiles p JOIN roles r ON p.role_id = r.id WHERE p.id = auth.uid() AND r.name IN ('Admin','Cashier','Manager'))) WITH CHECK (EXISTS (SELECT 1 FROM profiles p JOIN roles r ON p.role_id = r.id WHERE p.id = auth.uid() AND r.name IN ('Admin','Cashier','Manager')));
CREATE POLICY "Activity logs read" ON activity_logs FOR SELECT USING (EXISTS (SELECT 1 FROM profiles p JOIN roles r ON p.role_id = r.id WHERE p.id = auth.uid() AND r.name = 'Admin'));

-- Policy for sale_items/payments/return_items
CREATE POLICY "Sale item access" ON sale_items FOR ALL USING (EXISTS (SELECT 1 FROM sales s JOIN profiles p ON s.cashier_id = p.id JOIN roles r ON p.role_id = r.id WHERE s.id = sale_items.sale_id AND p.id = auth.uid() AND r.name IN ('Admin','Cashier','Manager')));
CREATE POLICY "Payment access" ON payments FOR ALL USING (EXISTS (SELECT 1 FROM sales s JOIN profiles p ON s.cashier_id = p.id JOIN roles r ON p.role_id = r.id WHERE s.id = payments.sale_id AND p.id = auth.uid() AND r.name IN ('Admin','Cashier','Manager')));
CREATE POLICY "Return item access" ON return_items FOR ALL USING (EXISTS (SELECT 1 FROM returns r JOIN profiles p ON r.cashier_id = p.id JOIN roles ro ON p.role_id = ro.id WHERE r.id = return_items.return_id AND p.id = auth.uid() AND ro.name IN ('Admin','Cashier','Manager')));

-- Trigger updates timestamps
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER update_categories_updated_at
BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER update_customers_updated_at
BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER update_sales_updated_at
BEFORE UPDATE ON sales FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER update_returns_updated_at
BEFORE UPDATE ON returns FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER update_activity_logs_updated_at
BEFORE UPDATE ON activity_logs FOR EACH ROW EXECUTE FUNCTION update_timestamp();
