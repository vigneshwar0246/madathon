-- Vetra foundation. All application writes go through authenticated RPCs.
create extension if not exists pgcrypto;

create sequence if not exists public.employee_number;
create sequence if not exists public.project_number;
create sequence if not exists public.module_number;
create sequence if not exists public.task_number;
create sequence if not exists public.bug_number;
create sequence if not exists public.time_number;

create table public.organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 120),
  jurisdiction text not null default 'IN' check (jurisdiction = 'IN'),
  payroll_policy_status text not null default 'legal_review_required' check (payroll_policy_status in ('legal_review_required','configured')),
  created_at timestamptz not null default now()
);

create table public.employees (
  id text primary key default ('EMP-' || lpad(nextval('public.employee_number')::text, 5, '0')),
  organisation_id uuid not null references public.organisations(id),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  full_name text not null check (length(trim(full_name)) between 2 and 120),
  email text not null,
  title text not null default 'Employee',
  department text not null default 'General',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organisation_id, id),
  unique (organisation_id, email)
);

create table public.memberships (
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  employee_id text not null references public.employees(id),
  role text not null check (role in ('owner','manager','team_lead','employee','payroll_admin')),
  created_at timestamptz not null default now(),
  primary key (organisation_id, user_id),
  unique (organisation_id, employee_id)
);

create table public.employee_compensation (
  employee_id text primary key references public.employees(id) on delete cascade,
  organisation_id uuid not null references public.organisations(id),
  hourly_rate numeric(12,2) not null default 0 check (hourly_rate >= 0),
  gross_monthly numeric(12,2) not null default 0 check (gross_monthly >= 0),
  currency text not null default 'INR' check (currency = 'INR'),
  updated_at timestamptz not null default now(),
  unique (organisation_id, employee_id),
  foreign key (organisation_id, employee_id) references public.employees(organisation_id, id)
);

create table public.projects (
  id text primary key default ('PRJ-' || lpad(nextval('public.project_number')::text, 5, '0')),
  organisation_id uuid not null references public.organisations(id),
  name text not null check (length(trim(name)) between 2 and 120),
  client_name text not null default '',
  description text not null default '',
  owner_employee_id text references public.employees(id),
  committed_date date,
  status text not null default 'active' check (status in ('active','completed','archived')),
  created_at timestamptz not null default now(),
  unique (organisation_id, id),
  foreign key (organisation_id, owner_employee_id) references public.employees(organisation_id, id)
);

create table public.modules (
  id text primary key default ('MOD-' || lpad(nextval('public.module_number')::text, 5, '0')),
  organisation_id uuid not null references public.organisations(id),
  project_id text not null,
  name text not null check (length(trim(name)) between 2 and 120),
  committed_date date,
  completed_at timestamptz,
  status text not null default 'assigned' check (status in ('assigned','in_progress','completed','reopened','under_fix','closed')),
  created_at timestamptz not null default now(),
  unique (organisation_id, id),
  unique (project_id, name),
  foreign key (organisation_id, project_id) references public.projects(organisation_id, id)
);

create table public.module_events (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id),
  module_id text not null,
  from_status text,
  to_status text not null,
  actor_user_id uuid references auth.users(id),
  occurred_at timestamptz not null default now(),
  foreign key (organisation_id,module_id) references public.modules(organisation_id,id)
);

create table public.tasks (
  id text primary key default ('TSK-' || lpad(nextval('public.task_number')::text, 5, '0')),
  organisation_id uuid not null references public.organisations(id),
  project_id text not null,
  module_id text not null,
  title text not null check (length(trim(title)) between 3 and 160),
  description text not null default '',
  assignee_employee_id text not null,
  committed_date date not null,
  completed_at timestamptz,
  status text not null default 'assigned' check (status in ('assigned','in_progress','submitted','completed','reopened','under_fix','closed')),
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, id),
  foreign key (organisation_id, project_id) references public.projects(organisation_id, id),
  foreign key (organisation_id, module_id) references public.modules(organisation_id, id),
  foreign key (organisation_id, assignee_employee_id) references public.employees(organisation_id, id)
);

create table public.task_events (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id),
  task_id text not null,
  from_status text,
  to_status text not null,
  actor_user_id uuid not null references auth.users(id),
  reason text,
  occurred_at timestamptz not null default now(),
  foreign key (organisation_id, task_id) references public.tasks(organisation_id, id)
);

create table public.bugs (
  id text primary key default ('BUG-' || lpad(nextval('public.bug_number')::text, 5, '0')),
  organisation_id uuid not null references public.organisations(id),
  task_id text not null,
  title text not null check (length(trim(title)) between 3 and 160),
  description text not null check (length(trim(description)) >= 10),
  severity text not null check (severity in ('low','medium','high','critical')),
  status text not null default 'reported' check (status in ('reported','verified','under_fix','resolved','closed','rejected')),
  original_employee_id text not null,
  reported_by uuid not null references auth.users(id),
  reported_at timestamptz not null default now(),
  verified_by uuid references auth.users(id),
  resolved_at timestamptz,
  closed_at timestamptz,
  unique (organisation_id, id),
  foreign key (organisation_id, task_id) references public.tasks(organisation_id, id),
  foreign key (organisation_id, original_employee_id) references public.employees(organisation_id, id)
);

create table public.time_entries (
  id text primary key default ('LOG-' || lpad(nextval('public.time_number')::text, 5, '0')),
  organisation_id uuid not null references public.organisations(id),
  task_id text not null,
  bug_id text,
  employee_id text not null,
  work_date date not null,
  hours numeric(5,2) not null check (hours > 0 and hours <= 24),
  category text not null check (category in ('corrective','new_work')),
  description text not null check (length(trim(description)) >= 5),
  review_status text not null default 'pending' check (review_status in ('pending','approved','rejected')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organisation_id, id),
  foreign key (organisation_id, task_id) references public.tasks(organisation_id, id),
  foreign key (organisation_id, bug_id) references public.bugs(organisation_id, id),
  foreign key (organisation_id, employee_id) references public.employees(organisation_id, id),
  check ((category = 'corrective' and bug_id is not null) or (category = 'new_work' and bug_id is null))
);

create table public.rework_reviews (
  bug_id text primary key references public.bugs(id),
  organisation_id uuid not null references public.organisations(id),
  decision text not null check (decision in ('eligible','exempt')),
  reason text not null check (length(trim(reason)) >= 15),
  reviewed_by uuid not null references auth.users(id),
  reviewed_at timestamptz not null default now(),
  foreign key (organisation_id, bug_id) references public.bugs(organisation_id, id)
);

create table public.payroll_periods (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id),
  work_month date not null check (extract(day from work_month) = 1),
  payroll_month date not null check (extract(day from payroll_month) = 1),
  status text not null default 'draft' check (status in ('draft','held','policy_approved','finalised')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  finalised_at timestamptz,
  unique (organisation_id, work_month),
  check (payroll_month = (work_month + interval '1 month')::date)
);

create table public.deduction_proposals (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id),
  period_id uuid not null references public.payroll_periods(id),
  time_entry_id text not null unique references public.time_entries(id),
  employee_id text not null,
  hours numeric(5,2) not null,
  hourly_rate numeric(12,2) not null,
  proposed_amount numeric(12,2) not null check (proposed_amount >= 0),
  status text not null default 'notice_pending' check (status in ('notice_pending','notified','acknowledged','disputed','held','approved','cancelled')),
  legal_basis text,
  employee_response text,
  employee_responded_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organisation_id, id),
  foreign key (organisation_id, employee_id) references public.employees(organisation_id, id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id),
  recipient_user_id uuid not null references auth.users(id),
  kind text not null,
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id),
  actor_user_id uuid not null references auth.users(id),
  action text not null,
  subject_type text not null,
  subject_id text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index employees_org_idx on public.employees(organisation_id);
create index employees_user_idx on public.employees(auth_user_id);
create index memberships_user_idx on public.memberships(user_id);
create index compensation_org_idx on public.employee_compensation(organisation_id);
create index projects_org_idx on public.projects(organisation_id);
create index modules_project_idx on public.modules(project_id);
create index module_events_module_idx on public.module_events(module_id,occurred_at desc);
create index tasks_org_status_idx on public.tasks(organisation_id, status);
create index tasks_assignee_idx on public.tasks(assignee_employee_id);
create index task_events_task_idx on public.task_events(task_id, occurred_at desc);
create index bugs_org_status_idx on public.bugs(organisation_id, status);
create index bugs_task_idx on public.bugs(task_id);
create index time_org_date_idx on public.time_entries(organisation_id, work_date);
create index time_employee_idx on public.time_entries(employee_id);
create index reviews_org_idx on public.rework_reviews(organisation_id);
create index periods_org_idx on public.payroll_periods(organisation_id, work_month);
create index proposals_employee_idx on public.deduction_proposals(employee_id);
create index notifications_recipient_idx on public.notifications(recipient_user_id, created_at desc);
create index audit_org_created_idx on public.audit_events(organisation_id, created_at desc);

create or replace function public.is_member(p_organisation_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.memberships m where m.organisation_id = p_organisation_id and m.user_id = (select auth.uid()));
$$;
create or replace function public.has_org_role(p_organisation_id uuid, p_roles text[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.memberships m where m.organisation_id = p_organisation_id and m.user_id = (select auth.uid()) and m.role = any(p_roles));
$$;
create or replace function public.is_employee_self(p_employee_id text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.employees e where e.id = p_employee_id and e.auth_user_id = (select auth.uid()));
$$;

alter table public.organisations enable row level security;
alter table public.employees enable row level security;
alter table public.memberships enable row level security;
alter table public.employee_compensation enable row level security;
alter table public.projects enable row level security;
alter table public.modules enable row level security;
alter table public.module_events enable row level security;
alter table public.tasks enable row level security;
alter table public.task_events enable row level security;
alter table public.bugs enable row level security;
alter table public.time_entries enable row level security;
alter table public.rework_reviews enable row level security;
alter table public.payroll_periods enable row level security;
alter table public.deduction_proposals enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_events enable row level security;

revoke all on public.organisations, public.employees, public.memberships, public.employee_compensation, public.projects, public.modules, public.module_events, public.tasks, public.task_events, public.bugs, public.time_entries, public.rework_reviews, public.payroll_periods, public.deduction_proposals, public.notifications, public.audit_events from anon, authenticated;
grant select on public.organisations, public.employees, public.memberships, public.employee_compensation, public.projects, public.modules, public.module_events, public.tasks, public.task_events, public.bugs, public.time_entries, public.rework_reviews, public.payroll_periods, public.deduction_proposals, public.notifications, public.audit_events to authenticated;

create policy org_read on public.organisations for select to authenticated using (public.is_member(id));
create policy employee_read on public.employees for select to authenticated using (public.is_member(organisation_id));
create policy membership_read on public.memberships for select to authenticated using (public.is_member(organisation_id));
create policy compensation_read on public.employee_compensation for select to authenticated using (public.has_org_role(organisation_id, array['owner','payroll_admin']) or public.is_employee_self(employee_id));
create policy project_read on public.projects for select to authenticated using (public.is_member(organisation_id));
create policy module_read on public.modules for select to authenticated using (public.is_member(organisation_id));
create policy module_events_read on public.module_events for select to authenticated using (public.is_member(organisation_id));
create policy task_read on public.tasks for select to authenticated using (public.is_member(organisation_id));
create policy task_events_read on public.task_events for select to authenticated using (public.is_member(organisation_id));
create policy bug_read on public.bugs for select to authenticated using (public.is_member(organisation_id));
create policy time_read on public.time_entries for select to authenticated using (public.has_org_role(organisation_id, array['owner','manager','team_lead','payroll_admin']) or public.is_employee_self(employee_id));
create policy review_read on public.rework_reviews for select to authenticated using (public.has_org_role(organisation_id, array['owner','manager','team_lead','payroll_admin']) or exists(select 1 from public.bugs b where b.id = bug_id and public.is_employee_self(b.original_employee_id)));
create policy period_read on public.payroll_periods for select to authenticated using (
  public.has_org_role(organisation_id, array['owner','payroll_admin'])
  or exists(select 1 from public.deduction_proposals p where p.period_id=id and public.is_employee_self(p.employee_id))
);
create policy proposal_read on public.deduction_proposals for select to authenticated using (public.has_org_role(organisation_id, array['owner','payroll_admin']) or public.is_employee_self(employee_id));
create policy notification_read on public.notifications for select to authenticated using (recipient_user_id = (select auth.uid()));
create policy audit_read on public.audit_events for select to authenticated using (public.has_org_role(organisation_id, array['owner','manager','payroll_admin']));

revoke all on function public.is_member(uuid), public.has_org_role(uuid,text[]), public.is_employee_self(text) from public, anon;
grant execute on function public.is_member(uuid), public.has_org_role(uuid,text[]), public.is_employee_self(text) to authenticated;
