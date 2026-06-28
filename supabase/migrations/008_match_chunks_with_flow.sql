-- 008: Add flow filter to match_document_chunks for accurate per-flow search
drop function if exists match_document_chunks(vector, float, int);

create or replace function match_document_chunks(
  query_embedding  vector(1536),
  match_threshold  float default 0.30,
  match_count      int   default 8,
  filter_flow      text  default null
)
returns table (
  id             uuid,
  document_id    uuid,
  content        text,
  similarity     float,
  flow           text,
  document_title text
)
language sql stable
security definer
set search_path = public
as $$
  select
    dc.id,
    dc.document_id,
    dc.content,
    1 - (dc.embedding <=> query_embedding) as similarity,
    dc.flow,
    d.title as document_title
  from document_chunks dc
  left join documents d on d.id = dc.document_id
  where 1 - (dc.embedding <=> query_embedding) > match_threshold
    and (filter_flow is null or dc.flow = filter_flow)
  order by dc.embedding <=> query_embedding
  limit match_count;
$$;
