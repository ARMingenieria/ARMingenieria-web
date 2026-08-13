-- 1) Registra primero tu cuenta desde la web y confirma el correo.
-- 2) Sustituye el correo y ejecuta este bloque en Supabase > SQL Editor.
update public.profiles
set account_role = 'admin', account_status = 'active'
where id = (select id from auth.users where lower(email) = lower('alejandro@armingenieria.com'));

select u.email,p.account_role,p.account_status
from auth.users u join public.profiles p on p.id=u.id
where lower(u.email)=lower('alejandro@armingenieria.com');
