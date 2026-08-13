-- ARM Platform Core v5.1 — Supabase Auth, perfiles, permisos, métricas y administración.
-- Ejecutar una sola vez en un proyecto de DESARROLLO desde Supabase > SQL Editor.

create extension if not exists pgcrypto;

do $$ begin create type public.account_role as enum ('user','admin'); exception when duplicate_object then null; end $$;
do $$ begin create type public.account_status as enum ('active','suspended','blocked'); exception when duplicate_object then null; end $$;
do $$ begin create type public.partner_status as enum ('not_requested','pending','under_review','approved','rejected','suspended'); exception when duplicate_object then null; end $$;
do $$ begin create type public.application_status as enum ('draft','published','maintenance','archived'); exception when duplicate_object then null; end $$;
do $$ begin create type public.access_status as enum ('allowed','blocked','expired'); exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  professional_role text,
  country text not null default 'España',
  province text,
  account_role public.account_role not null default 'user',
  account_status public.account_status not null default 'active',
  partner_status public.partner_status not null default 'not_requested',
  marketing_consent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Compatibilidad si se llegó a ejecutar el esquema preliminar v5.0.
alter table public.profiles add column if not exists account_status public.account_status not null default 'active';

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  description text,
  status public.application_status not null default 'draft',
  default_access_registered boolean not null default true,
  public_access_label text not null default 'Acceso gratuito',
  route text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.applications add column if not exists default_access_registered boolean not null default true;

create table if not exists public.user_application_access (
  user_id uuid not null references auth.users(id) on delete cascade,
  application_id uuid not null references public.applications(id) on delete cascade,
  status public.access_status not null default 'allowed',
  granted_by uuid references auth.users(id),
  granted_at timestamptz not null default now(),
  expires_at timestamptz,
  notes text,
  primary key (user_id, application_id)
);

create table if not exists public.partner_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references auth.users(id) on delete cascade,
  company_name text,
  tax_id text,
  specialties text[] not null default '{}',
  service_regions text[] not null default '{}',
  status public.partner_status not null default 'pending',
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),
  internal_notes text
);

create table if not exists public.usage_events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  application_id uuid references public.applications(id) on delete set null,
  event_type text not null check (char_length(event_type) between 1 and 80),
  session_id uuid,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists usage_events_created_at_idx on public.usage_events(created_at desc);
create index if not exists usage_events_app_created_idx on public.usage_events(application_id,created_at desc);
create index if not exists usage_events_user_created_idx on public.usage_events(user_id,created_at desc);

create table if not exists public.legal_consents (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  consent_type text not null check (consent_type in ('terms','privacy','marketing')),
  document_version text not null,
  granted boolean not null,
  source text not null default 'registration',
  created_at timestamptz not null default now()
);
create index if not exists legal_consents_user_idx on public.legal_consents(user_id,created_at desc);

create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  admin_user_id uuid not null references auth.users(id),
  action text not null,
  target_type text,
  target_id text,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path='' as $$ begin new.updated_at=now(); return new; end; $$;
drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists applications_set_updated_at on public.applications;
create trigger applications_set_updated_at before update on public.applications for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=''
as $$
declare
  wants_partner boolean := lower(coalesce(new.raw_user_meta_data->>'partner_interest','false')) in ('true','1','yes','on');
  wants_marketing boolean := lower(coalesce(new.raw_user_meta_data->>'marketing_consent','false')) in ('true','1','yes','on');
  legal_version text := coalesce(nullif(new.raw_user_meta_data->>'legal_version',''),'2026-08-01');
begin
  insert into public.profiles(id,first_name,last_name,professional_role,country,province,partner_status,marketing_consent)
  values(new.id,coalesce(new.raw_user_meta_data->>'first_name',''),coalesce(new.raw_user_meta_data->>'last_name',''),new.raw_user_meta_data->>'professional_role',coalesce(nullif(new.raw_user_meta_data->>'country',''),'España'),new.raw_user_meta_data->>'province',case when wants_partner then 'pending'::public.partner_status else 'not_requested'::public.partner_status end,wants_marketing)
  on conflict(id) do nothing;
  if wants_partner then insert into public.partner_applications(user_id,status) values(new.id,'pending') on conflict(user_id) do nothing; end if;
  insert into public.legal_consents(user_id,consent_type,document_version,granted)
  values(new.id,'terms',legal_version,true),(new.id,'privacy',legal_version,true),(new.id,'marketing',legal_version,wants_marketing);
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path=''
as $$ select exists(select 1 from public.profiles where id=(select auth.uid()) and account_role='admin' and account_status='active'); $$;

create or replace function public.is_active_user()
returns boolean language sql stable security definer set search_path=''
as $$ select exists(select 1 from public.profiles where id=(select auth.uid()) and account_status='active'); $$;

create or replace function public.update_my_profile(p_first_name text,p_last_name text,p_professional_role text,p_country text,p_province text)
returns public.profiles language plpgsql security definer set search_path=''
as $$ declare result public.profiles; begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  update public.profiles set first_name=left(trim(coalesce(p_first_name,'')),100),last_name=left(trim(coalesce(p_last_name,'')),150),professional_role=left(trim(coalesce(p_professional_role,'')),150),country=left(trim(coalesce(p_country,'')),100),province=left(trim(coalesce(p_province,'')),100) where id=auth.uid() and account_status='active' returning * into result;
  if result.id is null then raise exception 'profile unavailable'; end if; return result;
end; $$;

create or replace function public.can_access_application(p_slug text)
returns boolean language sql stable security definer set search_path=''
as $$
select exists(
  select 1 from public.applications a join public.profiles p on p.id=auth.uid()
  left join public.user_application_access ua on ua.application_id=a.id and ua.user_id=auth.uid()
  where a.slug=p_slug and a.status='published' and p.account_status='active'
  and case when ua.user_id is null then a.default_access_registered
           when ua.status='blocked' then false
           when ua.status='expired' then false
           when ua.expires_at is not null and ua.expires_at<=now() then false
           else ua.status='allowed' end
); $$;

create or replace function public.record_usage_event(p_application_slug text,p_event_type text,p_metadata jsonb default '{}')
returns bigint language plpgsql security definer set search_path=''
as $$ declare app_id uuid; new_id bigint; begin
  if auth.uid() is null or not public.is_active_user() then raise exception 'access denied'; end if;
  if char_length(coalesce(p_event_type,'')) not between 1 and 80 then raise exception 'invalid event'; end if;
  select id into app_id from public.applications where slug=p_application_slug and status='published';
  if app_id is null then raise exception 'application unavailable'; end if;
  insert into public.usage_events(user_id,application_id,event_type,metadata) values(auth.uid(),app_id,p_event_type,coalesce(p_metadata,'{}')) returning id into new_id; return new_id;
end; $$;

create or replace function public.admin_dashboard_metrics()
returns jsonb language plpgsql stable security definer set search_path=''
as $$ begin
  if not public.is_admin() then raise exception 'access denied'; end if;
  return jsonb_build_object(
    'total_users',(select count(*) from public.profiles),
    'active_today',(select count(distinct user_id) from public.usage_events where created_at>=date_trunc('day',now())),
    'active_30d',(select count(distinct user_id) from public.usage_events where created_at>=now()-interval '30 days'),
    'active_365d',(select count(distinct user_id) from public.usage_events where created_at>=now()-interval '365 days'),
    'app_opens_30d',(select count(*) from public.usage_events where event_type='app_open' and created_at>=now()-interval '30 days'),
    'pending_partners',(select count(*) from public.partner_applications where status in ('pending','under_review'))
  );
end; $$;

create or replace function public.admin_list_users(p_limit integer default 50,p_offset integer default 0,p_search text default null)
returns table(id uuid,email text,first_name text,last_name text,professional_role text,account_role public.account_role,account_status public.account_status,partner_status public.partner_status,created_at timestamptz,last_sign_in_at timestamptz,application_count bigint)
language plpgsql stable security definer set search_path=''
as $$ begin
  if not public.is_admin() then raise exception 'access denied'; end if;
  return query select p.id,u.email::text,p.first_name,p.last_name,p.professional_role,p.account_role,p.account_status,p.partner_status,p.created_at,u.last_sign_in_at,
  (select count(*) from public.applications a
     left join public.user_application_access ua on ua.application_id=a.id and ua.user_id=p.id
     where a.status='published' and case
       when ua.user_id is null then a.default_access_registered
       when ua.status in ('blocked','expired') then false
       when ua.expires_at is not null and ua.expires_at<=now() then false
       else ua.status='allowed' end)
  from public.profiles p join auth.users u on u.id=p.id
  where p_search is null or concat_ws(' ',p.first_name,p.last_name,u.email) ilike '%'||p_search||'%'
  order by p.created_at desc limit least(greatest(coalesce(p_limit,50),1),200) offset greatest(coalesce(p_offset,0),0);
end; $$;

create or replace function public.admin_list_partner_applications(p_limit integer default 50,p_offset integer default 0)
returns table(id uuid,user_id uuid,email text,first_name text,last_name text,professional_role text,province text,status public.partner_status,submitted_at timestamptz)
language plpgsql stable security definer set search_path=''
as $$ begin
  if not public.is_admin() then raise exception 'access denied'; end if;
  return query select pa.id,pa.user_id,u.email::text,p.first_name,p.last_name,p.professional_role,p.province,pa.status,pa.submitted_at from public.partner_applications pa join public.profiles p on p.id=pa.user_id join auth.users u on u.id=pa.user_id order by pa.submitted_at desc limit least(greatest(coalesce(p_limit,50),1),200) offset greatest(coalesce(p_offset,0),0);
end; $$;

alter table public.profiles enable row level security;
alter table public.applications enable row level security;
alter table public.user_application_access enable row level security;
alter table public.partner_applications enable row level security;
alter table public.usage_events enable row level security;
alter table public.legal_consents enable row level security;
alter table public.admin_audit_log enable row level security;

-- Recreate policies safely.
do $$ declare r record; begin for r in select schemaname,tablename,policyname from pg_policies where schemaname='public' and tablename in ('profiles','applications','user_application_access','partner_applications','usage_events','legal_consents','admin_audit_log') loop execute format('drop policy if exists %I on %I.%I',r.policyname,r.schemaname,r.tablename); end loop; end $$;

create policy profiles_select_own_or_admin on public.profiles for select to authenticated using(id=(select auth.uid()) or public.is_admin());
create policy applications_public_read on public.applications for select to anon,authenticated using(status='published');
create policy applications_admin_read on public.applications for select to authenticated using(public.is_admin());
create policy access_select_own_or_admin on public.user_application_access for select to authenticated using(user_id=(select auth.uid()) or public.is_admin());
create policy partner_select_own_or_admin on public.partner_applications for select to authenticated using(user_id=(select auth.uid()) or public.is_admin());
create policy usage_select_own_or_admin on public.usage_events for select to authenticated using(user_id=(select auth.uid()) or public.is_admin());
create policy consents_select_own_or_admin on public.legal_consents for select to authenticated using(user_id=(select auth.uid()) or public.is_admin());
create policy audit_admin_read on public.admin_audit_log for select to authenticated using(public.is_admin());

revoke all on public.profiles,public.applications,public.user_application_access,public.partner_applications,public.usage_events,public.legal_consents,public.admin_audit_log from anon,authenticated;
grant select on public.applications to anon,authenticated;
grant select on public.profiles,public.user_application_access,public.partner_applications,public.usage_events,public.legal_consents to authenticated;

-- Las funciones SECURITY DEFINER no quedan ejecutables por anónimos ni por PUBLIC.
revoke execute on function public.set_updated_at() from public,anon,authenticated;
revoke execute on function public.handle_new_user() from public,anon,authenticated;
revoke execute on function public.is_admin() from public,anon;
revoke execute on function public.is_active_user() from public,anon;
revoke execute on function public.update_my_profile(text,text,text,text,text) from public,anon;
revoke execute on function public.can_access_application(text) from public,anon;
revoke execute on function public.record_usage_event(text,text,jsonb) from public,anon;
revoke execute on function public.admin_dashboard_metrics() from public,anon;
revoke execute on function public.admin_list_users(integer,integer,text) from public,anon;
revoke execute on function public.admin_list_partner_applications(integer,integer) from public,anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_active_user() to authenticated;
grant execute on function public.update_my_profile(text,text,text,text,text) to authenticated;
grant execute on function public.can_access_application(text) to authenticated;
grant execute on function public.record_usage_event(text,text,jsonb) to authenticated;
grant execute on function public.admin_dashboard_metrics() to authenticated;
grant execute on function public.admin_list_users(integer,integer,text) to authenticated;
grant execute on function public.admin_list_partner_applications(integer,integer) to authenticated;

insert into public.applications(slug,name,description,status,default_access_registered,route,sort_order)
values('arm-cad','ARM CAD','Entorno CAD 2D online','published',true,'/aplicaciones/arm-cad/',10)
on conflict(slug) do update set name=excluded.name,description=excluded.description,status=excluded.status,default_access_registered=excluded.default_access_registered,route=excluded.route,sort_order=excluded.sort_order;
