-- ================================================================
-- 006_learned_knowledge.sql
-- AI self-learning knowledge base
-- AI stores synthesized answers here → reuses them without re-searching
-- ================================================================

-- Main table: AI-learned Q&A pairs
create table if not exists learned_knowledge (
  id              uuid        default gen_random_uuid() primary key,
  flow            text        not null,                    -- honsha / haken / internal / corporate / candidate
  language        text        not null default 'jp',
  question        text        not null,                    -- representative question (from user)
  answer          text        not null,                    -- synthesized answer AI generated
  embedding       vector(1536),                            -- embedding of question (for similarity search)
  confidence      float       not null default 0.7,        -- 0-1: how confident this answer is
  usage_count     int         not null default 1,          -- how many times this was served
  source_type     text        not null default 'rag_single', -- rag_single / rag_synthesized / rag_context
  topics          text[],                                  -- detected topic intents (for debugging)
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Fast vector search index
create index if not exists learned_knowledge_embedding_idx
  on learned_knowledge using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Filter index
create index if not exists learned_knowledge_flow_lang_idx
  on learned_knowledge (flow, language);

-- Usage tracking index (for analytics)
create index if not exists learned_knowledge_usage_idx
  on learned_knowledge (usage_count desc);

-- Auto-update updated_at
create or replace function update_learned_knowledge_timestamp()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists learned_knowledge_updated_at on learned_knowledge;
create trigger learned_knowledge_updated_at
  before update on learned_knowledge
  for each row execute function update_learned_knowledge_timestamp();

-- ── Search function ────────────────────────────────────────────
-- Used by edge function to find previously learned answers
create or replace function match_learned_knowledge(
  query_embedding  vector(1536),
  match_threshold  float,
  match_count      int,
  filter_flow      text,
  filter_language  text
)
returns table (
  id           uuid,
  question     text,
  answer       text,
  confidence   float,
  usage_count  int,
  similarity   float
)
language sql stable as $$
  select
    id,
    question,
    answer,
    confidence,
    usage_count,
    1 - (embedding <=> query_embedding) as similarity
  from learned_knowledge
  where flow = filter_flow
    and language = filter_language
    and 1 - (embedding <=> query_embedding) > match_threshold
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- ── Increment usage counter (called when serving from cache) ───
create or replace function increment_learned_usage(p_id uuid)
returns void language sql as $$
  update learned_knowledge
  set usage_count = usage_count + 1,
      updated_at  = now()
  where id = p_id;
$$;

-- ── Upsert: update answer if new confidence is higher ──────────
-- Prevents storing worse answers for the same question
create or replace function upsert_learned_knowledge(
  p_flow        text,
  p_language    text,
  p_question    text,
  p_answer      text,
  p_embedding   vector(1536),
  p_confidence  float,
  p_source_type text,
  p_topics      text[]
)
returns uuid language plpgsql as $$
declare
  existing_id   uuid;
  existing_conf float;
  new_id        uuid;
begin
  -- Check if a very similar question already exists (similarity > 0.92)
  select id, confidence
  into existing_id, existing_conf
  from match_learned_knowledge(p_embedding, 0.92, 1, p_flow, p_language)
  limit 1;

  if existing_id is not null then
    -- Same question exists
    if p_confidence > existing_conf then
      -- Better answer found → update
      update learned_knowledge
      set answer      = p_answer,
          confidence  = p_confidence,
          source_type = p_source_type,
          topics      = p_topics,
          updated_at  = now()
      where id = existing_id;
    else
      -- Existing answer is better or equal → just increment usage
      perform increment_learned_usage(existing_id);
    end if;
    return existing_id;
  else
    -- New knowledge → insert
    insert into learned_knowledge
      (flow, language, question, answer, embedding, confidence, source_type, topics)
    values
      (p_flow, p_language, p_question, p_answer, p_embedding, p_confidence, p_source_type, p_topics)
    returning id into new_id;
    return new_id;
  end if;
end;
$$;

-- ── Analytics view: most-used learned knowledge ────────────────
create or replace view learned_knowledge_stats as
select
  flow,
  language,
  count(*)                          as total_entries,
  sum(usage_count)                  as total_served,
  avg(confidence)                   as avg_confidence,
  avg(usage_count)                  as avg_usage,
  max(usage_count)                  as max_usage,
  count(*) filter (where usage_count >= 5)  as high_usage_count,
  max(updated_at)                   as last_updated
from learned_knowledge
group by flow, language
order by total_served desc;

-- RLS: service role only (edge functions use service role key)
alter table learned_knowledge enable row level security;

create policy "service_role_all" on learned_knowledge
  for all using (auth.role() = 'service_role');
