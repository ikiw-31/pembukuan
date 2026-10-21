# Kas Jembatan

Aplikasi web pembukuan pembangunan/perbaikan jembatan desa, dirancang untuk dibuka di HP.

- **Halaman utama (tanpa login)**: laporan keuangan terbuka untuk warga, meliputi sisa kas, dana masuk, uang keluar, rincian belanja (bisa dengan foto nota), upah pekerja, dan kehadiran harian.
- **Pengelola (login, 2 akun)**: mencatat dana masuk, belanja material, konsumsi (kopi, rokok, snack, dll), biaya lain-lain, kehadiran pekerja harian, dan pembayaran upah.

## Cara kerja upah pekerja

Pekerja tidak tetap dan pembayarannya tidak menentu, jadi upah dicatat dalam dua langkah terpisah:

1. **Kehadiran**: setiap hari centang siapa yang bekerja (sehari penuh atau setengah hari). Upah otomatis dihitung dari upah harian orang itu.
2. **Bayar upah**: kapan saja, pilih pekerja. Aplikasi menampilkan semua hari yang **belum dibayar**. Centang hari yang dibayar sekarang (boleh sebagian), lalu tekan Bayar.

Dengan begitu selalu jelas siapa sudah dibayar berapa hari dan siapa yang masih ditunggu. Sisa kas hanya berkurang saat upah benar-benar dibayar, sedangkan upah yang belum dibayar ditampilkan terpisah.

## Mencoba tanpa database (mode percobaan)

```bash
npm install
npm run dev
```

Tanpa pengaturan Supabase, aplikasi berjalan dalam **mode percobaan** dengan data contoh yang tersimpan di browser saja. Login bisa memakai email dan sandi apa saja.

## Memasang untuk dipakai sungguhan (gratis)

### 1. Buat database di Supabase

1. Daftar di <https://supabase.com>, lalu klik **New project** (pilih region Singapore agar cepat).
2. Buka **SQL Editor → New query**, tempel seluruh isi file [`supabase/schema.sql`](supabase/schema.sql), lalu klik **Run**.
3. Daftarkan email kedua pengelola. Masih di SQL Editor, jalankan:
   ```sql
   insert into editors (email) values ('istri@contoh.com'), ('suami@contoh.com');
   ```
4. Buat akunnya di **Authentication → Users → Add user → Create new user**. Isi email dan kata sandi, centang **Auto Confirm User**, lalu ulangi untuk akun kedua.
5. **Penting:** matikan pendaftaran umum di **Authentication → Sign In / Providers**. Matikan **Allow new users to sign up** agar orang lain tidak bisa membuat akun sendiri.
6. Salin alamat dan kunci dari **Project Settings → API** (atau tombol **Connect**):
   - Project URL → `VITE_SUPABASE_URL`
   - kunci `anon` / `publishable` → `VITE_SUPABASE_ANON_KEY`

Hanya email yang terdaftar di tabel `editors` yang bisa mengubah data. Semua orang bisa melihat.

### 2. Online-kan websitenya di Vercel

1. Masuk ke <https://vercel.com> memakai akun GitHub.
2. **Add New → Project**, lalu pilih repositori ini.
3. Di **Environment Variables**, isi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` dari langkah 1.6.
4. Klik **Deploy**. Alamat seperti `https://kas-jembatan.vercel.app` siap dibagikan ke warga.

(Netlify atau Cloudflare Pages juga bisa. Perintah build `npm run build`, folder hasil `dist`.)

### 3. Pasang di layar HP

Buka alamat website di Chrome HP, ketuk menu **⋮ → Tambahkan ke layar utama**. Aplikasi akan muncul seperti aplikasi biasa.

## Catatan

- Supabase gratis akan "tidur" bila tidak ada yang membuka website selama 7 hari. Bila itu terjadi, buka dashboard Supabase dan klik **Restore**.
- Foto nota otomatis diperkecil sebelum diunggah agar hemat kuota.
- Hari kerja yang sudah dibayar terkunci. Untuk mengubahnya, batalkan pembayarannya dulu dari halaman pekerja.

## Struktur

```
src/
  lib/          data, perhitungan, format rupiah/tanggal
  components/   komponen tampilan
  pages/        halaman warga, login, dan halaman pengelola
supabase/
  schema.sql    tabel, keamanan (RLS), fungsi bayar upah
```
