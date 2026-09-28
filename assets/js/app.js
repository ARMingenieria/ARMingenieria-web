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
    qa('[data-auth-only]').forEach(x=>x.hidden=!session);qa('[data-admin-only]').forEach(x=>x.hidden=profile?.account_role!=='admin');
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
  // Apertura de ARM CAD con transferencia de sesión entre orígenes mediante postMessage.
  // Los tokens nunca se colocan en la URL ni se almacenan en ARM WEB fuera de Supabase.
  const CAD_ORIGIN='https://arm-cad.alejandro-c23.workers.dev';
  const CAD_HANDOFF='ARM_CAD_SESSION_V1';
  qa('[data-tool-open]').forEach(a=>a.addEventListener('click',async e=>{
    e.preventDefault();
    const slug=a.dataset.application||'arm-cad';
    if(slug!=='arm-cad'){location.href=route(a.dataset.returnTo||a.getAttribute('href'));return}
    // Abrir dentro del gesto de usuario: evita el bloqueo de ventanas en Android/iOS.
    const cad=window.open(CAD_ORIGIN+'/','_blank');
    if(!cad){showToast('Permite las ventanas emergentes para abrir ARM CAD.');return}
    const c=await clientOrMessage();
    if(!c){cad.close();return}
    const {data:{session:s},error:sessionError}=await c.auth.getSession();
    if(sessionError||!s){cad.close();location.href=route('acceso/index.html?returnTo=aplicaciones/index.html');return}
    const {data:allowed,error}=await c.rpc('can_access_application',{p_slug:slug});
    if(error||allowed!==true){cad.close();showToast('Tu cuenta no tiene acceso a esta herramienta.');return}
    let completed=false;
    const handler=async event=>{
      if(event.origin!==CAD_ORIGIN||event.source!==cad||event.data?.type!=='ARM_CAD_READY_V1'||completed)return;
      completed=true;
      window.removeEventListener('message',handler);
      const {data:{session:current}}=await c.auth.getSession();
      if(!current){showToast('La sesión ha caducado. Inicia sesión de nuevo.');return}
      cad.postMessage({type:CAD_HANDOFF,access_token:current.access_token,refresh_token:current.refresh_token},CAD_ORIGIN);
    };
    window.addEventListener('message',handler);
    // La ventana CAD anuncia que está lista; no se transmite nada a otros orígenes.
    setTimeout(()=>window.removeEventListener('message',handler),60000);
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

  let selectedUpgradePlan='yearly';
  async function fillLicense(){
    if(!q('[data-armcad-tier]')||!user)return; const c=await clientOrMessage();if(!c)return;
    const {data,error}=await c.rpc('my_application_license',{p_slug:'arm-cad'}); if(error){q('[data-armcad-license-text]').textContent='No se ha podido consultar la licencia.';return}
    const lic=Array.isArray(data)?data[0]:data; const pro=Boolean(lic?.is_pro);
    q('[data-armcad-tier]').textContent=pro?'PRO':'FREE';
    q('[data-armcad-license-text]').textContent=pro?`PRO activo${lic.expires_at?' hasta '+new Intl.DateTimeFormat('es-ES',{dateStyle:'long'}).format(new Date(lic.expires_at)):''}.`:'ARM CAD Free activo. Puedes pasar a PRO cuando lo necesites.';
    qa('[data-upgrade-plan]').forEach(b=>b.hidden=pro);
  }
  qa('[data-upgrade-plan]').forEach(b=>b.addEventListener('click',()=>{selectedUpgradePlan=b.dataset.upgradePlan||'yearly';const box=q('[data-payment-box]');if(box){box.hidden=false;box.scrollIntoView({behavior:'smooth',block:'nearest'})}}));
  q('[data-payment-submit]')?.addEventListener('click',async()=>{
    const c=await clientOrMessage();if(!c||!user)return; const btn=q('[data-payment-submit]'),msg=q('[data-payment-message]');btn.disabled=true;msg.className='form-message';msg.textContent='Registrando solicitud…';
    const method=q('[data-payment-method]')?.value||'bizum'; const {data,error}=await c.rpc('create_payment_request',{p_slug:'arm-cad',p_period:selectedUpgradePlan,p_method:method});
    if(error){btn.disabled=false;msg.className='form-message show error';msg.textContent=errorText(error);return}
    const pr=Array.isArray(data)?data[0]:data; msg.className='form-message show success';msg.textContent=`Solicitud ${pr.reference} registrada. ARM validará el pago antes de activar PRO.`;
    try{const nr=await fetch('https://arm-pagos.alejandro-c23.workers.dev/api/payment-request-notify',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${session.access_token}`},body:JSON.stringify({paymentRequestId:pr.id})});const nd=await nr.json().catch(()=>({}));if(!nr.ok)throw new Error(nd.error||'No se pudo enviar el aviso de pago');}catch(e){msg.className='form-message show error';msg.textContent=`Solicitud ${pr.reference} registrada, pero falló el aviso por correo: ${e.message}.`;btn.disabled=false;return}
    btn.disabled=false;
  });

  let selectedHvacPlan='yearly';
  async function fillHvacLicense(){
    if(!q('[data-hvac-tier]')||!user)return;
    const c=await clientOrMessage();if(!c)return;
    const tier=q('[data-hvac-tier]'),txt=q('[data-hvac-license-text]');
    const {data,error}=await c.rpc('my_application_license',{p_slug:'arm-hvac-ducts'});
    if(error){txt.textContent='No se ha podido consultar la licencia de ARM HVAC DUCTS.';return}
    const lic=Array.isArray(data)?data[0]:data,pro=Boolean(lic?.is_pro);
    tier.textContent=pro?'PRO':'FREE';
    txt.textContent=pro?`PRO activo${lic?.expires_at?' hasta '+new Intl.DateTimeFormat('es-ES',{dateStyle:'long'}).format(new Date(lic.expires_at)):''}.`:'ARM HVAC DUCTS Free activo. PRO desbloquea DXF, Word/Docs y Excel.';
    qa('[data-hvac-plan]').forEach(b=>b.hidden=pro);
    const box=q('[data-hvac-payment]');if(box&&pro)box.hidden=true;
  }
  qa('[data-hvac-plan]').forEach(b=>b.addEventListener('click',()=>{
    selectedHvacPlan=b.dataset.hvacPlan||'yearly';
    const box=q('[data-hvac-payment]');if(box){box.hidden=false;box.scrollIntoView({behavior:'smooth',block:'nearest'})}
    const amount=q('[data-hvac-payment-amount]');if(amount)amount.textContent=selectedHvacPlan==='yearly'?'39,99 €':'5,99 €';
  }));
  q('[data-hvac-payment-submit]')?.addEventListener('click',async()=>{
    const c=await clientOrMessage();if(!c||!user)return;
    const btn=q('[data-hvac-payment-submit]'),msg=q('[data-hvac-payment-message]');btn.disabled=true;msg.className='form-message';msg.textContent='Registrando solicitud…';
    const method=q('[data-hvac-payment-method]')?.value||'bizum';
    const {data,error}=await c.rpc('create_payment_request',{p_slug:'arm-hvac-ducts',p_period:selectedHvacPlan,p_method:method});
    if(error){btn.disabled=false;msg.className='form-message show error';msg.textContent=errorText(error);return}
    const pr=Array.isArray(data)?data[0]:data;
    msg.className='form-message show success';msg.textContent=`Solicitud ${pr.reference} registrada. Usa esa referencia como concepto del pago. ARM validará el ingreso antes de activar PRO.`;
    try{const nr=await fetch('https://arm-pagos.alejandro-c23.workers.dev/api/payment-request-notify',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${session.access_token}`},body:JSON.stringify({paymentRequestId:pr.id})});const nd=await nr.json().catch(()=>({}));if(!nr.ok)throw new Error(nd.error||'No se pudo enviar el aviso de pago');}catch(e){msg.className='form-message show error';msg.textContent=`Solicitud ${pr.reference} registrada, pero falló el aviso por correo: ${e.message}.`;btn.disabled=false;return}
    btn.disabled=false;
  });

  async function fillAdmin(){
    if(!body.hasAttribute('data-requires-admin')||profile?.account_role!=='admin')return;
    const c=await clientOrMessage();if(!c)return;
    const metrics=await c.rpc('admin_dashboard_metrics');
    if(!metrics.error){const m=metrics.data||{};Object.entries({total_users:m.total_users,active_today:m.active_today,active_30d:m.active_30d,active_365d:m.active_365d,app_opens_30d:m.app_opens_30d,pending_partners:m.pending_partners}).forEach(([key,val])=>qa(`[data-metric="${key}"]`).forEach(x=>x.textContent=String(val??0)))}
    const users=await c.rpc('admin_list_users',{p_limit:100,p_offset:0,p_search:null});
    // Licencias CAD y HVAC: ambas se gestionan de forma independiente por application_id.
    const [apps,licenses,accesses]=await Promise.all([
      c.from('applications').select('id,slug,name').in('slug',['arm-cad','arm-hvac-ducts']),
      c.from('user_licenses').select('user_id,application_id,tier,billing_period,starts_at,expires_at'),
      c.from('user_application_access').select('user_id,application_id,status,expires_at')
    ]);
    if(apps.error||licenses.error||accesses.error){showToast('No se pudo consultar el estado de licencias. Comprueba permisos de administrador.');}
    const appBySlug=new Map((apps.data||[]).map(x=>[x.slug,x]));
    const fmtDate=(v)=>v?new Intl.DateTimeFormat('es-ES',{day:'2-digit',month:'2-digit',year:'numeric',timeZone:'Europe/Madrid'}).format(new Date(v)):'—';
    const licenseCell=(id,slug)=>{
      const appId=appBySlug.get(slug)?.id;
      if(!appId)return '<div class="arm-license-status"><strong>Aplicación no registrada</strong></div>';
      const lic=(licenses.data||[]).find(x=>x.user_id===id&&x.application_id===appId);
      const access=(accesses.data||[]).find(x=>x.user_id===id&&x.application_id===appId);
      const blocked=access?.status==='blocked';
      const expired=lic?.tier==='pro'&&lic?.expires_at&&new Date(lic.expires_at)<=new Date();
      const pro=lic?.tier==='pro'&&!expired;
      const tier=blocked?'BLOQUEADO':pro?'PRO':expired?'PRO vencido':'FREE';
      const period=lic?.billing_period==='yearly'?'Anual':lic?.billing_period==='monthly'?'Mensual':lic?.tier==='pro'?'Sin modalidad registrada':'—';
      const end=lic?.expires_at?fmtDate(lic.expires_at):'Sin vencimiento';
      return `<div class="arm-license-status"><strong class="arm-tier ${pro?'arm-tier-pro':'arm-tier-free'}">${tier}</strong><span>${blocked?'Acceso bloqueado':'Acceso permitido'}</span><span>Modalidad: ${period}</span><span>Vencimiento: ${lic?.tier==='pro'?end:'—'}</span></div>`;
    };
    const actions=(row,slug)=>`<div class="arm-admin-actions"><button class="btn btn-outline btn-small" data-app-action="allow" data-app-slug="${slug}" data-user-id="${row.id}">Permitir</button> <button class="btn btn-outline btn-small" data-app-action="block" data-app-slug="${slug}" data-user-id="${row.id}">Bloquear</button> <button class="btn btn-outline btn-small" data-app-action="free" data-app-slug="${slug}" data-user-id="${row.id}">FREE</button> <button class="btn btn-primary btn-small" data-app-action="pro" data-app-slug="${slug}" data-user-id="${row.id}">PRO…</button></div>`;
    const tbody=q('[data-admin-users]');if(tbody&&!users.error){tbody.innerHTML='';(users.data||[]).forEach(row=>{const tr=document.createElement('tr');tr.innerHTML=`<td><strong>${escapeHtml(`${row.first_name||''} ${row.last_name||''}`.trim()||'Sin nombre')}</strong><small>${escapeHtml(row.email||'')}</small></td><td>${escapeHtml(row.professional_role||'—')}</td><td><span class="tag">${escapeHtml(statusLabel[row.account_status]||row.account_status)}</span></td><td>${row.last_sign_in_at?new Intl.DateTimeFormat('es-ES',{dateStyle:'short'}).format(new Date(row.last_sign_in_at)):'—'}</td><td>${Number(row.application_count||0)}</td><td>${escapeHtml(partnerLabel[row.partner_status]||row.partner_status)}</td><td>${escapeHtml(row.account_role)}</td><td>${licenseCell(row.id,'arm-cad')}${actions(row,'arm-cad')}</td><td>${licenseCell(row.id,'arm-hvac-ducts')}${actions(row,'arm-hvac-ducts')}</td>`;tbody.appendChild(tr)});if(!tbody.children.length)tbody.innerHTML='<tr><td colspan="9"><div class="empty-state">Todavía no hay usuarios.</div></td></tr>'}
    qa('[data-app-action]',tbody).forEach(btn=>btn.addEventListener('click',async()=>{
      const action=btn.dataset.appAction,id=btn.dataset.userId,slug=btn.dataset.appSlug;
      let period=null;
      if(action==='pro'){
        const isHvac=slug==='arm-hvac-ducts';
        const choice=prompt(`Modalidad PRO ${isHvac?'HVAC':'CAD'}: escribe 1 para MENSUAL (${isHvac?'5,99':'7,99'} €) o 2 para ANUAL (${isHvac?'39,99':'49,99'} €).`,'2');
        if(choice===null)return;
        if(!['1','2'].includes(choice.trim())){showToast('Elige 1 o 2.');return}
        period=choice.trim()==='1'?'monthly':'yearly';
        const preview=new Date(); if(period==='monthly')preview.setMonth(preview.getMonth()+1);else preview.setFullYear(preview.getFullYear()+1);
        if(!confirm(`Se activará ${isHvac?'ARM HVAC DUCTS':'ARM CAD'} PRO ${period==='monthly'?'MENSUAL':'ANUAL'} hasta aproximadamente el ${fmtDate(preview)}. ¿Continuar?`))return;
      }
      if(!confirm(`¿Confirmar ${action.toUpperCase()} para ${slug==='arm-hvac-ducts'?'ARM HVAC DUCTS':'ARM CAD'}?`))return;
      btn.disabled=true;
      const {error}=await c.rpc('admin_manage_application_user',{p_user_id:id,p_slug:slug,p_action:action,p_period:period});
      if(error){showToast('No se pudo actualizar: '+errorText(error));btn.disabled=false;return}
      showToast('Licencia actualizada.');await fillAdmin();
    }));
    const payments=await c.rpc('admin_list_payment_requests',{p_status:'pending',p_limit:100});
    const payBody=q('[data-admin-payments]');if(payBody&&!payments.error){payBody.innerHTML='';(payments.data||[]).forEach(row=>{const tr=document.createElement('tr');tr.innerHTML=`<td><strong>${escapeHtml(row.reference)}</strong></td><td><strong>${escapeHtml(row.customer_name||'Sin nombre')}</strong><small>${escapeHtml(row.email||'')}</small></td><td>${escapeHtml(row.application_name)}</td><td>${row.billing_period==='yearly'?'Anual':'Mensual'}</td><td>${(Number(row.amount_cents)/100).toLocaleString('es-ES',{style:'currency',currency:'EUR'})}</td><td>${row.method==='bizum'?'Bizum':'Transferencia'}</td><td>${new Intl.DateTimeFormat('es-ES',{dateStyle:'short',timeStyle:'short'}).format(new Date(row.requested_at))}</td><td><button class="btn btn-primary btn-small" data-payment-review="${row.id}" data-approve="true">Validar</button> <button class="btn btn-outline btn-small" data-payment-review="${row.id}" data-approve="false">Rechazar</button></td>`;payBody.appendChild(tr)});if(!payBody.children.length)payBody.innerHTML='<tr><td colspan="8"><div class="empty-state">No hay pagos pendientes.</div></td></tr>';qa('[data-payment-review]',payBody).forEach(btn=>btn.addEventListener('click',async()=>{btn.disabled=true;const {error}=await c.rpc('admin_review_payment_request',{p_request_id:btn.dataset.paymentReview,p_approve:btn.dataset.approve==='true',p_notes:null});if(error){showToast(errorText(error));btn.disabled=false;return}showToast(btn.dataset.approve==='true'?'Pago validado y PRO activado.':'Solicitud rechazada.');await fillAdmin()}))}
    const partners=await c.rpc('admin_list_partner_applications',{p_limit:50,p_offset:0});
    const partnerBody=q('[data-admin-partners]');if(partnerBody&&!partners.error){partnerBody.innerHTML='';(partners.data||[]).forEach(row=>{const tr=document.createElement('tr');tr.innerHTML=`<td><strong>${escapeHtml(`${row.first_name||''} ${row.last_name||''}`.trim()||'Sin nombre')}</strong><small>${escapeHtml(row.email||'')}</small></td><td>${escapeHtml(row.professional_role||'—')}</td><td>${escapeHtml(row.province||'—')}</td><td>${escapeHtml(partnerLabel[row.status]||row.status)}</td><td>${new Intl.DateTimeFormat('es-ES',{dateStyle:'short'}).format(new Date(row.submitted_at))}</td>`;partnerBody.appendChild(tr)});if(!partnerBody.children.length)partnerBody.innerHTML='<tr><td colspan="5"><div class="empty-state">No hay solicitudes pendientes.</div></td></tr>'}
  }
  const escapeHtml=(value)=>String(value??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  q('[data-admin-refresh]')?.addEventListener('click',()=>location.reload());

  (async()=>{
    notices();await loadAuth();
    if(!(await redirectGuards()))return;
    updateUserUI();await fillAccount();await fillLicense();await fillHvacLicense();await fillAdmin();
    const c=client;
    c?.auth.onAuthStateChange((_event,nextSession)=>{session=nextSession;user=nextSession?.user||null;if(!nextSession)profile=null;updateUserUI()});
  })();
})();

/* ARM WEB · Cuenta Empresa BOSS · 2026-09-28 */
(()=>{
 const W=window.ARM_PAGOS_WORKER||'https://arm-pagos.alejandro-c23.workers.dev';
 const form=document.querySelector('[data-company-setup]'); if(!form)return;
 const msg=document.querySelector('[data-company-message]'),list=document.querySelector('[data-company-sessions]');
 async function bossToken(){try{const c=await window.ARM_SUPABASE?.getClient?.();if(!c)return '';const {data}=await c.auth.getSession();return data?.session?.access_token||''}catch(_){return ''}}
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 async function load(){const t=await bossToken();if(!t){list.innerHTML='<p class="arm-muted">Inicia sesión como BOSS para gestionar sesiones.</p>';return}try{const r=await fetch(W+'/company/sessions',{headers:{Authorization:'Bearer '+t}}),d=await r.json();if(!r.ok)throw new Error(d.error||'Error');list.innerHTML=(d.sessions||[]).map(s=>`<div class="arm-session"><span><strong>${esc(s.device_label||'Dispositivo')}</strong><br><small>${s.product_slug==='cad'?'ARM CAD':'ARM HVAC DUCTS'} · ${new Date(s.last_seen_at).toLocaleString('es-ES')}</small></span><button class="btn btn-outline btn-small" data-revoke="${esc(s.id)}">Cerrar</button></div>`).join('')||'<p class="arm-muted">No hay sesiones USER activas.</p>';list.querySelectorAll('[data-revoke]').forEach(b=>b.onclick=async()=>{await fetch(W+'/company/sessions/'+b.dataset.revoke+'/revoke',{method:'POST',headers:{Authorization:'Bearer '+t}});load()})}catch(e){list.innerHTML='<p class="form-message">'+esc(e.message)+'</p>'}}
 form.addEventListener('submit',async e=>{e.preventDefault();const t=await bossToken();if(!t){msg.textContent='Sesión BOSS no disponible.';return}const fd=new FormData(form);msg.textContent='Guardando…';try{const r=await fetch(W+'/company/setup',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+t},body:JSON.stringify({companyName:fd.get('companyName'),userPassword:fd.get('userPassword')})}),d=await r.json();if(!r.ok)throw new Error(d.error||'No se pudo guardar');msg.textContent='Acceso USER guardado correctamente.';form.elements.userPassword.value='';load()}catch(err){msg.textContent=err.message}});
 load();
})();
