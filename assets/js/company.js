(()=>{
'use strict';
const W=window.ARM_PAGOS_WORKER||'https://arm-pagos.alejandro-c23.workers.dev';
const q=(s,r=document)=>r.querySelector(s);
const form=q('[data-company-user-login]');
if(form) form.addEventListener('submit',async e=>{e.preventDefault();const m=q('[data-company-user-message]');const fd=new FormData(form);m.textContent='Comprobando acceso…';try{const r=await fetch(W+'/company/user-login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:fd.get('email'),password:fd.get('password'),productSlug:fd.get('productSlug'),deviceLabel:navigator.platform||'Navegador'})});const d=await r.json();if(!r.ok)throw new Error(d.error||'No se pudo iniciar sesión');sessionStorage.setItem('arm_company_user_token',d.token);sessionStorage.setItem('arm_company_product',d.productSlug);sessionStorage.setItem('arm_company_name',d.companyName||'');const url=d.productSlug==='cad'?(window.ARM_PRODUCTS?.cad?.url):window.ARM_PRODUCTS?.hvac_ducts?.url;m.textContent='Acceso correcto. Abriendo '+d.productName+'…';location.href=d.productSlug==='hvac_ducts'?(url+'#company_token='+encodeURIComponent(d.token)):url;}catch(err){m.textContent=err.message;}});
const token=sessionStorage.getItem('arm_company_user_token');
if(token){const beat=()=>fetch(W+'/company/heartbeat',{method:'POST',headers:{Authorization:'Bearer '+token}}).then(async r=>{if(!r.ok){sessionStorage.removeItem('arm_company_user_token');sessionStorage.removeItem('arm_company_product');}}).catch(()=>{});beat();setInterval(beat,180000);}
})();
