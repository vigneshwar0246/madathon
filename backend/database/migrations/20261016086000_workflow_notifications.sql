create or replace function public.assign_task(p_org uuid, p_project text, p_module text, p_title text, p_description text, p_assignee text, p_due date, p_priority text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid;
  v_id text;
  v_recipient uuid;
begin
  v_user := app_private.require_role(p_org,array['owner','manager','team_lead']);
  if not exists(select 1 from public.modules where id=p_module and project_id=p_project and organisation_id=p_org) then raise exception 'Module does not belong to project'; end if;
  select auth_user_id into v_recipient from public.employees where id=p_assignee and organisation_id=p_org and active;
  if not found then raise exception 'Assignee is not in this workspace'; end if;
  if p_due is null or p_due < current_date or length(trim(coalesce(p_title,''))) < 3 then raise exception 'Title and a valid committed date are required'; end if;
  insert into public.tasks(organisation_id,project_id,module_id,title,description,assignee_employee_id,committed_date,priority,created_by)
    values(p_org,p_project, p_module, trim(p_title), trim(coalesce(p_description,'')), p_assignee, p_due, lower(p_priority), v_user)
    returning id into v_id;
  insert into public.task_events(organisation_id,task_id,to_status,actor_user_id,reason)
    values(p_org,v_id,'assigned',v_user,'Task assigned');
  insert into public.audit_events(organisation_id,actor_user_id,action,subject_type,subject_id,details)
    values(p_org,v_user,'task.assigned','task',v_id,jsonb_build_object('assignee',p_assignee,'due',p_due));
  if v_recipient is not null then
    insert into public.notifications(organisation_id,recipient_user_id,kind,title,body)
      values(p_org,v_recipient,'task_assignment','New task assigned','Task ' || v_id || ' was assigned to you.');
  end if;
  return v_id;
end;
$$;

create or replace function public.review_time_entry(p_org uuid, p_entry text, p_decision text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid;
  v_employee text;
  v_status text;
  v_recipient uuid;
begin
  v_user := app_private.require_role(p_org,array['owner','manager','team_lead']);
  select employee_id,review_status into v_employee,v_status from public.time_entries where organisation_id=p_org and id=p_entry for update;
  if v_status is null then raise exception 'Time entry not found'; end if;
  if v_status <> 'pending' then raise exception 'Time entry was already reviewed'; end if;
  if public.is_employee_self(v_employee) then raise exception 'Self-approval is not allowed' using errcode='42501'; end if;
  if p_decision not in ('approved','rejected') then raise exception 'Invalid time decision'; end if;
  update public.time_entries set review_status=p_decision,reviewed_by=v_user,reviewed_at=now() where id=p_entry;
  select auth_user_id into v_recipient from public.employees where id=v_employee and organisation_id=p_org;
  insert into public.audit_events(organisation_id,actor_user_id,action,subject_type,subject_id,details)
    values(p_org,v_user,'time.reviewed','time_entry',p_entry,jsonb_build_object('decision',p_decision));
  if v_recipient is not null then
    insert into public.notifications(organisation_id,recipient_user_id,kind,title,body)
      values(p_org,v_recipient,'time_reviewed','Work log review completed','Your work log ' || p_entry || ' was ' || p_decision || '.');
  end if;
end;
$$;

revoke all on function public.assign_task(uuid,text,text,text,text,text,date,text), public.review_time_entry(uuid,text,text) from public, anon;
grant execute on function public.assign_task(uuid,text,text,text,text,text,date,text), public.review_time_entry(uuid,text,text) to authenticated;
