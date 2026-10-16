create or replace function public.finalise_payroll(p_org uuid, p_period uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid;
  v_status text;
begin
  v_user := app_private.require_role(p_org, array['owner','payroll_admin']);
  select status into v_status
    from public.payroll_periods
    where id = p_period and organisation_id = p_org
    for update;
  if v_status is null then
    raise exception 'Payroll period not found';
  end if;
  if v_status in ('finalised','held') then
    raise exception 'Payroll period cannot be finalised in its current state';
  end if;
  if exists (
    select 1
    from public.deduction_proposals
    where period_id = p_period
      and organisation_id = p_org
      and status in ('notice_pending','notified','disputed','held')
  ) then
    raise exception 'Resolve all open payroll proposals before finalisation';
  end if;
  update public.deduction_proposals
    set status = 'approved'
    where period_id = p_period
      and organisation_id = p_org
      and status = 'acknowledged';
  update public.payroll_periods
    set status = 'finalised', finalised_at = now()
    where id = p_period and organisation_id = p_org;
  insert into public.audit_events(organisation_id, actor_user_id, action, subject_type, subject_id)
    values (p_org, v_user, 'payroll.finalised', 'payroll_period', p_period::text);
end;
$$;

revoke all on function public.finalise_payroll(uuid, uuid) from public, anon;
grant execute on function public.finalise_payroll(uuid, uuid) to authenticated;
