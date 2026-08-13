(()=>{
  const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)];
  const body=document.body,toast=q('[data-toast]');
  const showToast=(msg)=>{if(!toast)return;toast.textContent=msg;toast.classList.add('show');clearTimeout(window.__armToast);window.__armToast=setTimeout(()=>toast.classList.remove('show'),3600)};
  const formMessage=(form,msg,type='error')=>{const box=q('[data-form-message]',form);if(!box)return;box.textContent=msg;box.className=`form-message show ${type}`;box.scrollIntoView({block:'nearest',behavior:'smooth'})};
  const setBusy=(form,busy,label='Procesando…')=>{const button=q('button[type="submit"]',form);if(!button)return;if(!button.dataset.originalText)button.dataset.originalText=button.textContent.trim();button.disabled=busy;button.textContent=busy?label:button.dataset.originalText};
  const menu=q('[data-menu-button]'),nav=q('[data-main-nav]');
  menu?.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));menu.textContent=open?'×':'☰'});
  qa('[data-main-nav] a').forEach(a=>a.addEventListener('click',()=>{nav?.classList.remove('open');if(menu){menu.setAttribute('aria-expanded','false');menu.textContent='☰'}}));
  if(location.protocol==='file:')q('[data-dev-badge]')?.classList.add('show');

  const getBase=()=>document.documentElement.dataset.base||'';
  const route=(path)=>getBase()+String(path||'').replace(/^\//,'');
  const safeReturnTo=()=>{const raw=new URLSearchParams(location.search).get('returnTo');if(!raw||raw.includes('://')||raw.startsWith('//'))return null;return route(raw.replace(/^\//,''))};
  const absoluteRoute=(path)=>new URL(route(path),location.href).href;
  const initials=(name='Usuario ARM')=>String(name).trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase()||'AR';
  const partnerLabel={not_requested:'No solicitado',pending:'Pendiente de revisión',under_review:'En revisión',approved:'Aprobado',rejected:'No aprobado',suspended:'Suspendido'};
  const statusLabel={active:'Activa',suspended:'Suspendida',blocked:'Bloqueada'};
  const errorText=(error)=>{
    const m=String(error?.message||'').toLowerCase();
    if(m.includes('invalid login credentials'))return 'El correo o la contraseña no son correctos.';
    if(m.includes('email not confirmed'))return 'Debes confirmar tu correo electrónico antes de iniciar sesión.';
    if(m.includes('user already registered'))return 'Ya existe una cuenta asociada a ese correo.';
    if(m.includes('password'))return 'La contraseña no cumple los requisitos de seguridad configurados.';
    if(m.includes('rate limit')||m.includes('too many'))return 'Se han realizado demasiados intentos. Espera unos minutos y vuelve a intentarlo.';
    if(m.includes('fetch'))return 'No se ha podido conectar con el servicio. Comprueba tu conexión.';
    return error?.message||'Se ha producido un error inesperado.';
  };

  let client=null,session=null,user=null,profile=null;
  async function clientOrMessage(form){
    try{client=client||await window.ARM_SUPABASE.getClient();return client}
    catch(error){const msg=errorText(error);if(form)formMessage(form,msg,'error');else showToast(msg);return null}
  }
  async function loadAuth(){
    const c=await clientOrMessage();if(!c)return;
    const {data,error}=await c.auth.getSession();
    if(error)console.warn('ARM Auth:',error.message);
    session=data?.session||null;user=session?.user||null;
    if(user){
      const result=await c.from('profiles').select('*').eq('id',user.id).maybeSingle();
      if(!result.error)profile=result.data;
    }
    updateUserUI();
  }
  function updateUserUI(){
    const name=profile?.first_name||user?.email?.split('@')[0]||'Usuario';
    const full=`${profile?.first_name||''} ${profile?.last_name||''}`.trim()||name;
    qa('[data-user-name]').forEach(x=>x.textContent=name);
    qa('[data-user-initials]').forEach(x=>x.textContent=initials(full));
    qa('[data-auth-only]').forEach(x=>x.hidden=!session);
    qa('[data-guest-only]').forEach(x=>x.hidden=!!session);
    qa('[data-profile-email]').forEach(x=>x.textContent=user?.email||'—');
    qa('[data-profile-role]').forEach(x=>x.textContent=profile?.professional_role||'Sin completar');
    qa('[data-partner-status]').forEach(x=>x.textContent=partnerLabel[profile?.partner_status]||'No solicitado');
    qa('[data-account-status]').forEach(x=>x.textContent=statusLabel[profile?.account_status]||'Activa');
    qa('[data-account-created]').forEach(x=>x.textContent=profile?.created_at?new Intl.DateTimeFormat('es-ES',{dateStyle:'medium'}).format(new Date(profile.created_at)):'—');
    qa('[data-last-access]').forEach(x=>x.textContent=user?.last_sign_in_at?new Intl.DateTimeFormat('es-ES',{dateStyle:'short',timeStyle:'short'}).format(new Date(user.last_sign_in_at)):'—');
  }
  async function redirectGuards(){
    if(body.hasAttribute('data-requires-auth')&&!session){location.replace(route(`acceso/index.html?returnTo=${encodeURIComponent(body.dataset.authReturn||'cuenta/index.html')}`));return false}
    if(session&&profile?.account_status&&profile.account_status!=='active'){
      await client.auth.signOut();
      location.replace(route('acceso/index.html?notice=account_restricted'));return false;
    }
    if(body.hasAttribute('data-requires-admin')){
      if(!session){location.replace(route(`acceso/index.html?returnTo=${encodeURIComponent('admin/index.html')}`));return false}
      if(profile?.account_role!=='admin'){location.replace(route('cuenta/index.html?notice=admin_required'));return false}
    }
    const slug=body.dataset.applicationSlug;
    if(slug&&session){
      const {data,error}=await client.rpc('can_access_application',{p_slug:slug});
      if(error||data!==true){location.replace(route('aplicaciones/index.html?notice=access_denied'));return false}
      await client.rpc('record_usage_event',{p_application_slug:slug,p_event_type:'app_open',p_metadata:{path:location.pathname}});
    }
    return true;
  }
  function notices(){
    const notice=new URLSearchParams(location.search).get('notice');
    const messages={password_updated:'Contraseña actualizada. Ya puedes iniciar sesión.',account_restricted:'La cuenta no está activa. Contacta con ARM Ingeniería.',admin_required:'No tienes permisos para acceder a administración.',access_denied:'Tu cuenta no tiene acceso a esa herramienta.',email_confirmed:'Correo confirmado correctamente.'};
    if(notice&&messages[notice])showToast(messages[notice]);
  }

  q('[data-login-form]')?.addEventListener('submit',async e=>{
    e.preventDefault();const form=e.currentTarget,c=await clientOrMessage(form);if(!c)return;
    const fd=new FormData(form),email=String(fd.get('email')||'').trim().toLowerCase(),password=String(fd.get('password')||'');
    if(!email||!password){formMessage(form,'Completa el correo y la contraseña.');return}
    setBusy(form,true,'Accediendo…');
    const {data,error}=await c.auth.signInWithPassword({email,password});
    if(error){setBusy(form,false);formMessage(form,errorText(error));return}
    session=data.session;user=data.user;
    const p=await c.from('profiles').select('*').eq('id',user.id).maybeSingle();profile=p.data||null;
    if(profile?.account_status&&profile.account_status!=='active'){await c.auth.signOut();setBusy(form,false);formMessage(form,'La cuenta no está activa. Contacta con ARM Ingeniería.');return}
    location.href=safeReturnTo()||route('cuenta/index.html');
  });

  q('[data-register-form]')?.addEventListener('submit',async e=>{
    e.preventDefault();const form=e.currentTarget,c=await clientOrMessage(form);if(!c)return;
    const fd=new FormData(form),password=String(fd.get('password')||''),confirm=String(fd.get('password_confirm')||'');
    if(!form.checkValidity()){form.reportValidity();formMessage(form,'Revisa los campos obligatorios.');return}
    if(password!==confirm){formMessage(form,'Las contraseñas no coinciden.');return}
    if(password.length<10){formMessage(form,'La contraseña debe tener al menos 10 caracteres.');return}
    const metadata={
      first_name:String(fd.get('first_name')||'').trim(),last_name:String(fd.get('last_name')||'').trim(),
      professional_role:String(fd.get('professional_role')||''),province:String(fd.get('province')||''),country:String(fd.get('country')||'España'),
      partner_interest:fd.get('partner_interest')==='on',marketing_consent:fd.get('marketing_consent')==='on',
      terms_accepted:fd.get('terms_accepted')==='on',privacy_accepted:fd.get('terms_accepted')==='on',legal_version:'2026-08-01'
    };
    setBusy(form,true,'Creando cuenta…');
    const {data,error}=await c.auth.signUp({
      email:String(fd.get('email')||'').trim().toLowerCase(),password,
      options:{data:metadata,emailRedirectTo:absoluteRoute('cuenta/index.html?notice=email_confirmed')}
    });
    if(error){setBusy(form,false);formMessage(form,errorText(error));return}
    if(data.session){location.href=route('cuenta/index.html')}
    else{form.reset();setBusy(form,false);formMessage(form,'Cuenta creada. Revisa tu correo y confirma la dirección para poder iniciar sesión.','success')}
  });

  q('[data-recovery-form]')?.addEventListener('submit',async e=>{
    e.preventDefault();const form=e.currentTarget,c=await clientOrMessage(form);if(!c)return;
    const email=String(new FormData(form).get('email')||'').trim().toLowerCase();
    if(!email){formMessage(form,'Introduce tu correo electrónico.');return}
    setBusy(form,true,'Enviando enlace…');
    const {error}=await c.auth.resetPasswordForEmail(email,{redirectTo:absoluteRoute('actualizar-contrasena/index.html')});
    setBusy(form,false);
    if(error){formMessage(form,errorText(error));return}
    form.reset();formMessage(form,'Si existe una cuenta asociada, recibirás un enlace para cambiar la contraseña.','success');
  });

  q('[data-update-password-form]')?.addEventListener('submit',async e=>{
    e.preventDefault();const form=e.currentTarget,c=await clientOrMessage(form);if(!c)return;
    const fd=new FormData(form),password=String(fd.get('password')||''),confirm=String(fd.get('password_confirm')||'');
    if(password!==confirm){formMessage(form,'Las contraseñas no coinciden.');return}
    if(password.length<10){formMessage(form,'La contraseña debe tener al menos 10 caracteres.');return}
    const {data:{session:recoverySession}}=await c.auth.getSession();
    if(!recoverySession){formMessage(form,'El enlace no es válido o ha caducado. Solicita uno nuevo.');return}
    setBusy(form,true,'Actualizando…');
    const {error}=await c.auth.updateUser({password});
    if(error){setBusy(form,false);formMessage(form,errorText(error));return}
    await c.auth.signOut();location.href=route('acceso/index.html?notice=password_updated');
  });

  q('[data-profile-form]')?.addEventListener('submit',async e=>{
    e.preventDefault();const form=e.currentTarget,c=await clientOrMessage(form);if(!c||!user)return;
    const fd=new FormData(form);setBusy(form,true,'Guardando…');
    const {data,error}=await c.rpc('update_my_profile',{
      p_first_name:String(fd.get('first_name')||'').trim(),p_last_name:String(fd.get('last_name')||'').trim(),
      p_professional_role:String(fd.get('professional_role')||''),p_country:String(fd.get('country')||''),p_province:String(fd.get('province')||'')
    });
    setBusy(form,false);
    if(error){formMessage(form,errorText(error));return}
    profile=Array.isArray(data)?data[0]:data;updateUserUI();formMessage(form,'Perfil actualizado correctamente.','success');
  });

  qa('[data-logout]').forEach(b=>b.addEventListener('click',async e=>{e.preventDefault();const c=await clientOrMessage();if(c)await c.auth.signOut();location.href=route('index.html')}));
  qa('[data-tool-open]').forEach(a=>a.addEventListener('click',async e=>{
    e.preventDefault();const dest=a.dataset.returnTo||a.getAttribute('href'),slug=a.dataset.application||'arm-cad';
    const c=await clientOrMessage();if(!c)return;
    const {data:{session:s}}=await c.auth.getSession();
    if(!s){location.href=route(`acceso/index.html?returnTo=${encodeURIComponent(dest)}`);return}
    const {data,error}=await c.rpc('can_access_application',{p_slug:slug});
    if(error||data!==true){showToast('Tu cuenta no tiene acceso a esta herramienta.');return}
    location.href=route(dest);
  }));

  const modal=q('[data-partner-modal]');qa('[data-partner-info]').forEach(b=>b.addEventListener('click',()=>{modal?.classList.add('open');modal?.setAttribute('aria-hidden','false');document.body.style.overflow='hidden'}));qa('[data-modal-close]').forEach(b=>b.addEventListener('click',closeModal));modal?.addEventListener('click',e=>{if(e.target===modal)closeModal()});document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});
  function closeModal(){modal?.classList.remove('open');modal?.setAttribute('aria-hidden','true');document.body.style.overflow=''}

  async function fillAccount(){
    const form=q('[data-profile-form]');if(!form||!profile)return;
    ['first_name','last_name','professional_role','country','province'].forEach(name=>{const input=form.elements[name];if(input)input.value=profile[name]||''});
    const c=await clientOrMessage();if(!c)return;
    const {count}=await c.from('applications').select('*',{count:'exact',head:true}).eq('status','published');
    qa('[data-tools-count]').forEach(x=>x.textContent=String(count??0));
  }
  async function fillAdmin(){
    if(!body.hasAttribute('data-requires-admin')||profile?.account_role!=='admin')return;
    const c=await clientOrMessage();if(!c)return;
    const metrics=await c.rpc('admin_dashboard_metrics');
    if(!metrics.error){const m=metrics.data||{};Object.entries({total_users:m.total_users,active_today:m.active_today,active_30d:m.active_30d,active_365d:m.active_365d,app_opens_30d:m.app_opens_30d,pending_partners:m.pending_partners}).forEach(([key,val])=>qa(`[data-metric="${key}"]`).forEach(x=>x.textContent=String(val??0)))}
    const users=await c.rpc('admin_list_users',{p_limit:100,p_offset:0,p_search:null});
    const tbody=q('[data-admin-users]');if(tbody&&!users.error){tbody.innerHTML='';(users.data||[]).forEach(row=>{const tr=document.createElement('tr');tr.innerHTML=`<td><strong>${escapeHtml(`${row.first_name||''} ${row.last_name||''}`.trim()||'Sin nombre')}</strong><small>${escapeHtml(row.email||'')}</small></td><td>${escapeHtml(row.professional_role||'—')}</td><td><span class="tag">${escapeHtml(statusLabel[row.account_status]||row.account_status)}</span></td><td>${row.last_sign_in_at?new Intl.DateTimeFormat('es-ES',{dateStyle:'short'}).format(new Date(row.last_sign_in_at)):'—'}</td><td>${Number(row.application_count||0)}</td><td>${escapeHtml(partnerLabel[row.partner_status]||row.partner_status)}</td><td>${escapeHtml(row.account_role)}</td>`;tbody.appendChild(tr)});if(!tbody.children.length)tbody.innerHTML='<tr><td colspan="7"><div class="empty-state">Todavía no hay usuarios.</div></td></tr>'}
    const partners=await c.rpc('admin_list_partner_applications',{p_limit:50,p_offset:0});
    const partnerBody=q('[data-admin-partners]');if(partnerBody&&!partners.error){partnerBody.innerHTML='';(partners.data||[]).forEach(row=>{const tr=document.createElement('tr');tr.innerHTML=`<td><strong>${escapeHtml(`${row.first_name||''} ${row.last_name||''}`.trim()||'Sin nombre')}</strong><small>${escapeHtml(row.email||'')}</small></td><td>${escapeHtml(row.professional_role||'—')}</td><td>${escapeHtml(row.province||'—')}</td><td>${escapeHtml(partnerLabel[row.status]||row.status)}</td><td>${new Intl.DateTimeFormat('es-ES',{dateStyle:'short'}).format(new Date(row.submitted_at))}</td>`;partnerBody.appendChild(tr)});if(!partnerBody.children.length)partnerBody.innerHTML='<tr><td colspan="5"><div class="empty-state">No hay solicitudes pendientes.</div></td></tr>'}
  }
  const escapeHtml=(value)=>String(value??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  q('[data-admin-refresh]')?.addEventListener('click',()=>location.reload());

  (async()=>{
    notices();await loadAuth();
    if(!(await redirectGuards()))return;
    updateUserUI();await fillAccount();await fillAdmin();
    const c=client;
    c?.auth.onAuthStateChange((_event,nextSession)=>{session=nextSession;user=nextSession?.user||null;if(!nextSession)profile=null;updateUserUI()});
  })();
})();
