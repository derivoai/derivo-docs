y
-- Derivo Docs — Production Postgres Schema & Row Level Security (RLS)
-- Every table is linked to auth.users(id) with strict per-user RLS policies.

create extension if not exists "pgcrypto";

-- 1. User profiles
create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  email_verified boolean not null default false,
  projects_limit integer not null default 15,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

create policy "user_profiles_select_own"
  on public.user_profiles for select
  using (auth.uid() = id);

create policy "user_profiles_insert_own"
  on public.user_profiles for insert
  with check (auth.uid() = id);

create policy "user_profiles_update_own"
  on public.user_profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 2. Projects
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  repo_url text not null,
  owner text not null,
  repo_name text not null,
  default_branch text not null default 'main',
  last_analyzed_commit_sha text,
  detected_languages jsonb not null default '[]'::jsonb,
  detected_frameworks jsonb not null default '[]'::jsonb,
  analysis_status text not null default 'Validating repository URL',
  current_stage text not null default 'Validating repository URL',
  overall_confidence text not null default 'medium',
  summary text,
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_projects_user_id on public.projects(user_id);
alter table public.projects enable row level security;

create policy "projects_select_own"
  on public.projects for select
  using (auth.uid() = user_id);

create policy "projects_insert_own"
  on public.projects for insert
  with check (auth.uid() = user_id);

create policy "projects_update_own"
  on public.projects for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "projects_delete_own"
  on public.projects for delete
  using (auth.uid() = user_id);

-- 3. Repository metadata
create table if not exists public.repository_metadata (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  repo_url text not null,
  owner text not null,
  repo_name text not null,
  description text,
  default_branch text not null,
  commit_sha text not null,
  stars_count integer not null default 0,
  forks_count integer not null default 0,
  open_issues_count integer not null default 0,
  license_name text,
  size_kb integer not null default 0,
  total_files_in_tree integer not null default 0,
  selected_files_count integer not null default 0,
  ignored_files_count integer not null default 0,
  file_tree jsonb not null default '[]'::jsonb,
  detected_languages jsonb not null default '[]'::jsonb,
  detected_frameworks jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_repository_metadata_user_id on public.repository_metadata(user_id);
alter table public.repository_metadata enable row level security;

create policy "repository_metadata_select_own"
  on public.repository_metadata for select
  using (auth.uid() = user_id);

create policy "repository_metadata_insert_own"
  on public.repository_metadata for insert
  with check (auth.uid() = user_id);

create policy "repository_metadata_update_own"
  on public.repository_metadata for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "repository_metadata_delete_own"
  on public.repository_metadata for delete
  using (auth.uid() = user_id);

-- 4. Analysis runs
create table if not exists public.analysis_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  commit_sha text,
  status text not null,
  current_stage text not null,
  completed_stages jsonb not null default '[]'::jsonb,
  error_code text,
  error_message text,
  retryable boolean not null default false,
  recommended_action text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_analysis_runs_project_id on public.analysis_runs(project_id);
create index if not exists idx_analysis_runs_user_id on public.analysis_runs(user_id);
alter table public.analysis_runs enable row level security;

create policy "analysis_runs_select_own"
  on public.analysis_runs for select
  using (auth.uid() = user_id);

create policy "analysis_runs_insert_own"
  on public.analysis_runs for insert
  with check (auth.uid() = user_id);

create policy "analysis_runs_update_own"
  on public.analysis_runs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "analysis_runs_delete_own"
  on public.analysis_runs for delete
  using (auth.uid() = user_id);

-- 5. Documentation sections
create table if not exists public.documentation_sections (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  analysis_run_id uuid references public.analysis_runs(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  section_key text not null,
  section_order integer not null,
  title text not null,
  content_markdown text not null,
  confidence text not null check (confidence in ('high', 'medium', 'low', 'insufficient_evidence')),
  confidence_note text not null,
  source_files jsonb not null default '[]'::jsonb,
  has_unresolved_questions boolean not null default false,
  last_regenerated_from_answer_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, section_key)
);

create index if not exists idx_documentation_sections_project_id on public.documentation_sections(project_id);
create index if not exists idx_documentation_sections_user_id on public.documentation_sections(user_id);
alter table public.documentation_sections enable row level security;

create policy "documentation_sections_select_own"
  on public.documentation_sections for select
  using (auth.uid() = user_id);

create policy "documentation_sections_insert_own"
  on public.documentation_sections for insert
  with check (auth.uid() = user_id);

create policy "documentation_sections_update_own"
  on public.documentation_sections for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "documentation_sections_delete_own"
  on public.documentation_sections for delete
  using (auth.uid() = user_id);

-- 6. Clarification questions
create table if not exists public.clarification_questions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  analysis_run_id uuid references public.analysis_runs(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  section_key text not null,
  question text not null,
  rationale text not null,
  evidence_paths jsonb not null default '[]'::jsonb,
  evidence_snippet text,
  options jsonb not null default '[]'::jsonb,
  status text not null default 'open' check (status in ('open', 'answered')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_clarification_questions_project_id on public.clarification_questions(project_id);
create index if not exists idx_clarification_questions_user_id on public.clarification_questions(user_id);
alter table public.clarification_questions enable row level security;

create policy "clarification_questions_select_own"
  on public.clarification_questions for select
  using (auth.uid() = user_id);

create policy "clarification_questions_insert_own"
  on public.clarification_questions for insert
  with check (auth.uid() = user_id);

create policy "clarification_questions_update_own"
  on public.clarification_questions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "clarification_questions_delete_own"
  on public.clarification_questions for delete
  using (auth.uid() = user_id);

-- 7. Clarification answers
create table if not exists public.clarification_answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.clarification_questions(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  section_key text not null,
  answer_text text not null,
  selected_option text,
  is_custom boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_clarification_answers_project_id on public.clarification_answers(project_id);
create index if not exists idx_clarification_answers_user_id on public.clarification_answers(user_id);
alter table public.clarification_answers enable row level security;

create policy "clarification_answers_select_own"
  on public.clarification_answers for select
  using (auth.uid() = user_id);

create policy "clarification_answers_insert_own"
  on public.clarification_answers for insert
  with check (auth.uid() = user_id);

create policy "clarification_answers_update_own"
  on public.clarification_answers for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "clarification_answers_delete_own"
  on public.clarification_answers for delete
  using (auth.uid() = user_id);

-- 8. Export history
create table if not exists public.export_history (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  commit_sha text not null,
  export_format text not null default 'markdown',
  sections_count integer not null default 18,
  unresolved_count integer not null default 0,
  file_name text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_export_history_project_id on public.export_history(project_id);
create index if not exists idx_export_history_user_id on public.export_history(user_id);
alter table public.export_history enable row level security;

create policy "export_history_select_own"
  on public.export_history for select
  using (auth.uid() = user_id);

create policy "export_history_insert_own"
  on public.export_history for insert
  with check (auth.uid() = user_id);

create policy "export_history_delete_own"
  on public.export_history for delete
  using (auth.uid() = user_id);

-- Trigger to auto-create user_profiles row on auth.users signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.user_profiles (id, email, full_name, email_verified)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email_confirmed_at is not null
  )
  on conflict (id) do update
  set
    email = excluded.email,
    email_verified = (new.email_confirmed_at is not null),
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update on auth.users
  for each row execute procedure public.handle_new_user();
