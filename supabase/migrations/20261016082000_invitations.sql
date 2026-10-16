create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id),
  employee_id text not null,
  email text not null,
  role text not null check (role in ('manager','team_lead','employee','payroll_admin')),
  status text not null default 'pending' check (status in ('pending','accepted','revoked')),
  invited_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  unique (organisation_id,email),
  foreign key (organisation_id,employee_id) references public.employees(organisation_id,id)
);
create index invitations_org_idx on public.invitations(organisation_id,status);
create index invitations_email_idx on public.invitations(email,status);
alter table public.invitations enable row level security;
revoke all on public.invitations from anon, authenticated;
grant select on public.invitations to authenticated;
create policy invitation_read on public.invitations for select to authenticated using (public.has_org_role(organisation_id,array['owner','manager']));

create or replace function public.create_employee_invitation(p_org uuid,p_email text,p_name text,p_role text,p_title text,p_department text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user uuid; v_employee text; v_invitation uuid; v_email text := lower(trim(p_email)); v_actor_role text;
begin
  v_user := app_private.require_role(p_org,array['owner','manager']);
  select role into v_actor_role from public.memberships where organisation_id=p_org and user_id=v_user;
  if p_role not in ('manager','team_lead','employee','payroll_admin') then raise exception 'Invalid invitation role'; end if;
  if v_actor_role='manager' and p_role in ('manager','payroll_admin') then raise exception 'Only an owner may grant this role' using errcode='42501'; end if;
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' or length(trim(p_name)) < 2 then raise exception 'Valid email and name required'; end if;
  if exists(select 1 from public.employees where organisation_id=p_org and lower(email)=v_email) then raise exception 'Employee or invitation already exists'; end if;
  insert into public.employees(organisation_id,full_name,email,title,department)
    values(p_org,trim(p_name),v_email,trim(coalesce(p_title,'Employee')),trim(coalesce(p_department,'General'))) returning id into v_employee;
  insert into public.employee_compensation(organisation_id,employee_id) values(p_org,v_employee);
  insert into public.invitations(organisation_id,employee_id,email,role,invited_by)
    values(p_org,v_employee,v_email,p_role,v_user) returning id into v_invitation;
  insert into public.audit_events(organisation_id,actor_user_id,action,subject_type,subject_id,details)
    values(p_org,v_user,'employee.invited','employee',v_employee,jsonb_build_object('role',p_role));
  return v_invitation;
end;
$$;

create or replace function public.accept_pending_invitations()
returns integer language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_email text; v_invite record; v_count integer := 0;
begin
  if v_user is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select lower(email) into v_email from auth.users where id=v_user and email_confirmed_at is not null;
  if v_email is null then return 0; end if;
  for v_invite in select * from public.invitations where email=v_email and status='pending' and expires_at > now() for update loop
    update public.employees set auth_user_id=v_user where id=v_invite.employee_id and auth_user_id is null;
    if not found then continue; end if;
    insert into public.memberships(organisation_id,user_id,employee_id,role)
      values(v_invite.organisation_id,v_user,v_invite.employee_id,v_invite.role)
      on conflict (organisation_id,user_id) do nothing;
    update public.invitations set status='accepted',accepted_at=now() where id=v_invite.id;
    insert into public.audit_events(organisation_id,actor_user_id,action,subject_type,subject_id)
      values(v_invite.organisation_id,v_user,'employee.invitation_accepted','employee',v_invite.employee_id);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

revoke all on function public.create_employee_invitation(uuid,text,text,text,text,text),public.accept_pending_invitations() from public,anon;
grant execute on function public.create_employee_invitation(uuid,text,text,text,text,text),public.accept_pending_invitations() to authenticated;
