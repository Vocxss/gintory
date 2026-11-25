<p align="center">
  <img src="public/logotypo.webp" alt="Gintory Logo Banner" width="320" />
</p>

<h1 align="center">Gintory — Gaming Tools Warehouse Management System</h1>

<p align="center">
  Sistem manajemen inventori, pengadaan (Purchase Order), dan mutasi stok gudang aksesoris gaming berbasis <strong>Next.js App Router</strong>, <strong>TypeScript</strong>, <strong>PostgreSQL</strong>, dan prinsip <strong>Segregation of Duties (SoD)</strong>.
</p>

---

## Daftar Isi

1. [Deskripsi Singkat](#1-deskripsi-singkat)
2. [Fitur Utama & Flowchart Alur Sistem](#2-fitur-utama--flowchart-alur-sistem)
3. [Daftar Peran Pengguna & Matriks RBAC](#3-daftar-peran-pengguna--matriks-rbac)
4. [Arsitektur Kode & Keamanan](#4-arsitektur-kode--keamanan)
5. [Skema Database](#5-skema-database)
6. [Struktur Folder Proyek](#6-struktur-folder-proyek)
7. [Struktur API & Fungsinya](#7-struktur-api--fungsinya)
8. [Panduan Instalasi & Penggunaan](#8-panduan-instalasi--penggunaan)
9. [Daftar Script](#9-daftar-script)

---

## 1. Deskripsi Singkat & Masalah yang Diangkat

**Gintory** adalah aplikasi web manajemen gudang (*Warehouse Management System*) yang dirancang khusus untuk pengelolaan stok perangkat keras gaming (seperti *gaming mouse*, *mechanical keyboard*, *gaming headset*, dan *mousepad/deskmat*) beserta kolaborasi pengadaan barang bersama supplier eksternal.

---

## 2. Fitur Utama & Flowchart Alur Sistem

### Alur Utama Gudang

![Flowchart Alur Gudang Gintory](docs/images/gintory-warehouse-flowchart-id.svg)

### Fitur-Fitur Sistem
- **Dashboard Analitik per Role:** Ringkasan KPI spesifik peran (total valuasi inventori untuk Admin, stok kritis & antrean approval untuk Manager, tugas cek fisik & pengiriman untuk Staff, serta status PO aktif untuk Supplier).
- **Manajemen Produk & Kategori Dinamis:** Filter berdasarkan pencarian nama/SKU, kategori, status stok, dan supplier, dilengkapi unggahan gambar lokal serta paginasi 20 data per halaman.
- **Kontrol *Segregation of Duties* pada Produk:** Admin memegang kontrol master/komersial penuh, sedangkan Manager dapat menambah produk baru (stok awal terkunci `0`) dan hanya dapat memperbarui atribut logistik gudang (`rack_location`, `min_stock`, `low_stock`, `unit`, `description`, `image_url`).
- **Siklus Purchase Order (Restock) Terintegrasi:** `Pending` → `Confirmed` / `Rejected` → `In Transit` (wajib bukti foto sebelum kirim dari Supplier) → `Inspecting` → `Received` / `Returned` (disertai alur klaim *refund* dan pembuatan PO pengganti).
- **Transaksi Barang Masuk & Keluar (*Maker-Checker*):**
  - *Incoming:* Terikat ke PO berstatus `Inspecting`, validasi kuantitas tidak boleh melebihi jumlah PO, wajib unggah bukti foto kedatangan oleh Staff.
  - *Outgoing:* Pengajuan oleh Staff, persetujuan oleh Manager, lalu pengurangan stok secara atomik saat Staff menyelesaikan pengiriman (`Shipped`).
- **Verifikasi Supplier & Manajemen Akun Internal:** Registrasi mandiri untuk Supplier (`Pending`), dilanjutkan verifikasi `Approved` / `Rejected` (alasan wajib) oleh Admin, serta pengelolaan akun `admin`, `manager`, dan `staff`.
- **Notifikasi Berbasis Database:** Notifikasi otomatis di setiap transisi status penting lintas peran.
- **Ekspor Laporan Excel (`.xlsx`):** Laporan multi-sheet terformat rapi khusus `admin` (termasuk valuasi inventori & data pengguna) dan `manager` (fokus operasional stok, PO, dan transaksi).

---

## 3. Daftar Peran Pengguna & Matriks RBAC

Sistem memiliki 4 peran utama:

| Peran | Tanggung Jawab Utama |
| :--- | :--- |
| **Admin (`admin`)** | Verifikasi pendaftaran Supplier, kelola akun internal, CRUD master & komersial Produk/Kategori, pantau total nilai inventori, riwayat transaksi, dan ekspor laporan XLSX Admin. |
| **Warehouse Manager (`manager`)** | Kelola Kategori, tambah Produk (stok awal `0`) & ubah atribut logistik Produk, buat PO ke Supplier, instruksikan cek fisik (`Inspecting`), setujui/tolak transaksi masuk & keluar, tindak lanjuti retur/*refund*, dan ekspor laporan XLSX Manager. |
| **Staff Gudang (`staff`)** | Periksa fisik barang PO `Inspecting`, buat transaksi masuk (+ foto barang tiba), ajukan transaksi keluar, serta lakukan *packing* & penyelesaian pengiriman barang keluar (`Shipped`). |
| **Supplier (`supplier`)** | Mendaftar akun secara mandiri, konfirmasi/tolak PO, unggah bukti foto barang sebelum pengiriman (`In Transit`), dan memantau riwayat transaksi masuk terkait perusahaannya. |

### Hak Akses Endpoint (RBAC)

| Endpoint | `admin` | `manager` | `staff` | `supplier` |
| :--- | :---: | :---: | :---: | :---: |
| `POST /api/auth/register` & `login-check` | Publik | Publik | Publik | Publik |
| `GET /api/categories` | Ya | Ya | Ya | Tidak |
| `POST / PATCH / DELETE /api/categories` | Ya | Ya | Tidak | Tidak |
| `GET /api/products` | Ya | Ya | Ya | Tidak |
| `POST /api/products` | Ya | Ya (`current_stock = 0`) | Tidak | Tidak |
| `PATCH /api/products/[id]` | Ya (tanpa `sku`/`current_stock`) | Logistik saja | Tidak | Tidak |
| `DELETE /api/products/[id]` | Ya | Tidak | Tidak | Tidak |
| `GET/POST/PATCH/DELETE /api/users` | Ya | Tidak | Tidak | Tidak |
| `GET /api/suppliers` & `.../verify` | Ya | Hanya `Approved` | Tidak | Tidak |
| `GET /api/restock-orders` & `.../[id]` | Ya | Ya | Ya | Milik Sendiri |
| `POST /api/restock-orders` | Tidak | Ya | Tidak | Tidak |
| `PATCH /api/restock-orders/[id]/respond` | Tidak | Tidak | Tidak | Milik Sendiri |
| `PATCH /api/restock-orders/[id]/ship` | Tidak | Tidak | Tidak | Milik Sendiri |
| `PATCH /api/restock-orders/[id]/inspect` | Tidak | Ya | Tidak | Tidak |
| `PATCH /api/restock-orders/[id]/refund` | Tidak | Ya | Tidak | Tidak |
| `GET /api/transactions` & `.../[id]` | Semua | Semua | Semua | Milik Sendiri |
| `POST /api/transactions/incoming` | Tidak | Tidak | Ya | Tidak |
| `POST /api/transactions/outgoing` | Tidak | Tidak | Ya | Tidak |
| `PATCH / DELETE /api/transactions/[id]` | Tidak | Tidak | Milik Sendiri (`Pending`) | Tidak |
| `PATCH /api/transactions/[id]/review` | Tidak | Ya | Tidak | Tidak |
| `PATCH /api/transactions/[id]/ship` | Tidak | Tidak | Ya | Tidak |
| `GET /api/reports/export` | Ya | Ya | Tidak | Tidak |
| `POST /api/uploads` | Ya | Ya | Ya | Hanya `proofs` |
| `GET/PATCH /api/notifications` | Ya | Ya | Ya | Ya |
| `GET /api/dashboard/summary` | Ya | Ya | Ya | Ya |

---

## 4. Arsitektur Kode & Keamanan

### Autentikasi & Manajemen Sesi
- Menggunakan **NextAuth v5** (`CredentialsProvider`) dengan strategi **JWT** yang menyimpan `id`, `role`, `company_name`, dan `supplier_status`.
- Password di-hash menggunakan **bcrypt** (`salt rounds = 10`).
- Endpoint `POST /api/auth/login-check` memvalidasi kecocokan email & password terlebih dahulu sebelum menampilkan status supplier (`Pending` atau `Rejected` beserta `rejection_reason`), sehingga status akun tidak bocor jika password salah.
- `src/proxy.ts` melindungi seluruh rute terproteksi (`/admin/*`, `/manager/*`, `/staff/*`, `/supplier/*`, `/dashboard/*`) dan memastikan pengguna hanya dapat mengakses prefix rute sesuai perannya.

### Validasi Input & Kontrak HTTP Request
- **Validasi Berlapis dengan Zod v4 (`src/lib/validations/`):** Seluruh payload diverifikasi menggunakan Zod baik di form frontend (`react-hook-form`) maupun di setiap API Route Handler.
- **Proteksi Update Produk:** Skema `adminUpdateProductSchema` dan `managerUpdateProductSchema` menggunakan `.strict()` untuk menolak field terlarang (`403 Forbidden`), serta memvalidasi aturan `low_stock > min_stock`.
- **Standardisasi Response (`src/lib/utils/apiResponse.ts`):** Seluruh endpoint mengembalikan format JSON konsisten `{ success, message, data?, errors?, meta? }` serta helper paginasi `getPagination` (batas maks. 100 item per request).
- **Guard Otorisasi (`src/lib/utils/authGuard.ts`):** Setiap API Route Handler memanggil `requireRole([...])` di baris paling awal untuk memverifikasi sesi (`401`) dan kecocokan role (`403`).

### Keamanan Database & Integritas Data
- **Raw SQL Parameterized Queries (`pg`):** Seluruh kueri SQL menggunakan placeholder `$1, $2, ...` tanpa interpolasi string input pengguna untuk mencegah *SQL Injection*.
- **Transaksi ACID & Row Locking (`src/lib/utils/transaction.ts`):** Operasi sensitif (pembuatan PO, pembuatan transaksi, approval/penolakan transaksi, pengiriman barang keluar) dibungkus dalam `BEGIN ... COMMIT` dengan `ROLLBACK` otomatis jika terjadi kegagalan.
- **Anti-*Race Condition* Stok:** Saat menyetujui `INCOMING` atau mengirim `OUTGOING`, baris `products` dikunci dengan `SELECT ... FOR UPDATE OF p` secara terurut (`ORDER BY ti.product_id`) untuk mencegah *race condition* dan *deadlock*.
- **Keamanan Upload File (`POST /api/uploads`):** Membatasi ukuran maksimal **5 MB**, memvalidasi MIME type (`image/jpeg`, `image/png`, `image/webp`, `image/gif`), menyaring nama file dengan sanitasi alfanumerik + UUID acak, dan membatasi jenis upload per role.

---

## 5. Skema Database

Database menggunakan PostgreSQL dengan ekstensi UUID (`gen_random_uuid()`) dan 8 tabel utama:

```mermaid
erDiagram
    users ||--o{ products : "supplier_id"
    categories ||--o{ products : "category_id"
    users ||--o{ restock_orders : "supplier_id / created_by"
    restock_orders ||--o{ restock_order_items : "restock_order_id"
    products ||--o{ restock_order_items : "product_id"
    restock_orders ||--o{ transactions : "restock_order_id"
    users ||--o{ transactions : "created_by / approved_by / supplier_id"
    transactions ||--o{ transaction_items : "transaction_id"
    products ||--o{ transaction_items : "product_id"
    users ||--o{ notifications : "user_id"
```

### Ringkasan Tabel & Kolom Utama

1. **`users`**
   - `id` (`uuid`, PK), `full_name` (`varchar`), `email` (`varchar`, unique), `password` (`text`), `role` (`user_role`: `admin` | `manager` | `staff` | `supplier`), `company_name` (`varchar`, nullable), `supplier_status` (`supplier_status`: `Pending` | `Approved` | `Rejected`, nullable), `rejection_reason` (`text`, nullable), `created_at`, `updated_at`.
2. **`categories`**
   - `id` (`uuid`, PK), `name` (`varchar`, unique), `description` (`text`), `image_url` (`text`), `created_at`, `updated_at`.
3. **`products`**
   - `id` (`uuid`, PK), `sku` (`varchar`, unique), `name` (`varchar`), `category_id` (`uuid`, FK → `categories.id`), `supplier_id` (`uuid`, FK → `users.id`), `description` (`text`), `buy_price` (`numeric`), `sell_price` (`numeric`), `min_stock` (`integer`), `low_stock` (`integer`), `current_stock` (`integer`, default `0`), `unit` (`varchar`), `rack_location` (`varchar`), `image_url` (`text`), `created_at`, `updated_at`.
4. **`restock_orders`**
   - `id` (`uuid`, PK), `po_number` (`varchar`, unique), `supplier_id` (`uuid`, FK → `users.id`), `created_by` (`uuid`, FK → `users.id`), `order_date` (`date`), `expected_delivery_date` (`date`), `notes` (`text`), `status` (`restock_status`: `Pending` | `Confirmed` | `Rejected` | `In Transit` | `Inspecting` | `Received` | `Returned`), `status_reason` (`text`), `delivery_proof_url` (`text`), `refund_requested` (`boolean`), `refund_reason` (`text`), `replacement_po_id` (`uuid`), `created_at`, `updated_at`.
5. **`restock_order_items`**
   - `id` (`uuid`, PK), `restock_order_id` (`uuid`, FK → `restock_orders.id`), `product_id` (`uuid`, FK → `products.id`), `quantity` (`integer`).
6. **`transactions`**
   - `id` (`uuid`, PK), `transaction_number` (`varchar`, unique), `type` (`transaction_type`: `INCOMING` | `OUTGOING`), `transaction_date` (`date`), `restock_order_id` (`uuid`, nullable, FK → `restock_orders.id`), `supplier_id` (`uuid`, nullable, FK → `users.id`), `customer_name` (`varchar`, nullable), `notes` (`text`), `proof_image_url` (`text`), `status` (`transaction_status`: `Pending` | `Approved` | `Rejected` | `Shipped`), `rejection_reason` (`text`), `created_by` (`uuid`, FK → `users.id`), `approved_by` (`uuid`, nullable, FK → `users.id`), `created_at`, `updated_at`.
7. **`transaction_items`**
   - `id` (`uuid`, PK), `transaction_id` (`uuid`, FK → `transactions.id`), `product_id` (`uuid`, FK → `products.id`), `quantity` (`integer`).
8. **`notifications`**
   - `id` (`uuid`, PK), `user_id` (`uuid`, FK → `users.id`), `title` (`varchar`), `message` (`text`), `link` (`text`), `is_read` (`boolean`, default `false`), `created_at`.

---

## 6. Struktur Folder Proyek

```text
gintory/
├── docs/
│   └── images/
│       └── gintory-warehouse-flowchart-id.svg # flowchart fitur utama
├── public/
│   ├── logo.webp / logomono.webp / logotypo.webp
│   └── uploads/
│       ├── categories/                 # Gambar kategori (seeder & upload user)
│       ├── products/                   # Gambar produk per kategori
│       └── proofs/                     # Bukti foto PO & barang tiba
└── src/
    ├── proxy.ts                        # Middleware proteksi rute berbasis role JWT
    ├── hooks/
    │   └── use-mobile.ts               # Hook deteksi viewport mobile untuk sidebar
    ├── lib/
    │   ├── utils.ts                    # Utility classname Tailwind (cn)
    │   ├── db/
    │   │   └── seed.ts                 # Seeder akun, kategori, 25 produk, PO & transaksi
    │   ├── types/
    │   │   ├── database.ts             # Interface & union types entitas PostgreSQL
    │   │   └── next-auth.d.ts          # Augmentasi tipe session & JWT NextAuth
    │   ├── utils/
    │   │   ├── apiResponse.ts          # Helper successResponse, errorResponse, getPagination
    │   │   ├── authGuard.ts            # Helper requireRole untuk proteksi API
    │   │   ├── notify.ts               # Helper insert notifikasi ke DB
    │   │   ├── pool.ts                 # Instance PostgreSQL connection pool
    │   │   ├── transaction.ts          # Wrapper transaksi SQL ACID & generator nomor dokumen
    │   │   └── xlsxReport.ts           # Pembentuk workbook ExcelJS untuk Admin & Manager
    │   └── validations/                # Skema validasi Zod (auth, category, product, restock, supplier, transaction, common)
    ├── components/
    │   ├── appSidebar.tsx              # Sidebar navigasi dinamis berdasarkan role
    │   ├── kpiCard.tsx / statusBadge.tsx / loginForm.tsx / registerForm.tsx
    │   ├── admin/                      # Komponen dashboard KPI, tabel dashboard, & manajemen user
    │   ├── features/                   # Komponen reusable fitur (produk, kategori, PO, transaksi, notifikasi, upload, ekspor, paginasi)
    │   ├── hoc/provider.tsx            # Wrapper ThemeProvider, SessionProvider, QueryClientProvider, Toaster
    │   └── ui/                         # Komponen primitif shadcn/ui berbasis Base UI
    └── app/
        ├── layout.tsx / globals.css / page.tsx / not-found.tsx
        ├── (auth)/                     # Halaman publik login & register
        ├── (app)/                      # Halaman terproteksi per role (admin, manager, staff, supplier)
        └── api/                        # Seluruh API Route Handlers Next.js
```

---

## 7. Struktur API & Fungsinya

| Modul | Method & Endpoint | Fungsi |
| :--- | :--- | :--- |
| **Auth** | `POST /api/auth/[...nextauth]` | Autentikasi NextAuth Credentials Provider & manajemen sesi JWT. |
| **Auth** | `POST /api/auth/login-check` | Cek kredensial & status akun supplier (`Pending` / `Rejected`) sebelum login. |
| **Auth** | `POST /api/auth/register` | Registrasi mandiri akun supplier (`Pending`) + notifikasi ke Admin. |
| **Users** | `GET, POST /api/users` | Daftar pengguna internal/semua pengguna & pembuatan akun baru (`admin`). |
| **Users** | `PATCH, DELETE /api/users/[id]` | Ubah profil/role/password atau hapus pengguna lain (`admin`). |
| **Suppliers** | `GET /api/suppliers` | Daftar supplier (filter status `Pending`/`Approved`/`Rejected`). |
| **Suppliers** | `GET /api/suppliers/[id]/products` | Daftar produk milik supplier tertentu. |
| **Suppliers** | `PATCH /api/suppliers/[id]/verify` | Setujui atau tolak pendaftaran supplier dengan alasan wajib (`admin`). |
| **Categories** | `GET, POST /api/categories` | Ambil daftar kategori + jumlah produk, atau buat kategori baru. |
| **Categories** | `PATCH, DELETE /api/categories/[id]` | Perbarui atau hapus kategori (ditolak `409` jika masih dipakai produk). |
| **Products** | `GET, POST /api/products` | Ambil katalog produk (filter search/kategori/supplier/status stok) atau tambah produk baru. |
| **Products** | `PATCH, DELETE /api/products/[id]` | Update produk sesuai SoD role (`admin` vs `manager`), atau hapus produk (`admin`). |
| **Restock PO** | `GET, POST /api/restock-orders` | Daftar PO (mendukung `?available_for_incoming=true` untuk Staff) & buat PO baru (`manager`). |
| **Restock PO** | `GET /api/restock-orders/[id]` | Detail PO lengkap beserta item, bukti foto, dan riwayat transaksi terkait. |
| **Restock PO** | `PATCH /api/restock-orders/[id]/respond` | Konfirmasi (`Confirmed`) atau tolak (`Rejected`) PO oleh Supplier. |
| **Restock PO** | `PATCH /api/restock-orders/[id]/ship` | Unggah bukti foto sebelum kirim & ubah status PO menjadi `In Transit` (`supplier`). |
| **Restock PO** | `PATCH /api/restock-orders/[id]/proof` | Pembaruan bukti foto dokumentasi PO oleh Supplier. |
| **Restock PO** | `PATCH /api/restock-orders/[id]/inspect` | Instruksikan pemeriksaan fisik barang oleh Staff (`In Transit` → `Inspecting`, `manager`). |
| **Restock PO** | `PATCH /api/restock-orders/[id]/refund` | Ajukan klaim *refund* pada PO `Returned` & arahkan ke PO pengganti (`manager`). |
| **Transactions** | `GET /api/transactions` | Riwayat transaksi dengan filter multi-kriteria & paginasi. |
| **Transactions** | `GET, PATCH, DELETE /api/transactions/[id]` | Detail transaksi, atau edit/hapus transaksi `Pending` milik Staff pembuatnya. |
| **Transactions** | `POST /api/transactions/incoming` | Buat transaksi masuk dari PO `Inspecting` (+ bukti foto tiba & validasi maks. kuantitas PO). |
| **Transactions** | `POST /api/transactions/outgoing` | Buat pengajuan transaksi keluar (`Pending`, validasi stok tersedia). |
| **Transactions** | `PATCH /api/transactions/[id]/review` | Setujui atau tolak transaksi oleh Manager (`INCOMING` update stok & status PO). |
| **Transactions** | `PATCH /api/transactions/[id]/ship` | Selesaikan pengiriman `OUTGOING` `Approved` dan kurangi stok secara atomik (`staff`). |
| **Notifications** | `GET /api/notifications` | Ambil 20 notifikasi terbaru & jumlah `unread_count` milik pengguna login. |
| **Notifications** | `PATCH /api/notifications/[id]/read` | Tandai satu notifikasi atau seluruh notifikasi (`id = all`) sebagai sudah dibaca. |
| **Dashboard** | `GET /api/dashboard/summary` | Ringkasan metrik KPI sesuai peran pengguna. |
| **Reports** | `GET /api/reports/export` | Unduh laporan `.xlsx` terpisah untuk `admin` dan `manager` (filter tanggal opsional). |
| **Uploads** | `POST /api/uploads` | Unggah gambar lokal ke `public/uploads/{categories,products,proofs}/`. |

---

## 8. Panduan Instalasi & Penggunaan

### Prasyarat
- **Node.js** (`>= 22.6`, disarankan `>= 24`) & **npm**
- **PostgreSQL** (`>= 15`)

### Langkah Instalasi

1. **Instalasi dependensi**
   ```bash
   npm install
   ```

2. **Konfigurasi Environment Variables**
   Salin file `.env.example` menjadi `.env` dan sesuaikan nilainya:
   ```env
   AUTH_SECRET="hasil-generate-secret"
   DATABASE_URL="postgresql://postgres:password@localhost:5432/gintory"
   ```
   Untuk membuat `AUTH_SECRET`, jalankan:
   ```bash
   npx auth secret
   ```

3. **Siapkan Database & Seeding Data**
   Jalankan inisialisasi skema database lalu isi data awal (akun demo, 4 kategori, 25 produk Fantech & Rexus, contoh PO, transaksi, dan notifikasi):
   ```bash
   npm run db:init
   npm run db:seed
   ```

4. **Jalankan Server Pengembangan**
   ```bash
   npm run dev
   ```
   Buka [http://localhost:3000](http://localhost:3000) di browser.

### Akun Demo Bawaan (`seed.ts`)

| Role | Email | Password | Status |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin_gibran@gintory.id` | `gibran19` | Aktif |
| **Manager** | `manager_bahlulu@gintory.id` | `bahlulu02` | Aktif |
| **Staff** | `staff_bahlili@gintory.id` | `bahlili02` | Aktif |
| **Supplier** | `supply_cabowo@fantech.id` | `hidup_sawit` | `Approved` |

---

## 9. Daftar Script

Daftar script yang tersedia di [package.json](file:///e:/Coding/gintory/package.json):

| Script | Perintah | Fungsi |
| :--- | :--- | :--- |
| `npm run dev` | `next dev` | Menjalankan server pengembangan Next.js (Turbopack). |
| `npm run build` | `next build` | Membangun aplikasi untuk lingkungan produksi. |
| `npm run start` | `next start` | Menjalankan server produksi dari hasil build. |
| `npm run lint` | `biome check .` | Memeriksa format kode dan aturan linting menggunakan Biome. |
| `npm run format` | `biome format --write` | Memformat kode secara otomatis menggunakan Biome. |
| `npm run db:init` | `node --env-file=.env -e "..."` | Menjalankan inisialisasi skema SQL dari `db/init.sql` ke PostgreSQL. |
| `npm run db:seed` | `node --env-file=.env db/seed.ts` | Menjalankan seeder PostgreSQL untuk akun, kategori, 25 produk, PO, transaksi, dan notifikasi. |
