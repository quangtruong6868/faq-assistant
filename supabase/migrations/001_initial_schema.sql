-- Enable pgvector extension for embeddings
create extension if not exists vector;

-- FAQ Categories (multilingual)
create table if not exists faq_categories (
  id uuid primary key default gen_random_uuid(),
  name_vi text not null,
  name_jp text not null,
  name_en text not null,
  name_np text not null,
  slug text not null unique,
  icon text,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- Seed default categories (VI + JP + EN + NP)
insert into faq_categories (name_vi, name_jp, name_en, name_np, slug, icon, sort_order) values
  ('Chấm công',     '出退勤管理',     'Attendance',       'हाजिरी',         'attendance',  '⏰', 1),
  ('Nghỉ phép',     '休暇・有給',     'Leave',            'बिदा',            'leave',       '🏖️', 2),
  ('Lương',         '給与・給料',     'Salary',           'तलब',             'salary',      '💰', 3),
  ('Bảo hiểm',      '保険・社会保険', 'Insurance',        'बीमा',            'insurance',   '🏥', 4),
  ('Visa',          'ビザ・在留資格', 'Visa',             'भिसा',            'visa',        '📋', 5),
  ('Nhà ở',         '住居・寮',       'Housing',          'आवास',            'housing',     '🏠', 6),
  ('Liên hệ công ty','会社への連絡',  'Company Contact',  'कम्पनी सम्पर्क',  'contact',     '📞', 7),
  ('Nội quy công ty','社内規則',      'Company Rules',    'कम्पनी नियम',     'rules',       '📖', 8),
  ('Kỷ luật',       '懲戒・処分',     'Discipline',       'अनुशासन',         'discipline',  '⚖️', 9),
  ('Tuyển dụng',    '採用・入社',     'Recruitment',      'भर्ती',           'recruitment', '👥', 10),
  ('Khác',          'その他',         'Other',            'अन्य',            'other',       '❓', 11)
on conflict (slug) do nothing;

-- FAQ Items (multilingual)
create table if not exists faq_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references faq_categories(id) on delete set null,
  question_vi text not null,
  question_jp text,
  question_en text,
  question_np text,
  answer_vi text not null,
  answer_jp text,
  answer_en text,
  answer_np text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Full-text search index (Vietnamese + Japanese)
create index if not exists faq_items_fts_vi on faq_items
  using gin(to_tsvector('simple', coalesce(question_vi,'') || ' ' || coalesce(answer_vi,'')));

create index if not exists faq_items_fts_jp on faq_items
  using gin(to_tsvector('simple', coalesce(question_jp,'') || ' ' || coalesce(answer_jp,'')));

-- Documents
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  file_name text not null,
  file_path text not null,
  file_type text,
  language text default 'vi' check (language in ('vi', 'jp', 'en', 'np', 'mixed')),
  status text default 'pending' check (status in ('pending', 'processing', 'ready', 'error')),
  error_message text,
  created_at timestamptz default now()
);

-- Document chunks with embeddings
create table if not exists document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade,
  chunk_index int not null,
  content text not null,
  embedding vector(1536),
  created_at timestamptz default now()
);

create index if not exists document_chunks_embedding_idx
  on document_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Chat logs (no PII)
create table if not exists chat_logs (
  id uuid primary key default gen_random_uuid(),
  session_id text,
  question text not null,
  answer text,
  language text default 'vi',
  source text,
  source_id uuid,
  created_at timestamptz default now()
);

-- Popular questions aggregate
create table if not exists popular_questions (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  language text default 'vi',
  count int default 1,
  last_asked_at timestamptz default now()
);

-- Settings
create table if not exists settings (
  key text primary key,
  value text,
  updated_at timestamptz default now()
);

-- Vector similarity search function
create or replace function match_document_chunks(
  query_embedding vector(1536),
  match_threshold float default 0.65,
  match_count int default 5
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  similarity float,
  document_title text
)
language sql stable
as $$
  select
    dc.id,
    dc.document_id,
    dc.content,
    1 - (dc.embedding <=> query_embedding) as similarity,
    d.title as document_title
  from document_chunks dc
  join documents d on d.id = dc.document_id
  where 1 - (dc.embedding <=> query_embedding) > match_threshold
  order by dc.embedding <=> query_embedding
  limit match_count;
$$;

-- RLS
alter table faq_categories    enable row level security;
alter table faq_items         enable row level security;
alter table documents         enable row level security;
alter table document_chunks   enable row level security;
alter table chat_logs         enable row level security;
alter table popular_questions enable row level security;

-- Public read
create policy "Public read faq_categories"    on faq_categories    for select using (true);
create policy "Public read faq_items"         on faq_items         for select using (is_active = true);
create policy "Public read documents"         on documents         for select using (true);
create policy "Public insert chat_logs"       on chat_logs         for insert with check (true);
create policy "Public read popular_questions" on popular_questions for select using (true);

-- Admin full access
create policy "Admin all faq_categories"    on faq_categories    for all using (auth.role() = 'authenticated');
create policy "Admin all faq_items"         on faq_items         for all using (auth.role() = 'authenticated');
create policy "Admin all documents"         on documents         for all using (auth.role() = 'authenticated');
create policy "Admin all document_chunks"   on document_chunks   for all using (auth.role() = 'authenticated');
create policy "Admin read chat_logs"        on chat_logs         for select using (auth.role() = 'authenticated');
create policy "Admin all popular_questions" on popular_questions for all using (auth.role() = 'authenticated');

-- Auto update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger faq_items_updated_at
  before update on faq_items
  for each row execute function update_updated_at();
