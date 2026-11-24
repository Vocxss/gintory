import ExcelJS from "exceljs";

export type AdminReportData = {
  exportedAt: string;
  exportedBy: string;
  periodLabel: string;
  summary: {
    totalProducts: number;
    totalInventoryValue: number;
    normalCount: number;
    lowCount: number;
    severeCount: number;
    outOfStockCount: number;
    internalUsersCount: number;
    supplierPendingCount: number;
    supplierApprovedCount: number;
    supplierRejectedCount: number;
    totalTransactions: number;
  };
  products: Array<{
    sku: string;
    name: string;
    category_name: string;
    supplier_company: string | null;
    buy_price: number;
    sell_price: number;
    current_stock: number;
    inventory_value: number;
    min_stock: number;
    low_stock: number;
    stock_status: string;
    unit: string;
    rack_location: string;
  }>;
  categories: Array<{
    name: string;
    description: string;
    product_count: number;
  }>;
  users: Array<{
    full_name: string;
    email: string;
    role: string;
    company_name: string | null;
    supplier_status: string | null;
    rejection_reason: string | null;
    created_at: string;
  }>;
  transactions: Array<{
    transaction_number: string;
    type: string;
    transaction_date: string;
    po_number: string | null;
    party_name: string;
    status: string;
    created_by_name: string;
    approved_by_name: string | null;
    notes: string | null;
    rejection_reason: string | null;
  }>;
};

export type ManagerReportData = {
  exportedAt: string;
  exportedBy: string;
  periodLabel: string;
  summary: {
    totalProducts: number;
    normalCount: number;
    lowCount: number;
    severeCount: number;
    outOfStockCount: number;
    pendingTransactions: number;
    pendingInspectOrders: number;
    returnedOrders: number;
  };
  products: Array<{
    sku: string;
    name: string;
    category_name: string;
    supplier_company: string | null;
    current_stock: number;
    min_stock: number;
    low_stock: number;
    stock_status: string;
    unit: string;
    rack_location: string;
  }>;
  restockOrders: Array<{
    po_number: string;
    supplier_company: string;
    order_date: string;
    expected_delivery_date: string;
    status: string;
    items_summary: string;
    refund_requested: boolean;
    refund_reason: string | null;
    status_reason: string | null;
    notes: string | null;
  }>;
  transactions: Array<{
    transaction_number: string;
    type: string;
    transaction_date: string;
    po_number: string | null;
    party_name: string;
    status: string;
    created_by_name: string;
    approved_by_name: string | null;
    notes: string | null;
    rejection_reason: string | null;
  }>;
  approvedSuppliers: Array<{
    full_name: string;
    company_name: string | null;
    email: string;
  }>;
};

function styleHeaderRow(sheet: ExcelJS.Worksheet) {
  const row = sheet.getRow(1);
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1E3A8A" },
  };
  row.alignment = { vertical: "middle", horizontal: "left" };
  row.height = 24;
  sheet.views = [{ state: "frozen", ySplit: 1 }];
}

export function buildAdminWorkbook(data: AdminReportData) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = data.exportedBy;
  workbook.created = new Date();

  const summarySheet = workbook.addWorksheet("Ringkasan");
  summarySheet.columns = [
    { header: "Metrik", key: "metric", width: 32 },
    { header: "Nilai", key: "value", width: 36 },
  ];
  summarySheet.addRows([
    { metric: "Role Pembuat Laporan", value: "Admin" },
    { metric: "Dibuat Oleh", value: data.exportedBy },
    { metric: "Tanggal Ekspor", value: data.exportedAt },
    { metric: "Periode Transaksi", value: data.periodLabel },
    { metric: "Total Produk", value: data.summary.totalProducts },
    {
      metric: "Total Nilai Inventori",
      value: data.summary.totalInventoryValue,
    },
    { metric: "Stok Normal", value: data.summary.normalCount },
    { metric: "Stok Rendah (Low)", value: data.summary.lowCount },
    { metric: "Stok Kritis (Severe)", value: data.summary.severeCount },
    {
      metric: "Stok Habis (Out of Stock)",
      value: data.summary.outOfStockCount,
    },
    { metric: "Total Akun Internal", value: data.summary.internalUsersCount },
    { metric: "Supplier Pending", value: data.summary.supplierPendingCount },
    { metric: "Supplier Approved", value: data.summary.supplierApprovedCount },
    { metric: "Supplier Rejected", value: data.summary.supplierRejectedCount },
    {
      metric: "Total Transaksi (Periode)",
      value: data.summary.totalTransactions,
    },
  ]);
  summarySheet.getCell("B7").numFmt = '"Rp"#,##0';
  styleHeaderRow(summarySheet);

  const productsSheet = workbook.addWorksheet("Inventori Produk");
  productsSheet.columns = [
    { header: "SKU", key: "sku", width: 22 },
    { header: "Nama Produk", key: "name", width: 32 },
    { header: "Kategori", key: "category_name", width: 22 },
    { header: "Supplier", key: "supplier_company", width: 26 },
    { header: "Harga Beli", key: "buy_price", width: 16 },
    { header: "Harga Jual", key: "sell_price", width: 16 },
    { header: "Stok Saat Ini", key: "current_stock", width: 14 },
    { header: "Nilai Inventori", key: "inventory_value", width: 18 },
    { header: "Min Stock", key: "min_stock", width: 12 },
    { header: "Low Stock", key: "low_stock", width: 12 },
    { header: "Status Stok", key: "stock_status", width: 16 },
    { header: "Satuan", key: "unit", width: 10 },
    { header: "Lokasi Rak", key: "rack_location", width: 14 },
  ];
  for (const item of data.products) {
    productsSheet.addRow({
      ...item,
      supplier_company: item.supplier_company ?? "-",
    });
  }
  productsSheet.getColumn("buy_price").numFmt = '"Rp"#,##0';
  productsSheet.getColumn("sell_price").numFmt = '"Rp"#,##0';
  productsSheet.getColumn("inventory_value").numFmt = '"Rp"#,##0';
  styleHeaderRow(productsSheet);

  const categoriesSheet = workbook.addWorksheet("Kategori");
  categoriesSheet.columns = [
    { header: "Nama Kategori", key: "name", width: 26 },
    { header: "Deskripsi", key: "description", width: 48 },
    { header: "Jumlah Produk", key: "product_count", width: 16 },
  ];
  categoriesSheet.addRows(data.categories);
  styleHeaderRow(categoriesSheet);

  const usersSheet = workbook.addWorksheet("Pengguna & Supplier");
  usersSheet.columns = [
    { header: "Nama Lengkap", key: "full_name", width: 26 },
    { header: "Email", key: "email", width: 30 },
    { header: "Role", key: "role", width: 14 },
    { header: "Perusahaan", key: "company_name", width: 28 },
    { header: "Status Supplier", key: "supplier_status", width: 16 },
    { header: "Alasan Penolakan", key: "rejection_reason", width: 34 },
    { header: "Terdaftar", key: "created_at", width: 16 },
  ];
  for (const user of data.users) {
    usersSheet.addRow({
      ...user,
      company_name: user.company_name ?? "-",
      supplier_status: user.supplier_status ?? "-",
      rejection_reason: user.rejection_reason ?? "-",
    });
  }
  styleHeaderRow(usersSheet);

  const trxSheet = workbook.addWorksheet("Riwayat Transaksi");
  trxSheet.columns = [
    { header: "No. Transaksi", key: "transaction_number", width: 24 },
    { header: "Tipe", key: "type", width: 14 },
    { header: "Tanggal", key: "transaction_date", width: 14 },
    { header: "No. PO", key: "po_number", width: 22 },
    { header: "Pihak", key: "party_name", width: 28 },
    { header: "Status", key: "status", width: 14 },
    { header: "Dibuat Oleh", key: "created_by_name", width: 22 },
    { header: "Diproses Oleh", key: "approved_by_name", width: 22 },
    { header: "Catatan", key: "notes", width: 34 },
    { header: "Alasan Penolakan", key: "rejection_reason", width: 34 },
  ];
  for (const trx of data.transactions) {
    trxSheet.addRow({
      ...trx,
      po_number: trx.po_number ?? "-",
      approved_by_name: trx.approved_by_name ?? "-",
      notes: trx.notes ?? "-",
      rejection_reason: trx.rejection_reason ?? "-",
    });
  }
  styleHeaderRow(trxSheet);

  return workbook;
}

export function buildManagerWorkbook(data: ManagerReportData) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = data.exportedBy;
  workbook.created = new Date();

  const summarySheet = workbook.addWorksheet("Ringkasan Operasional");
  summarySheet.columns = [
    { header: "Metrik", key: "metric", width: 32 },
    { header: "Nilai", key: "value", width: 36 },
  ];
  summarySheet.addRows([
    { metric: "Role Pembuat Laporan", value: "Warehouse Manager" },
    { metric: "Dibuat Oleh", value: data.exportedBy },
    { metric: "Tanggal Ekspor", value: data.exportedAt },
    { metric: "Periode Laporan", value: data.periodLabel },
    { metric: "Total Produk", value: data.summary.totalProducts },
    { metric: "Stok Normal", value: data.summary.normalCount },
    { metric: "Stok Rendah (Low)", value: data.summary.lowCount },
    { metric: "Stok Kritis (Severe)", value: data.summary.severeCount },
    {
      metric: "Stok Habis (Out of Stock)",
      value: data.summary.outOfStockCount,
    },
    {
      metric: "Transaksi Menunggu Approval",
      value: data.summary.pendingTransactions,
    },
    {
      metric: "PO Menunggu Instruksi Inspeksi",
      value: data.summary.pendingInspectOrders,
    },
    { metric: "PO Diretur (Returned)", value: data.summary.returnedOrders },
  ]);
  styleHeaderRow(summarySheet);

  const productsSheet = workbook.addWorksheet("Produk & Stok");
  productsSheet.columns = [
    { header: "SKU", key: "sku", width: 22 },
    { header: "Nama Produk", key: "name", width: 32 },
    { header: "Kategori", key: "category_name", width: 22 },
    { header: "Supplier", key: "supplier_company", width: 26 },
    { header: "Stok Saat Ini", key: "current_stock", width: 14 },
    { header: "Min Stock", key: "min_stock", width: 12 },
    { header: "Low Stock", key: "low_stock", width: 12 },
    { header: "Status Stok", key: "stock_status", width: 16 },
    { header: "Satuan", key: "unit", width: 10 },
    { header: "Lokasi Rak", key: "rack_location", width: 14 },
  ];
  for (const item of data.products) {
    productsSheet.addRow({
      ...item,
      supplier_company: item.supplier_company ?? "-",
    });
  }
  styleHeaderRow(productsSheet);

  const poSheet = workbook.addWorksheet("Purchase Order");
  poSheet.columns = [
    { header: "No. PO", key: "po_number", width: 22 },
    { header: "Supplier", key: "supplier_company", width: 26 },
    { header: "Tanggal Order", key: "order_date", width: 14 },
    { header: "Estimasi Tiba", key: "expected_delivery_date", width: 14 },
    { header: "Status", key: "status", width: 14 },
    { header: "Daftar Item", key: "items_summary", width: 42 },
    { header: "Klaim Refund", key: "refund_label", width: 14 },
    { header: "Alasan Refund / Status", key: "reason", width: 36 },
    { header: "Catatan", key: "notes", width: 32 },
  ];
  for (const po of data.restockOrders) {
    poSheet.addRow({
      ...po,
      refund_label: po.refund_requested ? "Ya" : "Tidak",
      reason: po.refund_reason ?? po.status_reason ?? "-",
      notes: po.notes ?? "-",
    });
  }
  styleHeaderRow(poSheet);

  const trxSheet = workbook.addWorksheet("Transaksi Gudang");
  trxSheet.columns = [
    { header: "No. Transaksi", key: "transaction_number", width: 24 },
    { header: "Tipe", key: "type", width: 14 },
    { header: "Tanggal", key: "transaction_date", width: 14 },
    { header: "No. PO", key: "po_number", width: 22 },
    { header: "Pihak", key: "party_name", width: 28 },
    { header: "Status", key: "status", width: 14 },
    { header: "Dibuat Oleh", key: "created_by_name", width: 22 },
    { header: "Diproses Oleh", key: "approved_by_name", width: 22 },
    { header: "Catatan", key: "notes", width: 34 },
    { header: "Alasan Penolakan", key: "rejection_reason", width: 34 },
  ];
  for (const trx of data.transactions) {
    trxSheet.addRow({
      ...trx,
      po_number: trx.po_number ?? "-",
      approved_by_name: trx.approved_by_name ?? "-",
      notes: trx.notes ?? "-",
      rejection_reason: trx.rejection_reason ?? "-",
    });
  }
  styleHeaderRow(trxSheet);

  const supplierSheet = workbook.addWorksheet("Supplier Aktif");
  supplierSheet.columns = [
    { header: "Nama PIC", key: "full_name", width: 26 },
    { header: "Perusahaan", key: "company_name", width: 30 },
    { header: "Email", key: "email", width: 30 },
  ];
  for (const supplier of data.approvedSuppliers) {
    supplierSheet.addRow({
      ...supplier,
      company_name: supplier.company_name ?? "-",
    });
  }
  styleHeaderRow(supplierSheet);

  return workbook;
}
