CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE user_role AS ENUM ('admin', 'manager', 'staff', 'supplier');
CREATE TYPE supplier_status AS ENUM ('Pending', 'Approved', 'Rejected');
CREATE TYPE restock_status AS ENUM (
    'Pending',
    'Confirmed',
    'Rejected',
    'In Transit',
    'Inspecting',
    'Received',
    'Returned'
);
CREATE TYPE transaction_type AS ENUM ('INCOMING', 'OUTGOING');
CREATE TYPE transaction_status AS ENUM ('Pending', 'Approved', 'Rejected', 'Shipped');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role user_role NOT NULL,
    company_name VARCHAR(150),
    supplier_status supplier_status,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_supplier_status CHECK (
        (role = 'supplier' AND supplier_status IS NOT NULL) OR
        (role <> 'supplier' AND supplier_status IS NULL)
    ),
    CONSTRAINT chk_user_rejection_reason CHECK (
        supplier_status IS DISTINCT FROM 'Rejected' OR
        (rejection_reason IS NOT NULL AND TRIM(rejection_reason) <> '')
    )
);

CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    image_url TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    supplier_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    description TEXT NOT NULL,
    buy_price NUMERIC(12, 2) NOT NULL CHECK (buy_price >= 0),
    sell_price NUMERIC(12, 2) NOT NULL CHECK (sell_price >= 0),
    min_stock INTEGER NOT NULL CHECK (min_stock >= 0),
    low_stock INTEGER NOT NULL,
    current_stock INTEGER NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
    unit VARCHAR(20) NOT NULL,
    rack_location VARCHAR(50) NOT NULL,
    image_url TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_stock_thresholds CHECK (low_stock > min_stock)
);

CREATE TABLE restock_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_number VARCHAR(50) UNIQUE NOT NULL,
    supplier_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_delivery_date DATE NOT NULL,
    notes TEXT,
    status restock_status NOT NULL DEFAULT 'Pending',
    status_reason TEXT,
    delivery_proof_url TEXT,
    refund_requested BOOLEAN NOT NULL DEFAULT FALSE,
    refund_reason TEXT,
    replacement_po_id UUID REFERENCES restock_orders(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_po_rejection_reason CHECK (
        status NOT IN ('Rejected', 'Returned') OR
        (status_reason IS NOT NULL AND TRIM(status_reason) <> '')
    ),
    CONSTRAINT chk_po_refund_reason CHECK (
        refund_requested = FALSE OR
        (status = 'Returned' AND refund_reason IS NOT NULL AND TRIM(refund_reason) <> '')
    )
);

CREATE TABLE restock_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restock_order_id UUID NOT NULL REFERENCES restock_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    UNIQUE (restock_order_id, product_id)
);

CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_number VARCHAR(50) UNIQUE NOT NULL,
    type transaction_type NOT NULL,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    restock_order_id UUID REFERENCES restock_orders(id) ON DELETE RESTRICT,
    supplier_id UUID REFERENCES users(id) ON DELETE RESTRICT,
    customer_name VARCHAR(150),
    notes TEXT,
    proof_image_url TEXT,
    status transaction_status NOT NULL DEFAULT 'Pending',
    rejection_reason TEXT,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    approved_by UUID REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_trx_rejection_reason CHECK (
        status <> 'Rejected' OR (rejection_reason IS NOT NULL AND TRIM(rejection_reason) <> '')
    ),
    CONSTRAINT chk_trx_parties CHECK (
        (type = 'INCOMING' AND supplier_id IS NOT NULL AND customer_name IS NULL) OR
        (type = 'OUTGOING' AND customer_name IS NOT NULL AND supplier_id IS NULL AND restock_order_id IS NULL)
    )
);

CREATE UNIQUE INDEX idx_unique_active_po_transaction
ON transactions (restock_order_id)
WHERE restock_order_id IS NOT NULL AND status <> 'Rejected';

CREATE TABLE transaction_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity >= 0),
    UNIQUE (transaction_id, product_id)
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_supplier ON products(supplier_id);
CREATE INDEX idx_transactions_type_status ON transactions(type, status);
CREATE INDEX idx_restock_orders_supplier_status ON restock_orders(supplier_id, status);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);
