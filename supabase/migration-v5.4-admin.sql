-- ARM Platform Core v5.4 — administración operativa y métricas por aplicación.
-- Ejecutar UNA VEZ después de schema.sql v5.1/v5.3.

create or replace function public.admin_activity_by_application(p_days integer default 30)
returns table(application_slug text,application_name text,opens bigint,unique_users bigint,last_open timestamptz)
language plpgsql stable security definer set search_path=''
as $$ begin
  if not public.is_admin() then raise exception 'access denied'; end if;
  return query
  select a.slug,a.name,
         count(ue.id) filter (where ue.event_type='app_open')::bigint,
         count(distinct ue.user_id) filter (where ue.event_type='app_open')::bigint,
         max(ue.created_at) filter (where ue.event_type='app_open')
  from public.applications a
  left join public.usage_events ue
    on ue.application_id=a.id
   and ue.created_at>=now()-make_interval(days=>least(greatest(coalesce(p_days,30),1),3650))
  where a.status in ('published','maintenance')
  group by a.id,a.slug,a.name,a.sort_order
  order by a.sort_order,a.name;
end; $$;

create or replace function public.admin_set_user_status(p_user_id uuid,p_status public.account_status)
returns public.profiles language plpgsql security definer set search_path=''
as $$ declare result public.profiles; begin
  if not public.is_admin() then raise exception 'access denied'; end if;
  if p_user_id=(select auth.uid()) and p_status<>'active' then raise exception 'cannot restrict own admin account'; end if;
  update public.profiles set account_status=p_status where id=p_user_id returning * into result;
  if result.id is null then raise exception 'user not found'; end if;
  insert into public.admin_audit_log(admin_user_id,action,target_type,target_id,details)
  values((select auth.uid()),'set_user_status','user',p_user_id::text,jsonb_build_object('status',p_status::text));
  return result;
end; $$;

create or replace function public.admin_set_user_role(p_user_id uuid,p_role public.account_role)
returns public.profiles language plpgsql security definer set search_path=''
as $$ declare result public.profiles; begin
  if not public.is_admin() then raise exception 'access denied'; end if;
  if p_user_id=(select auth.uid()) and p_role<>'admin' then raise exception 'cannot remove own admin role'; end if;
  update public.profiles set account_role=p_role where id=p_user_id returning * into result;
  if result.id is null then raise exception 'user not found'; end if;
  insert into public.admin_audit_log(admin_user_id,action,target_type,target_id,details)
  values((select auth.uid()),'set_user_role','user',p_user_id::text,jsonb_build_object('role',p_role::text));
  return result;
end; $$;

create or replace function public.admin_set_partner_status(p_application_id uuid,p_status public.partner_status,p_internal_notes text default null)
returns public.partner_applications language plpgsql security definer set search_path=''
as $$ declare result public.partner_applications; begin
  if not public.is_admin() then raise exception 'access denied'; end if;
  update public.partner_applications
  set status=p_status, reviewed_at=now(), reviewed_by=(select auth.uid()), internal_notes=left(coalesce(p_internal_notes,''),4000)
  where id=p_application_id returning * into result;
  if result.id is null then raise exception 'partner application not found'; end if;
  update public.profiles set partner_status=p_status where id=result.user_id;
  insert into public.admin_audit_log(admin_user_id,action,target_type,target_id,details)
  values((select auth.uid()),'set_partner_status','partner_application',p_application_id::text,jsonb_build_object('status',p_status::text));
  return result;
end; $$;

create or replace function public.admin_set_application_access(p_user_id uuid,p_slug text,p_status public.access_status,p_notes text default null)
returns public.user_application_access language plpgsql security definer set search_path=''
as $$ declare app_id uuid; result public.user_application_access; begin
  if not public.is_admin() then raise exception 'access denied'; end if;
  select id into app_id from public.applications where slug=p_slug;
  if app_id is null then raise exception 'application not found'; end if;
  insert into public.user_application_access(user_id,application_id,status,granted_by,granted_at,notes)
  values(p_user_id,app_id,p_status,(select auth.uid()),now(),left(coalesce(p_notes,''),2000))
  on conflict(user_id,application_id) do update
    set status=excluded.status, granted_by=excluded.granted_by, granted_at=excluded.granted_at, notes=excluded.notes
  returning * into result;
  insert into public.admin_audit_log(admin_user_id,action,target_type,target_id,details)
  values((select auth.uid()),'set_application_access','user',p_user_id::text,jsonb_build_object('application',p_slug,'status',p_status::text));
  return result;
end; $$;

revoke execute on function public.admin_activity_by_application(integer) from public,anon;
revoke execute on function public.admin_set_user_status(uuid,public.account_status) from public,anon;
revoke execute on function public.admin_set_user_role(uuid,public.account_role) from public,anon;
revoke execute on function public.admin_set_partner_status(uuid,public.partner_status,text) from public,anon;
revoke execute on function public.admin_set_application_access(uuid,text,public.access_status,text) from public,anon;
grant execute on function public.admin_activity_by_application(integer) to authenticated;
grant execute on function public.admin_set_user_status(uuid,public.account_status) to authenticated;
grant execute on function public.admin_set_user_role(uuid,public.account_role) to authenticated;
grant execute on function public.admin_set_partner_status(uuid,public.partner_status,text) to authenticated;
grant execute on function public.admin_set_application_access(uuid,text,public.access_status,text) to authenticated;
