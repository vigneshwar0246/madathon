create schema if not exists app_private;
revoke all on schema app_private from public, anon, authenticated;

create or replace function app_private.require_role(p_org uuid, p_roles text[])
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if not exists(select 1 from public.memberships where organisation_id = p_org and user_id = v_user and role = any(p_roles)) then
    raise exception 'Insufficient workspace permissions' using errcode = '42501';
  end if;
  return v_user;
end;
$$;
revoke all on function app_private.require_role(uuid,text[]) from public, anon, authenticated;

create or replace function app_private.sync_module_from_task()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_old text; v_next text;
begin
  select status into v_old from public.modules where id=new.module_id and organisation_id=new.organisation_id for update;
  select case
    when bool_or(status='under_fix') then 'under_fix'
    when bool_or(status='reopened') then 'reopened'
    when bool_and(status='closed') then 'closed'
    when bool_and(status in ('completed','closed')) then 'completed'
    when bool_or(status in ('in_progress','submitted','completed','closed')) then 'in_progress'
    else 'assigned' end into v_next
  from public.tasks where module_id=new.module_id and organisation_id=new.organisation_id;
  if v_next is distinct from v_old then
    update public.modules set status=v_next,
      completed_at=case when v_next in ('completed','closed') then coalesce(completed_at,now()) else completed_at end
      where id=new.module_id and organisation_id=new.organisation_id;
    insert into public.module_events(organisation_id,module_id,from_status,to_status,actor_user_id)
      values(new.organisation_id,new.module_id,v_old,v_next,auth.uid());
  end if;
  return new;
end;
$$;
revoke all on function app_private.sync_module_from_task() from public, anon, authenticated;
create trigger task_module_lifecycle after insert or update of status on public.tasks
for each row execute function app_private.sync_module_from_task();

create or replace function public.create_organisation(p_name text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_org uuid; v_employee text; v_email text; v_name text;
begin
  if v_user is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if length(trim(coalesce(p_name,''))) < 2 then raise exception 'Organisation name is required'; end if;
  select email, coalesce(raw_user_meta_data->>'full_name', split_part(email,'@',1)) into v_email, v_name from auth.users where id = v_user;
  insert into public.organisations(name) values(trim(p_name)) returning id into v_org;
  insert into public.employees(organisation_id,auth_user_id,full_name,email,title,department)
    values(v_org,v_user,v_name,lower(v_email),'Owner','Leadership') returning id into v_employee;
  insert into public.memberships(organisation_id,user_id,employee_id,role) values(v_org,v_user,v_employee,'owner');
  insert into public.employee_compensation(organisation_id,employee_id) values(v_org,v_employee);
  insert into public.audit_events(organisation_id,actor_user_id,action,subject_type,subject_id)
    values(v_org,v_user,'organisation.created','organisation',v_org::text);
  return v_org;
end;
$$;

create or replace function public.create_project(p_org uuid, p_name text, p_client text, p_description text, p_owner text, p_due date, p_modules text[])
returns text language plpgsql security definer set search_path = '' as $$
declare v_user uuid; v_id text; v_module text; v_module_id text;
begin
  v_user := app_private.require_role(p_org,array['owner','manager','team_lead']);
  if length(trim(coalesce(p_name,''))) < 2 or coalesce(array_length(p_modules,1),0) = 0 then raise exception 'Project name and modules are required'; end if;
  if p_owner is not null and not exists(select 1 from public.employees where organisation_id=p_org and id=p_owner and active) then raise exception 'Invalid project owner'; end if;
  insert into public.projects(organisation_id,name,client_name,description,owner_employee_id,committed_date)
    values(p_org,trim(p_name),trim(coalesce(p_client,'')),trim(coalesce(p_description,'')),p_owner,p_due) returning id into v_id;
  foreach v_module in array p_modules loop
    if length(trim(v_module)) < 2 then raise exception 'Each module needs a name'; end if;
    insert into public.modules(organisation_id,project_id,name,committed_date)
      values(p_org,v_id,trim(v_module),p_due) returning id into v_module_id;
    insert into public.module_events(organisation_id,module_id,to_status,actor_user_id)
      values(p_org,v_module_id,'assigned',v_user);
  end loop;
  insert into public.audit_events(organisation_id,actor_user_id,action,subject_type,subject_id)
    values(p_org,v_user,'project.created','project',v_id);
  return v_id;
end;
$$;

create or replace function public.assign_task(p_org uuid, p_project text, p_module text, p_title text, p_description text, p_assignee text, p_due date, p_priority text)
returns text language plpgsql security definer set search_path = '' as $$
declare v_user uuid; v_id text;
begin
  v_user := app_private.require_role(p_org,array['owner','manager','team_lead']);
  if not exists(select 1 from public.modules where id=p_module and project_id=p_project and organisation_id=p_org) then raise exception 'Module does not belong to project'; end if;
  if not exists(select 1 from public.employees where id=p_assignee and organisation_id=p_org and active) then raise exception 'Assignee is not in this workspace'; end if;
  if p_due is null or length(trim(coalesce(p_title,''))) < 3 then raise exception 'Title and committed date are required'; end if;
  insert into public.tasks(organisation_id,project_id,module_id,title,description,assignee_employee_id,committed_date,priority,created_by)
    values(p_org,p_project,p_module,trim(p_title),trim(coalesce(p_description,'')),p_assignee,p_due,lower(p_priority),v_user) returning id into v_id;
  insert into public.task_events(organisation_id,task_id,to_status,actor_user_id,reason) values(p_org,v_id,'assigned',v_user,'Task assigned');
  insert into public.audit_events(organisation_id,actor_user_id,action,subject_type,subject_id) values(p_org,v_user,'task.assigned','task',v_id);
  return v_id;
end;
$$;

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

create or replace function public.report_bug(p_org uuid, p_task text, p_title text, p_description text, p_severity text, p_found date)
returns text language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_task public.tasks%rowtype; v_bug text;
begin
  if v_user is null or not public.is_member(p_org) then raise exception 'Workspace access denied' using errcode='42501'; end if;
  select * into v_task from public.tasks where id=p_task and organisation_id=p_org for update;
  if not found or v_task.completed_at is null then raise exception 'Defect must link to a previously completed task'; end if;
  if not exists(select 1 from public.modules where id=v_task.module_id and organisation_id=p_org and completed_at is not null) then
    raise exception 'Complete the module before reporting a delivery defect';
  end if;
  if p_found > current_date or p_found < v_task.completed_at::date then raise exception 'Defect date must follow the original completion'; end if;
  if v_task.status not in ('completed','closed','reopened','under_fix') then raise exception 'Task is not eligible for reopening'; end if;
  if length(trim(coalesce(p_description,''))) < 10 then raise exception 'Defect description is too short'; end if;
  insert into public.bugs(organisation_id,task_id,title,description,severity,original_employee_id,reported_by,reported_at)
    values(p_org,p_task,trim(p_title),trim(p_description),lower(p_severity),v_task.assignee_employee_id,v_user,coalesce(p_found,current_date)::timestamptz) returning id into v_bug;
  if v_task.status in ('completed','closed') then
    update public.tasks set status='reopened',updated_at=now() where id=p_task;
    insert into public.task_events(organisation_id,task_id,from_status,to_status,actor_user_id,reason) values(p_org,p_task,v_task.status,'reopened',v_user,'Defect ' || v_bug || ' reported');
  end if;
  insert into public.audit_events(organisation_id,actor_user_id,action,subject_type,subject_id,details) values(p_org,v_user,'bug.reported','bug',v_bug,jsonb_build_object('task_id',p_task));
  return v_bug;
end;
$$;

create or replace function public.change_bug_status(p_org uuid, p_bug text, p_status text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_old text; v_task text; v_owner text; v_manager boolean; v_previous text; v_task_old text; v_task_next text;
begin
  if v_user is null or not public.is_member(p_org) then raise exception 'Workspace access denied' using errcode='42501'; end if;
  select status,task_id,original_employee_id into v_old,v_task,v_owner from public.bugs where id=p_bug and organisation_id=p_org for update;
  if v_old is null then raise exception 'Defect not found'; end if;
  v_manager := public.has_org_role(p_org,array['owner','manager','team_lead']);
  if not (
    (v_old='reported' and p_status in ('verified','rejected') and v_manager) or
    (v_old='verified' and p_status='under_fix' and (v_manager or public.is_employee_self(v_owner))) or
    (v_old='under_fix' and p_status='resolved' and (v_manager or public.is_employee_self(v_owner))) or
    (v_old='resolved' and p_status='closed' and v_manager)
  ) then raise exception 'Invalid or unauthorised defect transition' using errcode='42501'; end if;
  update public.bugs set status=p_status,verified_by=case when p_status='verified' then v_user else verified_by end,
    resolved_at=case when p_status='resolved' then now() else resolved_at end,
    closed_at=case when p_status='closed' then now() else closed_at end where id=p_bug;
  if p_status='under_fix' then
    select status into v_task_old from public.tasks where id=v_task and organisation_id=p_org for update;
    if v_task_old <> 'under_fix' then
      update public.tasks set status='under_fix',updated_at=now() where id=v_task;
      insert into public.task_events(organisation_id,task_id,from_status,to_status,actor_user_id,reason)
        values(p_org,v_task,v_task_old,'under_fix',v_user,'Verified defect ' || p_bug || ' is under fix');
    end if;
  end if;
  if p_status in ('closed','rejected') and not exists(select 1 from public.bugs where task_id=v_task and organisation_id=p_org and status not in ('closed','rejected')) then
    if p_status='rejected' then
      select from_status into v_previous from public.task_events
        where task_id=v_task and organisation_id=p_org and to_status='reopened'
        order by occurred_at desc limit 1;
    end if;
    v_task_next := case when p_status='rejected' then coalesce(v_previous,'completed') else 'closed' end;
    select status into v_task_old from public.tasks where id=v_task and organisation_id=p_org for update;
    if v_task_old <> v_task_next then
      update public.tasks set status=v_task_next,updated_at=now() where id=v_task;
      insert into public.task_events(organisation_id,task_id,from_status,to_status,actor_user_id,reason)
        values(p_org,v_task,v_task_old,v_task_next,v_user,'Defect ' || p_bug || ' ' || p_status);
    end if;
  end if;
  insert into public.audit_events(organisation_id,actor_user_id,action,subject_type,subject_id,details) values(p_org,v_user,'bug.status_changed','bug',p_bug,jsonb_build_object('from',v_old,'to',p_status));
end;
$$;

create or replace function public.log_work_time(p_org uuid, p_task text, p_bug text, p_date date, p_hours numeric, p_description text)
returns text language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_employee text; v_category text; v_id text; v_status text; v_assignee text;
begin
  if v_user is null or not public.is_member(p_org) then raise exception 'Workspace access denied' using errcode='42501'; end if;
  select employee_id into v_employee from public.memberships where organisation_id=p_org and user_id=v_user;
  if v_employee is null then raise exception 'Employee record is required'; end if;
  perform 1 from public.employees where organisation_id=p_org and id=v_employee for update;
  select status,assignee_employee_id into v_status,v_assignee from public.tasks where organisation_id=p_org and id=p_task;
  if v_status is null then raise exception 'Task not found'; end if;
  if v_assignee <> v_employee then raise exception 'Only the task assignee may log time' using errcode='42501'; end if;
  if p_bug is not null then
    if not exists(select 1 from public.bugs where id=p_bug and task_id=p_task and organisation_id=p_org and status in ('verified','under_fix')) then raise exception 'Corrective time requires a verified linked defect'; end if;
    if p_date < (select reported_at::date from public.bugs where id=p_bug) then raise exception 'Corrective time cannot predate the defect'; end if;
    v_category := 'corrective';
  else
    if v_status in ('reopened','under_fix') then raise exception 'Reopened task time must link to a verified defect'; end if;
    v_category := 'new_work';
  end if;
  if p_date > current_date or p_date < current_date - 90 or p_hours <= 0 or p_hours > 24 then raise exception 'Invalid work date or hours'; end if;
  if (select coalesce(sum(hours),0) from public.time_entries where organisation_id=p_org and employee_id=v_employee and work_date=p_date) + p_hours > 24 then
    raise exception 'Daily work time cannot exceed 24 hours';
  end if;
  insert into public.time_entries(organisation_id,task_id,bug_id,employee_id,work_date,hours,category,description)
    values(p_org,p_task,p_bug,v_employee,p_date,p_hours,v_category,trim(p_description)) returning id into v_id;
  insert into public.audit_events(organisation_id,actor_user_id,action,subject_type,subject_id) values(p_org,v_user,'time.logged','time_entry',v_id);
  return v_id;
end;
$$;

create or replace function public.review_time_entry(p_org uuid, p_entry text, p_decision text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_user uuid; v_employee text; v_status text;
begin
  v_user := app_private.require_role(p_org,array['owner','manager','team_lead']);
  select employee_id,review_status into v_employee,v_status from public.time_entries where organisation_id=p_org and id=p_entry for update;
  if v_status is null then raise exception 'Time entry not found'; end if;
  if v_status <> 'pending' then raise exception 'Time entry was already reviewed'; end if;
  if public.is_employee_self(v_employee) then raise exception 'Self-approval is not allowed' using errcode='42501'; end if;
  if p_decision not in ('approved','rejected') then raise exception 'Invalid time decision'; end if;
  update public.time_entries set review_status=p_decision,reviewed_by=v_user,reviewed_at=now() where id=p_entry;
  insert into public.audit_events(organisation_id,actor_user_id,action,subject_type,subject_id,details) values(p_org,v_user,'time.reviewed','time_entry',p_entry,jsonb_build_object('decision',p_decision));
end;
$$;

create or replace function public.review_rework(p_org uuid, p_bug text, p_decision text, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_user uuid; v_owner text; v_status text;
begin
  v_user := app_private.require_role(p_org,array['owner','manager','team_lead']);
  select original_employee_id,status into v_owner,v_status from public.bugs where organisation_id=p_org and id=p_bug for update;
  if v_status is null or v_status not in ('verified','under_fix','resolved','closed') then raise exception 'Verify the defect before responsibility review'; end if;
  if public.is_employee_self(v_owner) then raise exception 'Self-review is not allowed' using errcode='42501'; end if;
  if p_decision not in ('eligible','exempt') or length(trim(coalesce(p_reason,''))) < 15 then raise exception 'A valid decision and detailed reason are required'; end if;
  if exists(select 1 from public.rework_reviews where bug_id=p_bug) then raise exception 'Defect already reviewed'; end if;
  insert into public.rework_reviews(bug_id,organisation_id,decision,reason,reviewed_by) values(p_bug,p_org,p_decision,trim(p_reason),v_user);
  insert into public.audit_events(organisation_id,actor_user_id,action,subject_type,subject_id,details) values(p_org,v_user,'rework.reviewed','bug',p_bug,jsonb_build_object('decision',p_decision,'reason',trim(p_reason)));
end;
$$;

create or replace function public.set_compensation(p_org uuid, p_employee text, p_hourly numeric, p_gross numeric)
returns void language plpgsql security definer set search_path = '' as $$
declare v_user uuid;
begin
  v_user := app_private.require_role(p_org,array['owner','payroll_admin']);
  if p_hourly < 0 or p_gross < 0 then raise exception 'Compensation cannot be negative'; end if;
  update public.employee_compensation set hourly_rate=p_hourly,gross_monthly=p_gross,updated_at=now() where organisation_id=p_org and employee_id=p_employee;
  if not found then raise exception 'Employee compensation not found'; end if;
  insert into public.audit_events(organisation_id,actor_user_id,action,subject_type,subject_id) values(p_org,v_user,'compensation.updated','employee',p_employee);
end;
$$;

create or replace function public.create_payroll_draft(p_org uuid, p_work_month date)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user uuid; v_period uuid; v_entry record; v_proposal uuid;
begin
  v_user := app_private.require_role(p_org,array['owner','payroll_admin']);
  if extract(day from p_work_month) <> 1 then raise exception 'Use the first day of the work month'; end if;
  insert into public.payroll_periods(organisation_id,work_month,payroll_month,created_by)
    values(p_org,p_work_month,(p_work_month + interval '1 month')::date,v_user)
    on conflict (organisation_id,work_month) do update set work_month=excluded.work_month
    returning id into v_period;
  if exists(select 1 from public.payroll_periods where id=v_period and status <> 'draft') then raise exception 'Period is locked'; end if;
  for v_entry in
    select t.*,c.hourly_rate,e.auth_user_id,b.original_employee_id
    from public.time_entries t
    join public.bugs b on b.id=t.bug_id and b.organisation_id=t.organisation_id
    join public.rework_reviews r on r.bug_id=b.id and r.decision='eligible'
    join public.employee_compensation c on c.employee_id=t.employee_id and c.organisation_id=t.organisation_id
    join public.employees e on e.id=t.employee_id
    where t.organisation_id=p_org and t.category='corrective' and t.review_status='approved'
      and t.work_date >= p_work_month and t.work_date < (p_work_month + interval '1 month')::date
      and c.hourly_rate > 0 and t.employee_id=b.original_employee_id
  loop
    insert into public.deduction_proposals(organisation_id,period_id,time_entry_id,employee_id,hours,hourly_rate,proposed_amount)
      values(p_org,v_period,v_entry.id,v_entry.employee_id,v_entry.hours,v_entry.hourly_rate,round(v_entry.hours*v_entry.hourly_rate,2))
      on conflict (time_entry_id) do nothing returning id into v_proposal;
    if v_proposal is not null and v_entry.auth_user_id is not null then
      insert into public.notifications(organisation_id,recipient_user_id,kind,title,body)
        values(p_org,v_entry.auth_user_id,'payroll_notice','Rework proposal requires your review','A proposed adjustment is linked to approved corrective work. Review it before payroll processing.');
    end if;
    v_proposal := null;
  end loop;
  insert into public.audit_events(organisation_id,actor_user_id,action,subject_type,subject_id) values(p_org,v_user,'payroll.draft_created','payroll_period',v_period::text);
  return v_period;
end;
$$;

create or replace function public.respond_to_proposal(p_org uuid, p_proposal uuid, p_response text, p_reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_employee text; v_status text;
begin
  if v_user is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select employee_id,status into v_employee,v_status from public.deduction_proposals where id=p_proposal and organisation_id=p_org for update;
  if v_status is null or not public.is_employee_self(v_employee) then raise exception 'Proposal access denied' using errcode='42501'; end if;
  if v_status not in ('notice_pending','notified') then raise exception 'Proposal is not open for response'; end if;
  if p_response not in ('acknowledged','disputed') then raise exception 'Invalid response'; end if;
  if p_response='disputed' and length(trim(coalesce(p_reason,''))) < 10 then raise exception 'Dispute reason is required'; end if;
  update public.deduction_proposals set status=p_response,employee_response=trim(coalesce(p_reason,'')),employee_responded_at=now() where id=p_proposal;
  if p_response='disputed' then update public.payroll_periods set status='held' where id=(select period_id from public.deduction_proposals where id=p_proposal); end if;
  insert into public.audit_events(organisation_id,actor_user_id,action,subject_type,subject_id,details) values(p_org,v_user,'payroll.employee_response','proposal',p_proposal::text,jsonb_build_object('response',p_response));
end;
$$;

create or replace function public.mark_notification_read(p_notification uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.notifications set read_at=now() where id=p_notification and recipient_user_id=auth.uid();
end;
$$;

revoke all on function public.create_organisation(text), public.create_project(uuid,text,text,text,text,date,text[]), public.assign_task(uuid,text,text,text,text,text,date,text), public.change_task_status(uuid,text,text,text), public.report_bug(uuid,text,text,text,text,date), public.change_bug_status(uuid,text,text), public.log_work_time(uuid,text,text,date,numeric,text), public.review_time_entry(uuid,text,text), public.review_rework(uuid,text,text,text), public.set_compensation(uuid,text,numeric,numeric), public.create_payroll_draft(uuid,date), public.respond_to_proposal(uuid,uuid,text,text), public.mark_notification_read(uuid) from public, anon;
grant execute on function public.create_organisation(text), public.create_project(uuid,text,text,text,text,date,text[]), public.assign_task(uuid,text,text,text,text,text,date,text), public.change_task_status(uuid,text,text,text), public.report_bug(uuid,text,text,text,text,date), public.change_bug_status(uuid,text,text), public.log_work_time(uuid,text,text,date,numeric,text), public.review_time_entry(uuid,text,text), public.review_rework(uuid,text,text,text), public.set_compensation(uuid,text,numeric,numeric), public.create_payroll_draft(uuid,date), public.respond_to_proposal(uuid,uuid,text,text), public.mark_notification_read(uuid) to authenticated;
