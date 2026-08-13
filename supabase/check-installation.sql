select 'profiles' as object,count(*) as rows from public.profiles
union all select 'applications',count(*) from public.applications
union all select 'partner_applications',count(*) from public.partner_applications
union all select 'usage_events',count(*) from public.usage_events;

select slug,name,status,default_access_registered,route from public.applications order by sort_order;
