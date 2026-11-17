INSERT INTO users (id, full_name, email, password, role, company_name, supplier_status) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Admin Gudang', 'admin@fantech-wms.local', '$2b$10$placeholderhashadmin', 'admin', NULL, NULL),
    ('22222222-2222-2222-2222-222222222222', 'Budi Santoso', 'manager@fantech-wms.local', '$2b$10$placeholderhashmanager', 'warehouse_manager', NULL, NULL),
    ('33333333-3333-3333-3333-333333333333', 'Rina Wijaya', 'staff@fantech-wms.local', '$2b$10$placeholderhashstaff', 'warehouse_staff', NULL, NULL),
    ('44444444-4444-4444-4444-444444444444', 'Hendra Kusuma', 'supply@fantech-utama.co.id', '$2b$10$placeholderhashsupp1', 'supplier', 'PT Fantech Utama Indonesia', 'Approved'),
    ('55555555-5555-5555-5555-555555555555', 'Lisa Tan', 'sales@shenzhenperipherals.cn', '$2b$10$placeholderhashsupp2', 'supplier', 'Shenzhen Peripherals Co.', 'Pending');

INSERT INTO categories (id, name, description, image_url) VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Gaming Mouse', 'Mouse gaming wired dan wireless dengan sensor presisi tinggi', '/images/categories/mouse.png'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Mechanical Keyboard', 'Keyboard mekanikal ukuran full-size, TKL, dan 65%', '/images/categories/keyboard.png'),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Gaming Headset', 'Headset gaming surround sound dengan noise-cancelling mic', '/images/categories/headset.png');

INSERT INTO products (sku, name, category_id, description, buy_price, sell_price, min_stock, low_stock, current_stock, unit, rack_location, image_url) VALUES
    ('FNT-VX7-BLK', 'Fantech Crypto VX7 Black', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Macro gaming mouse 8000 DPI RGB', 95000, 149000, 10, 25, 42, 'pcs', 'Rak-A1', '/images/products/vx7-blk.png'),
    ('FNT-XD3V2-WHT', 'Fantech Helios XD3 V2 White', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Wireless gaming mouse PixArt 3370', 380000, 549000, 5, 15, 8, 'pcs', 'Rak-A2', '/images/products/xd3v2-wht.png'),
    ('FNT-MK853-PNK', 'Fantech Maxpower MK853 Sakura', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Full-size mechanical keyboard Blue Switch', 290000, 429000, 5, 12, 4, 'pcs', 'Rak-B1', '/images/products/mk853-pnk.png'),
    ('FNT-HG23-BLK', 'Fantech Octane HG23', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '7.1 Virtual surround gaming headset', 165000, 249000, 8, 20, 0, 'pcs', 'Rak-C1', '/images/products/hg23-blk.png');