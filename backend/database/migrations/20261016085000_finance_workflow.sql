create table if not exists public.payroll_snapshots (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id),
  period_id uuid not null references public.payroll_periods(id),
  employee_id text not null,
  gross_pay numeric(12,2) not null check (gross_pay >= 0),
  authorised_deductions numeric(12,2) not null default 0 check (authorised_deductions >= 0),
  net_pay numeric(12,2) not null check (net_pay >= 0),
  currency text not null default 'INR',
  finalised_at timestamptz not null default now(),
  unique (period_id, employee_id),
  foreign key (organisation_id, employee_id) references public.employees(organisation_id, id)
);

create index if not exists payroll_snapshots_employee_idx on public.payroll_snapshots(employee_id, finalised_at desc);
alter table public.payroll_snapshots enable row level security;
revoke all on public.payroll_snapshots from anon, authenticated;
grant select on public.payroll_snapshots to authenticated;
create policy payroll_snapshot_read on public.payroll_snapshots for select to authenticated using (
  public.has_org_role(organisation_id, array['owner','payroll_admin'])
  or public.is_employee_self(employee_id)
);

create or replace function public.decide_payroll_proposal(p_org uuid, p_proposal uuid, p_decision text, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid;
  v_status text;
begin
  v_user := app_private.require_role(p_org, array['owner','payroll_admin']);
  select status into v_status from public.deduction_proposals
    where id = p_proposal and organisation_id = p_org for update;
  if v_status is null then raise exception 'Payroll proposal not found'; end if;
  if v_status in ('approved','cancelled') then raise exception 'Payroll proposal was already decided'; end if;
  if p_decision not in ('approved','cancelled','held') then raise exception 'Invalid payroll decision'; end if;
  if p_decision in ('cancelled','held') and length(trim(coalesce(p_reason,''))) < 10 then
    raise exception 'A reason is required for returned or rejected proposals';
  end if;
  update public.deduction_proposals set status = p_decision where id = p_proposal;
  insert into public.audit_events(organisation_id, actor_user_id, action, subject_type, subject_id, details)
    values (p_org, v_user, 'payroll.proposal_decided', 'proposal', p_proposal::text,
      jsonb_build_object('decision', p_decision, 'reason', trim(coalesce(p_reason,''))));
end;
$$;

revoke all on function public.decide_payroll_proposal(uuid, uuid, text, text) from public, anon;
grant execute on function public.decide_payroll_proposal(uuid, uuid, text, text) to authenticated;

create or replace function public.finalise_payroll(p_org uuid, p_period uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid;
  v_status text;
  v_employee record;
  v_gross numeric;
  v_deductions numeric;
begin
  v_user := app_private.require_role(p_org, array['owner','payroll_admin']);
  select status into v_status from public.payroll_periods
    where id = p_period and organisation_id = p_org for update;
  if v_status is null then raise exception 'Payroll period not found'; end if;
  if v_status in ('finalised','held') then raise exception 'Payroll period cannot be finalised in its current state'; end if;
  if exists (select 1 from public.deduction_proposals where period_id = p_period and organisation_id = p_org and status in ('notice_pending','notified','disputed','held')) then
    raise exception 'Resolve all open payroll proposals before finalisation';
  end if;
  update public.deduction_proposals set status = 'approved'
    where period_id = p_period and organisation_id = p_org and status = 'acknowledged';
  for v_employee in select e.id, c.gross_monthly, c.currency from public.employees e
    join public.employee_compensation c on c.employee_id = e.id and c.organisation_id = e.organisation_id
    where e.organisation_id = p_org and e.active
  loop
    v_gross := coalesce(v_employee.gross_monthly, 0);
    select coalesce(sum(proposed_amount), 0) into v_deductions
      from public.deduction_proposals where period_id = p_period and organisation_id = p_org
      and employee_id = v_employee.id and status = 'approved';
    insert into public.payroll_snapshots(organisation_id, period_id, employee_id, gross_pay, authorised_deductions, net_pay, currency)
      values (p_org, p_period, v_employee.id, v_gross, v_deductions, greatest(0, v_gross - v_deductions), v_employee.currency)
      on conflict (period_id, employee_id) do nothing;
  end loop;
  update public.payroll_periods set status = 'finalised', finalised_at = now()
    where id = p_period and organisation_id = p_org;
  insert into public.audit_events(organisation_id, actor_user_id, action, subject_type, subject_id)
    values (p_org, v_user, 'payroll.finalised', 'payroll_period', p_period::text);
end;
$$;

revoke all on function public.finalise_payroll(uuid, uuid) from public, anon;
grant execute on function public.finalise_payroll(uuid, uuid) to authenticated;
