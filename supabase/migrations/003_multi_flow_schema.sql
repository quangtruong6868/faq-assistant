-- Migration 003: Multi-flow schema (Corporate + Candidate + Internal)

-- Sites configuration (multi-site support)
create table if not exists sites (
  id uuid primary key default gen_random_uuid(),
  site_key text not null unique,
  site_name text not null,
  default_language text default 'ja' check (default_language in ('vi','jp','en','np')),
  primary_color text default '#D42B2B',
  logo_url text,
  enabled_flows text[] default array['corporate','candidate','internal'],
  created_at timestamptz default now()
);

-- Seed TH-GROUP site
insert into sites (site_key, site_name, default_language, primary_color, enabled_flows) values
  ('th-group',   'TH-GROUP',      'ja', '#D42B2B', array['corporate','candidate','internal']),
  ('leximco',    'LEXIMCO',       'ja', '#D42B2B', array['corporate','candidate','internal']),
  ('mirai-baito','MIRAI BAITO',   'ja', '#D42B2B', array['candidate'])
on conflict (site_key) do nothing;

-- Company leads (法人問い合わせ)
create table if not exists company_leads (
  id uuid primary key default gen_random_uuid(),
  site_key text default 'th-group',
  session_id text,
  -- Contact info
  company_name text,
  contact_name text,
  phone text,
  email text,
  location text,
  -- Inquiry details
  job_type text,
  headcount text,
  desired_timing text,
  inquiry_type text,
  inquiry_content text,
  -- Meta
  language text default 'ja',
  status text default 'new' check (status in ('new','contacted','in_progress','closed','rejected')),
  notes text,
  created_at timestamptz default now()
);

-- Candidate leads (求職者問い合わせ)
create table if not exists candidate_leads (
  id uuid primary key default gen_random_uuid(),
  site_key text default 'th-group',
  session_id text,
  -- Personal info
  full_name text,
  nationality text,
  current_visa text,
  visa_expiry text,
  current_prefecture text,
  japanese_level text,
  -- Job preferences
  job_type text,
  can_relocate boolean,
  has_license boolean,
  desired_shift text,
  available_from text,
  -- Contact
  phone text,
  line_id text,
  email text,
  -- Specialty fields (for engineer/tokutei)
  specialization text,
  experience_years text,
  education text,
  has_tokutei_cert boolean,
  -- Meta
  language text default 'vi',
  status text default 'new' check (status in ('new','contacted','in_progress','closed','rejected')),
  notes text,
  created_at timestamptz default now()
);

-- Lead notes (for admin CRM)
create table if not exists lead_notes (
  id uuid primary key default gen_random_uuid(),
  lead_type text not null check (lead_type in ('company','candidate')),
  lead_id uuid not null,
  note text not null,
  created_by text,
  created_at timestamptz default now()
);

-- RLS
alter table sites             enable row level security;
alter table company_leads     enable row level security;
alter table candidate_leads   enable row level security;
alter table lead_notes        enable row level security;

-- Public read sites config
create policy "Public read sites"          on sites           for select using (true);
create policy "Public insert company_leads" on company_leads  for insert with check (true);
create policy "Public insert candidate_leads" on candidate_leads for insert with check (true);

-- Admin full access
create policy "Admin all sites"            on sites           for all using (auth.role() = 'authenticated');
create policy "Admin all company_leads"    on company_leads   for all using (auth.role() = 'authenticated');
create policy "Admin all candidate_leads"  on candidate_leads for all using (auth.role() = 'authenticated');
create policy "Admin all lead_notes"       on lead_notes      for all using (auth.role() = 'authenticated');
