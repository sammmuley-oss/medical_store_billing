-- ============================================
-- MediStore - Supabase Database Schema
-- Run this SQL in your Supabase SQL Editor
-- ============================================

-- Suppliers table (must be created before medicines due to FK)
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company VARCHAR(255) NOT NULL,
    contact VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    address TEXT,
    gst VARCHAR(50),
    license VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    dob DATE,
    address TEXT,
    notes TEXT,
    total_purchases DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Medicines table
CREATE TABLE IF NOT EXISTS medicines (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    batch VARCHAR(100) NOT NULL,
    expiry DATE NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    min_stock INTEGER NOT NULL DEFAULT 10,
    purchase_price DECIMAL(10,2) NOT NULL,
    selling_price DECIMAL(10,2) NOT NULL,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    manufacturer VARCHAR(255),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bills table
CREATE TABLE IF NOT EXISTS bills (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    discount DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    total DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bill items table
CREATE TABLE IF NOT EXISTS bill_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    bill_id UUID REFERENCES bills(id) ON DELETE CASCADE,
    medicine_id UUID REFERENCES medicines(id) ON DELETE SET NULL,
    medicine_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    total DECIMAL(12,2) NOT NULL
);

-- ============================================
-- Indexes for better query performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_medicines_name ON medicines(name);
CREATE INDEX IF NOT EXISTS idx_medicines_category ON medicines(category);
CREATE INDEX IF NOT EXISTS idx_medicines_expiry ON medicines(expiry);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_suppliers_company ON suppliers(company);
CREATE INDEX IF NOT EXISTS idx_bills_invoice ON bills(invoice_number);
CREATE INDEX IF NOT EXISTS idx_bills_date ON bills(created_at);
CREATE INDEX IF NOT EXISTS idx_bill_items_bill_id ON bill_items(bill_id);

-- ============================================
-- Function to auto-update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for auto-updating updated_at
DROP TRIGGER IF EXISTS update_medicines_updated_at ON medicines;
CREATE TRIGGER update_medicines_updated_at
    BEFORE UPDATE ON medicines
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_suppliers_updated_at ON suppliers;
CREATE TRIGGER update_suppliers_updated_at
    BEFORE UPDATE ON suppliers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Sample Data
-- ============================================
INSERT INTO suppliers (company, contact, phone, email, address, gst, license) VALUES
('MedSupply India Ltd', 'Mr. Verma', '9123456780', 'sales@medsupply.com', 'Mumbai, Maharashtra', '27AABCU9603R1ZM', 'DL-MH-12345'),
('PharmaDist Corp', 'Ms. Singh', '9123456781', 'orders@pharmadist.com', 'Delhi, NCR', '07AABCU9603R1ZN', 'DL-DL-67890')
ON CONFLICT DO NOTHING;

INSERT INTO customers (name, phone, email, address, total_purchases) VALUES
('Rahul Sharma', '9876543210', 'rahul@email.com', '123 Main St, City', 1500),
('Priya Patel', '9876543211', 'priya@email.com', '456 Park Ave, Town', 2300),
('Amit Kumar', '9876543212', NULL, '789 Lake Rd, Village', 800)
ON CONFLICT DO NOTHING;
