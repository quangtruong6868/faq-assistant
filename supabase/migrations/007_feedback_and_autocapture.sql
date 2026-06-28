-- ================================================================
-- 007_feedback_and_autocapture.sql
-- 1. Add bot_answer + ask_count to unanswered_questions
-- 2. Answer feedback table (thumbs up/down)
-- ================================================================

-- Add columns to existing unanswered_questions
alter table unanswered_questions
  add column if not exists bot_answer  text,        -- what the bot said before giving up
  add column if not exists ask_count   int default 1, -- how many times this was asked
  add column if not exists source_type text,         -- no_match / wrong_answer (user flagged)
  add column if not exists admin_answer text;        -- confirmed answer written by admin

-- Index for deduplication (same question asked multiple times)
create index if not exists unanswered_question_text_idx
  on unanswered_questions (flow, language, question);

-- ── Answer feedback (thumbs up / down) ────────────────────────
create table if not exists answer_feedback (
  id           uuid        default gen_random_uuid() primary key,
  session_id   text,
  question     text        not null,
  answer       text        not null,
  flow         text        not null,
  language     text        not null default 'jp',
  rating       smallint    not null check (rating in (1, -1)), -- 1=good, -1=bad
  learned_id   uuid        references learned_knowledge(id) on delete set null,
  created_at   timestamptz default now()
);

create index if not exists answer_feedback_flow_idx on answer_feedback (flow, language);
create index if not exists answer_feedback_rating_idx on answer_feedback (rating);

-- When user gives thumbs down → auto-demote confidence in learned_knowledge
create or replace function handle_negative_feedback()
returns trigger language plpgsql as $$
begin
  if new.rating = -1 and new.learned_id is not null then
    update learned_knowledge
    set confidence = greatest(confidence - 0.15, 0.1),
        updated_at = now()
    where id = new.learned_id;
  end if;
  if new.rating = 1 and new.learned_id is not null then
    update learned_knowledge
    set confidence = least(confidence + 0.05, 1.0),
        updated_at = now()
    where id = new.learned_id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_answer_feedback on answer_feedback;
create trigger on_answer_feedback
  after insert on answer_feedback
  for each row execute function handle_negative_feedback();

-- ── Upsert unanswered: if same question exists, increment count ─
create or replace function upsert_unanswered_question(
  p_flow        text,
  p_language    text,
  p_question    text,
  p_bot_answer  text,
  p_source_type text,
  p_session_id  text default null
)
returns uuid language plpgsql as $$
declare
  existing_id uuid;
  new_id      uuid;
begin
  select id into existing_id
  from unanswered_questions
  where flow = p_flow
    and language = p_language
    and question = p_question
    and status in ('pending', 'in_review')
  limit 1;

  if existing_id is not null then
    update unanswered_questions
    set ask_count  = ask_count + 1,
        updated_at = now()
    where id = existing_id;
    return existing_id;
  else
    insert into unanswered_questions
      (flow, language, question, bot_answer, source_type, session_id, status)
    values
      (p_flow, p_language, p_question, p_bot_answer, p_source_type, p_session_id, 'pending')
    returning id into new_id;
    return new_id;
  end if;
end;
$$;

-- ── Push admin answer directly to learned_knowledge ────────────
-- Called when admin clicks "Dạy bot"
create or replace function teach_bot_from_unanswered(
  p_unanswered_id uuid,
  p_embedding     vector(1536)
)
returns uuid language plpgsql as $$
declare
  rec    unanswered_questions%rowtype;
  new_id uuid;
begin
  select * into rec from unanswered_questions where id = p_unanswered_id;
  if rec.admin_answer is null or length(trim(rec.admin_answer)) < 5 then
    raise exception 'admin_answer is empty';
  end if;

  -- Insert into learned_knowledge
  insert into learned_knowledge
    (flow, language, question, answer, embedding, confidence, source_type, topics)
  values
    (rec.flow, rec.language, rec.question, rec.admin_answer, p_embedding, 0.95, 'admin_taught', array['admin'])
  returning id into new_id;

  -- Mark as added_to_kb
  update unanswered_questions
  set status = 'added_to_kb', updated_at = now()
  where id = p_unanswered_id;

  return new_id;
end;
$$;

-- ── Stats view ─────────────────────────────────────────────────
create or replace view unanswered_stats as
select
  flow,
  language,
  status,
  count(*)          as total,
  sum(ask_count)    as total_asks,
  max(created_at)   as latest
from unanswered_questions
group by flow, language, status
order by total_asks desc;

-- RLS
alter table answer_feedback enable row level security;
create policy "service_role_all" on answer_feedback
  for all using (auth.role() = 'service_role');
