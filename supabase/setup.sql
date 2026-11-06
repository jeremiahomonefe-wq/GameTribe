-- Run this once in Supabase: SQL Editor > New query > paste > Run.

-- 1. Website content (one row, key = 'main')
create table if not exists public.site_content (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- 2. Ticket sales (filled automatically when a payment is verified)
create table if not exists public.ticket_sales (
  reference     text primary key,
  ticket_number text,
  name          text,
  email         text,
  phone         text,
  ticket_type   text,
  ticket_label  text,
  amount        numeric,
  email_sent    boolean not null default false,
  source        text,
  paid_at       timestamptz,
  created_at    timestamptz not null default now()
);

-- 3. Lock the tables: only your server (service role key) can read/write.
alter table public.site_content enable row level security;
alter table public.ticket_sales enable row level security;

-- 4. Public bucket for uploaded photos, videos, logos and PDFs.
insert into storage.buckets (id, name, public)
values ('site-media', 'site-media', true)
on conflict (id) do update set public = true;
