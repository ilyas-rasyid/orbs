# ORBS — Office Resource Booking System

Sistem manajemen dan reservasi aset/fasilitas kantor terpusat, mencakup pemesanan **ruang rapat (_meeting room_)**, **kendaraan operasional**, dan **peralatan kerja (_equipment_)**. Dilengkapi proteksi konflik jadwal otomatis via PostgreSQL _exclusion constraint_, alur persetujuan (_approval_), pencatatan serah-terima (_handover & return_), serta penjadwalan pemeliharaan (_maintenance_).

---

## Prasyarat

- [Bun](https://bun.sh/) (v1.2+)
- [Docker & Docker Compose](https://docs.docker.com/compose/)

---

## Cara Menjalankan

### 1. Install Dependensi

```bash
bun install
```

### 2. Setup Environment Variables

```bash
cp .env.example .env
```

### 3. Jalankan Database

Nyalakan container PostgreSQL development:

```bash
bun run db:up
```

### 4. Setup Database & Seeding Data

Generate Prisma client, terapkan migrasi database, dan jalankan data _seeding_:

```bash
bun run db:generate
bun run db:migrate

# Jalankan seeder (SEED_PASSWORD minimal 12 karakter)
SEED_PASSWORD='DemoPassword123!' bun run db:seed
```

### 5. Jalankan Aplikasi

Jalankan backend API dan frontend web secara bersamaan:

```bash
bun run dev
```

- **Frontend Web**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:3003](http://localhost:3003) _(otomatis di-proxy melalui frontend di endpoint `/api`)_

---

## Akun Demo Login

Semua akun demo menggunakan password yang ditentukan pada variabel `SEED_PASSWORD` saat _seeding_ (contoh: `DemoPassword123!`):

| Role                 | Email                        | Nama          | Tanggung Jawab Utama                                            |
| -------------------- | ---------------------------- | ------------- | --------------------------------------------------------------- |
| **Admin**            | `admin@northstar.example`    | Nadia Putri   | Master data fasilitas, lokasi kantor, dan manajemen user        |
| **Facility Manager** | `manager@northstar.example`  | Arif Prasetyo | Approval booking, handover/return kendaraan & alat, maintenance |
| **Employee**         | `employee@northstar.example` | Dewi Anjani   | Reservasi ruang rapat, peminjaman kendaraan dan peralatan       |
