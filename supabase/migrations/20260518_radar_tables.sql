create table radar_batches (
  id uuid primary key default gen_random_uuid(),
  partner_email text not null,
  input_raw text not null,
  input_count int not null,
  unique_count int not null,
  status text not null default 'running' check (status in ('running','done','error')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table radar_results (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references radar_batches(id) on delete cascade,
  account_name text not null,
  resolved_name text,
  resolved_domain text,
  score int check (score between 1 and 10),
  fit_bullet text,
  objection_bullet text,
  action_bullet text,
  sources jsonb,
  agent_run_id text,
  status text not null default 'pending' check (status in ('pending','done','error')),
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index radar_batches_partner_created_idx
  on radar_batches (partner_email, created_at desc);
create index radar_results_batch_idx
  on radar_results (batch_id);

alter table radar_batches enable row level security;
alter table radar_results enable row level security;

create policy radar_batches_select on radar_batches for select
  using (partner_email = current_setting('request.jwt.claims', true)::json->>'email');
create policy radar_batches_insert on radar_batches for insert
  with check (partner_email = current_setting('request.jwt.claims', true)::json->>'email');
create policy radar_batches_update on radar_batches for update
  using (partner_email = current_setting('request.jwt.claims', true)::json->>'email')
  with check (partner_email = current_setting('request.jwt.claims', true)::json->>'email');

create policy radar_results_select on radar_results for select
  using (exists (
    select 1 from radar_batches b
    where b.id = radar_results.batch_id
      and b.partner_email = current_setting('request.jwt.claims', true)::json->>'email'
  ));
create policy radar_results_insert on radar_results for insert
  with check (exists (
    select 1 from radar_batches b
    where b.id = radar_results.batch_id
      and b.partner_email = current_setting('request.jwt.claims', true)::json->>'email'
  ));
create policy radar_results_update on radar_results for update
  using (exists (
    select 1 from radar_batches b
    where b.id = radar_results.batch_id
      and b.partner_email = current_setting('request.jwt.claims', true)::json->>'email'
  ))
  with check (exists (
    select 1 from radar_batches b
    where b.id = radar_results.batch_id
      and b.partner_email = current_setting('request.jwt.claims', true)::json->>'email'
  ));
