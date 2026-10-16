-- Allow an assigned employee to submit corrective work for team-lead review.
create or replace function public.change_task_status(p_org uuid, p_task text, p_status text, p_reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_old text; v_assignee text; v_manager boolean;
begin
  if v_user is null or not public.is_member(p_org) then raise exception 'Workspace access denied' using errcode='42501'; end if;
  select status,assignee_employee_id into v_old,v_assignee from public.tasks where id=p_task and organisation_id=p_org for update;
  if v_old is null then raise exception 'Task not found'; end if;
  v_manager := public.has_org_role(p_org,array['owner','manager','team_lead']);
  if not (
    (v_old='assigned' and p_status='in_progress' and (v_manager or public.is_employee_self(v_assignee))) or
    (v_old='in_progress' and p_status='submitted' and (v_manager or public.is_employee_self(v_assignee))) or
    (v_old='submitted' and p_status='completed' and v_manager) or
    (v_old='reopened' and p_status='under_fix' and (v_manager or public.is_employee_self(v_assignee))) or
    (v_old='under_fix' and p_status='submitted' and (v_manager or public.is_employee_self(v_assignee))) or
    (v_old='under_fix' and p_status='closed' and v_manager)
  ) then raise exception 'Invalid or unauthorised task transition' using errcode='42501'; end if;
  if p_status='under_fix' and not exists(select 1 from public.bugs where task_id=p_task and organisation_id=p_org and status in ('verified','under_fix')) then
    raise exception 'Verify a linked defect before starting the fix';
  end if;
  if p_status='closed' and exists(select 1 from public.bugs where task_id=p_task and organisation_id=p_org and status not in ('closed','rejected')) then raise exception 'Resolve and verify linked defects before closure'; end if;
  update public.tasks set status=p_status,updated_at=now(),completed_at=case when p_status='completed' then now() else completed_at end where id=p_task;
  insert into public.task_events(organisation_id,task_id,from_status,to_status,actor_user_id,reason) values(p_org,p_task,v_old,p_status,v_user,p_reason);
  insert into public.audit_events(organisation_id,actor_user_id,action,subject_type,subject_id,details) values(p_org,v_user,'task.status_changed','task',p_task,jsonb_build_object('from',v_old,'to',p_status));
end;
$$;
