-- =====================================================================
-- Kas Jembatan — skema database Supabase
-- Cara pakai: buka Supabase > SQL Editor > New query, tempel seluruh isi
-- file ini, lalu klik "Run". Aman dijalankan ulang.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- Daftar pengelola (yang boleh mengubah data) ----------
create table if not exists editors (
  email text primary key
);

create or replace function is_editor() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from editors where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- ---------- Pengaturan proyek (satu baris saja) ----------
create table if not exists settings (
  id int primary key default 1 check (id = 1),
  project_name text not null default 'Perbaikan Jembatan',
  location text not null default '',
  description text not null default '',
  updated_at timestamptz not null default now()
);
insert into settings (id) values (1) on conflict do nothing;

-- ---------- Dana masuk ----------
create table if not exists incomes (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  source text not null,
  amount bigint not null check (amount >= 0),
  note text not null default '',
  created_at timestamptz not null default now()
);

-- ---------- Pengeluaran (material, konsumsi, lain-lain) ----------
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  category text not null check (category in ('material', 'konsumsi', 'lainnya')),
  item text not null,
  qty numeric not null default 1 check (qty > 0),
  unit text not null default '',
  unit_price bigint not null default 0 check (unit_price >= 0),
  amount bigint not null check (amount >= 0),
  note text not null default '',
  receipt_url text,
  created_at timestamptz not null default now()
);

-- ---------- Pekerja ----------
create table if not exists workers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  daily_wage bigint not null check (daily_wage >= 0),
  phone text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- Pembayaran upah ----------
create table if not exists wage_payments (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references workers (id) on delete restrict,
  date date not null,
  amount bigint not null check (amount >= 0),
  note text not null default '',
  created_at timestamptz not null default now()
);

-- ---------- Kehadiran kerja (1 baris = 1 orang di 1 hari) ----------
create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references workers (id) on delete restrict,
  date date not null,
  portion numeric not null default 1 check (portion in (0.5, 1)),
  wage bigint not null check (wage >= 0),            -- upah 1 hari penuh saat itu
  amount bigint not null check (amount >= 0),        -- upah yang didapat hari itu
  payment_id uuid references wage_payments (id) on delete set null,
  note text not null default '',
  created_at timestamptz not null default now(),
  unique (worker_id, date)
);

create index if not exists attendance_worker_idx on attendance (worker_id);
create index if not exists attendance_payment_idx on attendance (payment_id);

-- Hari yang sudah dibayar tidak boleh diubah/dihapus (hapus pembayarannya dulu).
create or replace function attendance_guard() returns trigger
language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    if old.payment_id is not null then
      raise exception 'Hari kerja ini sudah dibayar. Hapus pembayarannya dulu.';
    end if;
    return old;
  end if;
  if old.payment_id is not null and new.payment_id is not distinct from old.payment_id
     and (new.amount <> old.amount or new.worker_id <> old.worker_id or new.date <> old.date) then
    raise exception 'Hari kerja ini sudah dibayar. Hapus pembayarannya dulu.';
  end if;
  return new;
end $$;

drop trigger if exists attendance_guard on attendance;
create trigger attendance_guard before update or delete on attendance
  for each row execute function attendance_guard();

-- Bayar upah: buat pembayaran dan tandai hari-hari kerja yang dibayar sekaligus.
create or replace function pay_worker(
  p_worker_id uuid, p_date date, p_attendance_ids uuid[], p_note text default ''
) returns uuid
language plpgsql security invoker set search_path = public as $$
declare
  v_id uuid;
  v_total bigint;
  v_count int;
begin
  if not is_editor() then
    raise exception 'Tidak punya izin.';
  end if;

  perform 1 from attendance where id = any (p_attendance_ids) for update;

  select coalesce(sum(amount), 0), count(*) into v_total, v_count
  from attendance
  where id = any (p_attendance_ids) and worker_id = p_worker_id and payment_id is null;

  if v_count = 0 or v_count <> coalesce(array_length(p_attendance_ids, 1), 0) then
    raise exception 'Hari kerja yang dipilih tidak valid atau sudah dibayar.';
  end if;

  insert into wage_payments (worker_id, date, amount, note)
  values (p_worker_id, p_date, v_total, coalesce(p_note, ''))
  returning id into v_id;

  update attendance set payment_id = v_id where id = any (p_attendance_ids);
  return v_id;
end $$;

-- ---------- Keamanan: semua orang boleh melihat, hanya pengelola boleh mengubah ----------
do $$
declare t text;
begin
  foreach t in array array['settings', 'incomes', 'expenses', 'workers', 'wage_payments', 'attendance'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "publik baca" on %I', t);
    execute format('drop policy if exists "pengelola ubah" on %I', t);
    execute format('create policy "publik baca" on %I for select using (true)', t);
    execute format('create policy "pengelola ubah" on %I for all to authenticated using (is_editor()) with check (is_editor())', t);
  end loop;
end $$;

alter table editors enable row level security;
drop policy if exists "pengelola lihat" on editors;
create policy "pengelola lihat" on editors for select to authenticated using (is_editor());

-- ---------- Penyimpanan foto nota ----------
insert into storage.buckets (id, name, public)
values ('nota', 'nota', true)
on conflict (id) do update set public = true;

drop policy if exists "nota publik baca" on storage.objects;
drop policy if exists "nota pengelola tambah" on storage.objects;
drop policy if exists "nota pengelola hapus" on storage.objects;
create policy "nota publik baca" on storage.objects for select using (bucket_id = 'nota');
create policy "nota pengelola tambah" on storage.objects for insert to authenticated
  with check (bucket_id = 'nota' and is_editor());
create policy "nota pengelola hapus" on storage.objects for delete to authenticated
  using (bucket_id = 'nota' and is_editor());

-- =====================================================================
-- LANGKAH TERAKHIR: ganti dua email di bawah dengan email 2 pengelola,
-- lalu jalankan baris ini (boleh dijalankan terpisah).
-- =====================================================================
-- insert into editors (email) values ('istri@contoh.com'), ('suami@contoh.com') on conflict do nothing;
