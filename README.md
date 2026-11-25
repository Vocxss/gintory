<p align="center">
  <img src="public/logotypo.webp" alt="Gintory Logo Banner" width="320" />
</p>

<h1 align="center"><strong>Gintory</strong></h1>

<p align="center">
   Gaming Tools Warehouse Management System.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16.4-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19.3-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-7.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/shadcn%2Fui-Base_UI-18181B?style=for-the-badge&logo=shadcnui&logoColor=white" alt="shadcn/ui" />
  <img src="https://img.shields.io/badge/PostgreSQL-pg-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/NextAuth.js-v5-7C3AED?style=for-the-badge&logo=auth0&logoColor=white" alt="NextAuth.js" />
  <img src="https://img.shields.io/badge/Zod-v4-3E67B1?style=for-the-badge&logo=zod&logoColor=white" alt="Zod" />
  <img src="https://img.shields.io/badge/TanStack_Query-v5-FF4154?style=for-the-badge&logo=reactquery&logoColor=white" alt="TanStack Query" />
  <img src="https://img.shields.io/badge/React_Hook_Form-v7-EC5990?style=for-the-badge&logo=reacthookform&logoColor=white" alt="React Hook Form" />
  <img src="https://img.shields.io/badge/ExcelJS-4.4-217346?style=for-the-badge&logo=microsoftexcel&logoColor=white" alt="ExcelJS" />
  <img src="https://img.shields.io/badge/Biome-2.4-60A5FA?style=for-the-badge&logo=biome&logoColor=white" alt="Biome" />
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

## 1. Deskripsi Singkat

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

## 5. Skema Database

Database menggunakan PostgreSQL dengan ekstensi UUID (`gen_random_uuid()`) dan 8 tabel utama:

![Entity Relationship Diagram Gintory](docs/images/erd.webp)
---

## 6. Struktur Folder Proyek

```text
gintory/
├── docs/
│   └── images/
│       ├── erd.webp                               # Entity Relationship Diagram database
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
