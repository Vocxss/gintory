import bcrypt from "bcrypt";
import { Pool } from "pg";

export async function seedDatabase() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL tidak ditemukan di environment variables.");
  }

  const pool = new Pool({ connectionString });
  const client = await pool.connect();

  const ids = {
    users: {
      admin: "11111111-1111-1111-1111-111111111111",
      manager: "22222222-2222-2222-2222-222222222222",
      staff: "33333333-3333-3333-3333-333333333333",
      supplierApproved: "44444444-4444-4444-4444-444444444444",
      supplierPending: "55555555-5555-5555-5555-555555555555",
    },
    categories: {
      mouse: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      keyboard: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      headset: "cccccccc-cccc-cccc-cccc-cccccccccccc",
      mousepad: "dddddddd-dddd-dddd-dddd-dddddddddddd",
    },
    products: {
      vx7: "10000000-0000-0000-0000-000000000001",
      xd3v2: "10000000-0000-0000-0000-000000000002",
      mk853: "10000000-0000-0000-0000-000000000003",
      hg23: "10000000-0000-0000-0000-000000000004",
      mp903: "10000000-0000-0000-0000-000000000005",
    },
    restockOrders: {
      receivedPo: "20000000-0000-0000-0000-000000000001",
      inspectingPo: "20000000-0000-0000-0000-000000000002",
      pendingPo: "20000000-0000-0000-0000-000000000003",
      returnedPo: "20000000-0000-0000-0000-000000000004",
      inspectingAvailablePo: "20000000-0000-0000-0000-000000000005",
    },
    transactions: {
      incomingApproved: "30000000-0000-0000-0000-000000000001",
      incomingPending: "30000000-0000-0000-0000-000000000002",
      outgoingShipped: "30000000-0000-0000-0000-000000000003",
      outgoingApproved: "30000000-0000-0000-0000-000000000004",
    },
    notifications: {
      adminSupplier: "40000000-0000-0000-0000-000000000001",
      managerIncoming: "40000000-0000-0000-0000-000000000002",
      staffInspecting: "40000000-0000-0000-0000-000000000003",
      supplierNewPo: "40000000-0000-0000-0000-000000000004",
    },
  };

  try {
    await client.query("BEGIN");

    const [adminPassword, managerPassword, staffPassword, supplierPassword] =
      await Promise.all([
        bcrypt.hash("gibran19", 10),
        bcrypt.hash("bahlulu02", 10),
        bcrypt.hash("bahlili02", 10),
        bcrypt.hash("hidup_sawit", 10),
        bcrypt.hash("lopyu_wowo", 10),
      ]);

    await client.query(
      `
      INSERT INTO users (id, full_name, email, password, role, company_name, supplier_status, rejection_reason)
      VALUES
        ($1, 'Gibran Rakabuming Raka', 'admin_gibran@gintory.id', $6, 'admin', NULL, NULL, NULL),
        ($2, 'Bahlulu', 'manager_bahlulu@gintory.id', $7, 'manager', NULL, NULL, NULL),
        ($3, 'Bahlili', 'staff_bahlili@gintory.id', $8, 'staff', NULL, NULL, NULL),
        ($4, 'Cabowo Cubianto', 'supply_cabowo@fantech.id', $9, 'supplier', 'PT. Fantech Sukses Jaya', 'Approved', NULL),
        ($5, 'Teddy Bear', 'supply_teddy@rexus.id', $9, 'supplier', 'PT. Rexus Jaya', 'Pending', NULL)
      ON CONFLICT (id) DO NOTHING;
      `,
      [
        ids.users.admin,
        ids.users.manager,
        ids.users.staff,
        ids.users.supplierApproved,
        ids.users.supplierPending,
        adminPassword,
        managerPassword,
        staffPassword,
        supplierPassword,
      ],
    );

    await client.query(
      `
      INSERT INTO categories (id, name, description, image_url)
      VALUES
        ($1, 'Gaming Mouse', 'Mouse gaming wired dan wireless dengan sensor optik presisi tinggi', '/uploads/categories/mouse.png'),
        ($2, 'Mechanical Keyboard', 'Keyboard mekanikal ukuran full-size, TKL, dan 65% hot-swappable', '/uploads/categories/keyboard.png'),
        ($3, 'Gaming Headset', 'Headset gaming 7.1 surround sound dengan noise-cancelling mic', '/uploads/categories/headset.png'),
        ($4, 'Mousepad & Deskmat', 'Alas mouse gaming speed & control edition berbagai ukuran', '/uploads/categories/mousepad.png')
      ON CONFLICT (id) DO UPDATE SET image_url = EXCLUDED.image_url;
      `,
      [
        ids.categories.mouse,
        ids.categories.keyboard,
        ids.categories.headset,
        ids.categories.mousepad,
      ],
    );

    await client.query(
      `
      INSERT INTO products (
        id, sku, name, category_id, supplier_id, description, buy_price, sell_price,
        min_stock, low_stock, current_stock, unit, rack_location, image_url
      )
      VALUES
        ($1, 'FNT-MSE-VX7-BLK', 'Fantech Crypto VX7 Black', $6, $10, 'Macro gaming mouse 8000 DPI RGB', 95000, 149000, 10, 25, 45, 'pcs', 'Rak-A1', '/uploads/products/mouse/FNTMSEVX7BLK.jpg'),
        ($2, 'FNT-MSE-XD3V2-WHT', 'Fantech Helios XD3 V2 White', $6, $10, 'Wireless gaming mouse sensor PixArt 3370', 380000, 549000, 5, 15, 12, 'pcs', 'Rak-A2', '/uploads/products/mouse/FNTMSEXD3V2WHT.png'),
        ($3, 'FNT-MK-MK853-PNK', 'Fantech Maxpower MK853 Sakura', $7, $10, 'Full-size mechanical keyboard Blue Switch', 290000, 429000, 5, 12, 4, 'pcs', 'Rak-B1', '/uploads/products/keyboard/FNTMK853PNK.jpg'),
        ($4, 'FNT-HDT-HG23-BLK', 'Fantech Octane HG23', $8, $10, '7.1 Virtual surround gaming headset', 165000, 249000, 8, 20, 0, 'pcs', 'Rak-C1', '/uploads/products/headset/FNTHDTHG23BLK.png'),
        ($5, 'FNT-MC-MP903-BLK', 'Fantech Sven MP903 Deskmat', $9, $10, 'Extended gaming mousepad 900x300x3mm', 55000, 89000, 15, 30, 60, 'pcs', 'Rak-D1', '/uploads/products/mousepad/FNTMCMP903BLK.png')
      ON CONFLICT (id) DO UPDATE SET image_url = EXCLUDED.image_url;
      `,
      [
        ids.products.vx7,
        ids.products.xd3v2,
        ids.products.mk853,
        ids.products.hg23,
        ids.products.mp903,
        ids.categories.mouse,
        ids.categories.keyboard,
        ids.categories.headset,
        ids.categories.mousepad,
        ids.users.supplierApproved,
      ],
    );

    const extraProducts: Array<
      [
        string,
        string,
        string,
        string,
        string,
        string,
        number,
        number,
        number,
        number,
        number,
        string,
        string,
        string,
      ]
    > = [
      [
        "10000000-0000-0000-0000-000000000006",
        "FNT-MSE-XD5-BLK",
        "Fantech Helios Go XD5 Black",
        ids.categories.mouse,
        ids.users.supplierApproved,
        "Ergonomic wireless gaming mouse PixArt 3370",
        350000,
        499000,
        6,
        15,
        28,
        "pcs",
        "Rak-A3",
        "/uploads/products/mouse/FNTMSEXD5BLK.png",
      ],
      [
        "10000000-0000-0000-0000-000000000007",
        "FNT-MSE-ARIA-WHT",
        "Fantech Aria XD7 Atomic White",
        ids.categories.mouse,
        ids.users.supplierApproved,
        "Ultralight 59g egg-shaped wireless mouse PAW3395",
        520000,
        749000,
        5,
        12,
        9,
        "pcs",
        "Rak-A4",
        "/uploads/products/mouse/FNTMSEARIAWHT.png",
      ],
      [
        "10000000-0000-0000-0000-000000000008",
        "FNT-MSE-WGC2-BLK",
        "Fantech Venom II WGC2 Black",
        ids.categories.mouse,
        ids.users.supplierApproved,
        "Wireless gaming mouse rechargeable 4000 DPI",
        135000,
        199000,
        10,
        25,
        34,
        "pcs",
        "Rak-A5",
        "/uploads/products/mouse/FNTMSEWGC2BLK.jpg",
      ],
      [
        "10000000-0000-0000-0000-000000000009",
        "FNT-MK-MK857-BLK",
        "Fantech Maxfit61 Frost MK857",
        ids.categories.keyboard,
        ids.users.supplierApproved,
        "60% hot-swappable mechanical keyboard translucent case",
        310000,
        459000,
        6,
        15,
        22,
        "pcs",
        "Rak-B2",
        "/uploads/products/keyboard/FNTMK857BLK.jpg",
      ],
      [
        "10000000-0000-0000-0000-000000000010",
        "FNT-MK-MK858-WHT",
        "Fantech Maxfit67 Wireless White",
        ids.categories.keyboard,
        ids.users.supplierApproved,
        "65% tri-mode wireless mechanical keyboard knob control",
        640000,
        899000,
        4,
        10,
        3,
        "pcs",
        "Rak-B3",
        "/uploads/products/keyboard/FNTMK858WHT.png",
      ],
      [
        "10000000-0000-0000-0000-000000000011",
        "FNT-HDT-MH90-BLK",
        "Fantech Sonata MH90 Black",
        ids.categories.headset,
        ids.users.supplierApproved,
        "Multi-platform gaming headset 53mm driver detachable mic",
        280000,
        419000,
        5,
        12,
        18,
        "pcs",
        "Rak-C2",
        "/uploads/products/headset/FNTHDTMH90BLK.jpg",
      ],
      [
        "10000000-0000-0000-0000-000000000012",
        "FNT-HDT-WHG03-WHT",
        "Fantech Studio Pro WHG03 White",
        ids.categories.headset,
        ids.users.supplierApproved,
        "Tri-mode wireless gaming headset low latency 2.4GHz",
        420000,
        599000,
        5,
        12,
        7,
        "pcs",
        "Rak-C3",
        "/uploads/products/headset/FNTHDTWHG03WHT.png",
      ],
      [
        "10000000-0000-0000-0000-000000000013",
        "FNT-MC-AGILE-MP453",
        "Fantech Agile MP453 Speed",
        ids.categories.mousepad,
        ids.users.supplierApproved,
        "Water-resistant speed surface mousepad 450x400x3mm",
        75000,
        119000,
        10,
        25,
        40,
        "pcs",
        "Rak-D2",
        "/uploads/products/mousepad/FNTMCMP453.png",
      ],
      [
        "10000000-0000-0000-0000-000000000014",
        "RXS-MSE-DAXA-AIR4",
        "Rexus Daxa Air IV Wireless",
        ids.categories.mouse,
        ids.users.supplierPending,
        "Wireless gaming mouse sensor PAW3370 swappable cover",
        430000,
        629000,
        5,
        15,
        26,
        "pcs",
        "Rak-A6",
        "/uploads/products/mouse/RXSMSEDAXAAIR4.png",
      ],
      [
        "10000000-0000-0000-0000-000000000015",
        "RXS-MSE-X15-BLK",
        "Rexus Xierra X15 Macro Black",
        ids.categories.mouse,
        ids.users.supplierPending,
        "Wired macro gaming mouse 7200 DPI RGB LED",
        110000,
        169000,
        10,
        20,
        52,
        "pcs",
        "Rak-A7",
        "/uploads/products/mouse/RXSMSEX15BLK.png",
      ],
      [
        "10000000-0000-0000-0000-000000000016",
        "RXS-MSE-ARSA-WHT",
        "Rexus Arsa Wireless White",
        ids.categories.mouse,
        ids.users.supplierPending,
        "Lightweight dual-mode wireless gaming mouse 65g",
        245000,
        359000,
        6,
        14,
        11,
        "pcs",
        "Rak-A8",
        "/uploads/products/mouse/RXSMSEARSAWHT.jpg",
      ],
      [
        "10000000-0000-0000-0000-000000000017",
        "RXS-MK-DAXA-M71P",
        "Rexus Daxa M71 Pro Wireless",
        ids.categories.keyboard,
        ids.users.supplierPending,
        "71-key wireless mechanical keyboard Gateron switch",
        590000,
        849000,
        5,
        12,
        19,
        "pcs",
        "Rak-B4",
        "/uploads/products/keyboard/RXSMKDAXAM71P.jpg",
      ],
      [
        "10000000-0000-0000-0000-000000000018",
        "RXS-MK-MX52-BLK",
        "Rexus Legionare MX5.2 TKL",
        ids.categories.keyboard,
        ids.users.supplierPending,
        "Tenkeyless mechanical keyboard Outemu Red Switch",
        275000,
        399000,
        8,
        18,
        5,
        "pcs",
        "Rak-B5",
        "/uploads/products/keyboard/RXSMKMX52BLK.jpg",
      ],
      [
        "10000000-0000-0000-0000-000000000019",
        "RXS-MK-MX20-WHT",
        "Rexus Legionare MX20 Hot-Swap",
        ids.categories.keyboard,
        ids.users.supplierPending,
        "Full-size hot-swappable mechanical keyboard RGB",
        340000,
        489000,
        6,
        15,
        0,
        "pcs",
        "Rak-B6",
        "/uploads/products/keyboard/RXSMKMX20WHT.jpg",
      ],
      [
        "10000000-0000-0000-0000-000000000020",
        "RXS-HDT-F30-BLK",
        "Rexus Thundervox HX20 Black",
        ids.categories.headset,
        ids.users.supplierPending,
        "Virtual 7.1 surround gaming headset detachable mic",
        220000,
        329000,
        8,
        18,
        31,
        "pcs",
        "Rak-C4",
        "/uploads/products/headset/RXSHDTF30BLK.jpg",
      ],
      [
        "10000000-0000-0000-0000-000000000021",
        "RXS-HDT-S9-PNK",
        "Rexus Vonix F65 Pink Edition",
        ids.categories.headset,
        ids.users.supplierPending,
        "Stereo gaming headset soft earcup LED accent",
        145000,
        219000,
        10,
        20,
        14,
        "pcs",
        "Rak-C5",
        "/uploads/products/headset/RXSHDTS9PNK.jpg",
      ],
      [
        "10000000-0000-0000-0000-000000000022",
        "RXS-HDT-DAXA-S7",
        "Rexus Daxa Sedna Wireless",
        ids.categories.headset,
        ids.users.supplierPending,
        "Dual-wireless gaming headset 50mm neodymium driver",
        490000,
        699000,
        4,
        10,
        2,
        "pcs",
        "Rak-C6",
        "/uploads/products/headset/RXSHDTDAXAS7.jpg",
      ],
      [
        "10000000-0000-0000-0000-000000000023",
        "RXS-MC-KVTR1-XL",
        "Rexus Kvlar T10 Extended",
        ids.categories.mousepad,
        ids.users.supplierPending,
        "Extended speed gaming deskmat 800x300x4mm",
        65000,
        105000,
        12,
        25,
        48,
        "pcs",
        "Rak-D3",
        "/uploads/products/mousepad/RXSMCKVTR1XL.jpg",
      ],
      [
        "10000000-0000-0000-0000-000000000024",
        "RXS-MC-DAXA-RTRO",
        "Rexus Daxa Retro Deskmat",
        ids.categories.mousepad,
        ids.users.supplierPending,
        "Control edition jacquard cloth deskmat 900x400x4mm",
        125000,
        189000,
        8,
        18,
        15,
        "pcs",
        "Rak-D4",
        "/uploads/products/mousepad/RXSMCDAXARTRO.jpg",
      ],
      [
        "10000000-0000-0000-0000-000000000025",
        "RXS-MC-KVLRT8-L",
        "Rexus Kvlar T8 Control Large",
        ids.categories.mousepad,
        ids.users.supplierPending,
        "Anti-slip rubber base mousepad stitched edges",
        45000,
        75000,
        15,
        30,
        72,
        "pcs",
        "Rak-D5",
        "/uploads/products/mousepad/RXSMCKVLRT8L.jpg",
      ],
    ];

    for (const product of extraProducts) {
      await client.query(
        `
        INSERT INTO products (
          id, sku, name, category_id, supplier_id, description, buy_price, sell_price,
          min_stock, low_stock, current_stock, unit, rack_location, image_url
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (id) DO UPDATE SET image_url = EXCLUDED.image_url;
        `,
        product,
      );
    }

    await client.query(
      `
      INSERT INTO restock_orders (
        id, po_number, supplier_id, created_by, order_date, expected_delivery_date,
        notes, status, status_reason, delivery_proof_url, refund_requested, refund_reason, replacement_po_id
      )
      VALUES
        ($1, 'PO-20261115-0001', $6, $7, CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE - INTERVAL '2 days',
         'Restock batch mingguan mouse VX7', 'Received', NULL, '/logo.webp', FALSE, NULL, NULL),
        ($2, 'PO-20261119-0002', $6, $7, CURRENT_DATE - INTERVAL '2 days', CURRENT_DATE,
         'Restock mendesak headset HG23 dan keyboard MK853', 'Inspecting', NULL, '/logo.webp', FALSE, NULL, NULL),
        ($3, 'PO-20261121-0003', $6, $7, CURRENT_DATE, CURRENT_DATE + INTERVAL '4 days',
         'Pengadaan tambahan Helios XD3 V2', 'Pending', NULL, NULL, FALSE, NULL, NULL),
        ($4, 'PO-20261110-0004', $6, $7, CURRENT_DATE - INTERVAL '11 days', CURRENT_DATE - INTERVAL '7 days',
         'Order batch awal switch merah', 'Returned',
         'Kemasan penyok dan tipe switch tidak sesuai spesifikasi PO', '/logo.webp',
         TRUE, 'Klaim pengembalian dana untuk 10 unit MK853 yang diretur', NULL),
        ($5, 'PO-20261124-0005', $6, $7, CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE,
         'Restock siap periksa fisik mouse VX7 dan mousepad MP903', 'Inspecting', NULL, '/logo.webp', FALSE, NULL, NULL)
      ON CONFLICT (id) DO NOTHING;
      `,
      [
        ids.restockOrders.receivedPo,
        ids.restockOrders.inspectingPo,
        ids.restockOrders.pendingPo,
        ids.restockOrders.returnedPo,
        ids.restockOrders.inspectingAvailablePo,
        ids.users.supplierApproved,
        ids.users.manager,
      ],
    );

    await client.query(
      `
      INSERT INTO restock_order_items (restock_order_id, product_id, quantity)
      VALUES
        ($1, $6, 30),
        ($2, $8, 15),
        ($2, $9, 25),
        ($3, $7, 20),
        ($4, $8, 10),
        ($5, $6, 20),
        ($5, $10, 15)
      ON CONFLICT (restock_order_id, product_id) DO NOTHING;
      `,
      [
        ids.restockOrders.receivedPo,
        ids.restockOrders.inspectingPo,
        ids.restockOrders.pendingPo,
        ids.restockOrders.returnedPo,
        ids.restockOrders.inspectingAvailablePo,
        ids.products.vx7,
        ids.products.xd3v2,
        ids.products.mk853,
        ids.products.hg23,
        ids.products.mp903,
      ],
    );

    await client.query(
      `
      INSERT INTO transactions (
        id, transaction_number, type, transaction_date, restock_order_id,
        supplier_id, customer_name, notes, proof_image_url, status, rejection_reason, created_by, approved_by
      )
      VALUES
        ($1, 'TRX-IN-20261119-0001', 'INCOMING', CURRENT_DATE - INTERVAL '2 days', $5,
         $7, NULL, 'Barang diterima lengkap dan segel utuh', '/logo.webp', 'Approved', NULL, $8, $9),
        ($2, 'TRX-IN-20261121-0002', 'INCOMING', CURRENT_DATE, $6,
         $7, NULL, 'Laporan hasil pemeriksaan fisik PO-20261119-0002 sesuai jumlah', '/logo.webp', 'Pending', NULL, $8, NULL),
        ($3, 'TRX-OUT-20261118-0001', 'OUTGOING', CURRENT_DATE - INTERVAL '3 days', NULL,
         NULL, 'Toko Gaming Makassar Jaya', 'Pengiriman ekspedisi kargo darat selesai', NULL, 'Shipped', NULL, $8, $9),
        ($4, 'TRX-OUT-20261121-0002', 'OUTGOING', CURRENT_DATE, NULL,
         NULL, 'Cyber Arena Esports Cafe', 'Disetujui Manager, siap di-packing dan dikirim Staff', NULL, 'Approved', NULL, $8, $9)
      ON CONFLICT (id) DO NOTHING;
      `,
      [
        ids.transactions.incomingApproved,
        ids.transactions.incomingPending,
        ids.transactions.outgoingShipped,
        ids.transactions.outgoingApproved,
        ids.restockOrders.receivedPo,
        ids.restockOrders.inspectingPo,
        ids.users.supplierApproved,
        ids.users.staff,
        ids.users.manager,
      ],
    );

    await client.query(
      `
      INSERT INTO transaction_items (transaction_id, product_id, quantity)
      VALUES
        ($1, $5, 30),
        ($2, $7, 15),
        ($2, $8, 25),
        ($3, $5, 10),
        ($3, $9, 15),
        ($4, $6, 5)
      ON CONFLICT (transaction_id, product_id) DO NOTHING;
      `,
      [
        ids.transactions.incomingApproved,
        ids.transactions.incomingPending,
        ids.transactions.outgoingShipped,
        ids.transactions.outgoingApproved,
        ids.products.vx7,
        ids.products.xd3v2,
        ids.products.mk853,
        ids.products.hg23,
        ids.products.mp903,
      ],
    );

    await client.query(
      `
      INSERT INTO notifications (id, user_id, title, message, link, is_read)
      VALUES
        ($1, $5, 'Pendaftaran Supplier Baru', 'Shenzhen Peripherals Co. mendaftar dan menunggu verifikasi Anda.', '/admin/suppliers', FALSE),
        ($2, $6, 'Laporan Barang Masuk Baru', 'Staff Gudang mengajukan laporan TRX-IN-20261121-0002 untuk disetujui.', '/manager/transactions', FALSE),
        ($3, $7, 'Pesanan Siap Diperiksa', 'PO-20261119-0002 berstatus Inspecting. Silakan cek fisik barang dan buat laporan.', '/staff/restock-orders/20000000-0000-0000-0000-000000000002', TRUE),
        ($4, $8, 'Purchase Order Baru', 'Warehouse Manager membuat PO-20261121-0003. Klik detail untuk verifikasi dan konfirmasi.', '/supplier/restock-orders/20000000-0000-0000-0000-000000000003', FALSE)
      ON CONFLICT (id) DO NOTHING;
      `,
      [
        ids.notifications.adminSupplier,
        ids.notifications.managerIncoming,
        ids.notifications.staffInspecting,
        ids.notifications.supplierNewPo,
        ids.users.admin,
        ids.users.manager,
        ids.users.staff,
        ids.users.supplierApproved,
      ],
    );

    await client.query("COMMIT");
    console.log("Database seeding berhasil dijalankan untuk seluruh tabel.");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Database seeding gagal, transaksi di-rollback:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seedDatabase().catch(() => {
  process.exit(1);
});
