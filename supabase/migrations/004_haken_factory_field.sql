-- Add factory_name for Haken (dispatched worker) unanswered questions
alter table unanswered_questions add column if not exists factory_name text;
