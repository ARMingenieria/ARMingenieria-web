export async function onRequestPost({ request, env }) {
  try {
    const auth = request.headers.get('Authorization') || '';
    if (!auth.startsWith('Bearer ')) return Response.json({ ok:false,error:'authentication required' },{status:401});
    const { paymentRequestId } = await request.json();
    if (!paymentRequestId) return Response.json({ok:false,error:'paymentRequestId required'},{status:400});
    if (!env.PUBLIC_SUPABASE_URL || !env.PUBLIC_SUPABASE_PUBLISHABLE_KEY) return Response.json({ok:false,error:'Supabase not configured'},{status:503});
    const token=auth.slice(7);
    const userRes=await fetch(`${env.PUBLIC_SUPABASE_URL}/auth/v1/user`,{headers:{apikey:env.PUBLIC_SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${token}`}});
    if(!userRes.ok) return Response.json({ok:false,error:'invalid session'},{status:401});
    const user=await userRes.json();
    const prRes=await fetch(`${env.PUBLIC_SUPABASE_URL}/rest/v1/payment_requests?id=eq.${encodeURIComponent(paymentRequestId)}&user_id=eq.${encodeURIComponent(user.id)}&select=reference,billing_period,amount_cents,method,status,requested_at,applications(name)`,{headers:{apikey:env.PUBLIC_SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${token}`,Accept:'application/json'}});
    const rows=prRes.ok?await prRes.json():[]; const pr=rows[0]; if(!pr) return Response.json({ok:false,error:'request unavailable'},{status:404});
    if(!env.RESEND_API_KEY || !env.ARM_ADMIN_EMAIL || !env.ARM_FROM_EMAIL) return Response.json({ok:true,emailSent:false,reason:'email not configured'});
    const profileRes=await fetch(`${env.PUBLIC_SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=first_name,last_name`,{headers:{apikey:env.PUBLIC_SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${token}`,Accept:'application/json'}}); const profiles=profileRes.ok?await profileRes.json():[]; const p=profiles[0]||{};
    const amount=(pr.amount_cents/100).toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2});
    const html=`<h2>Nueva solicitud de activación ARM</h2><p><strong>Cliente:</strong> ${esc(`${p.first_name||''} ${p.last_name||''}`.trim()||'Sin nombre')}</p><p><strong>Usuario:</strong> ${esc(user.email||'')}</p><p><strong>Producto:</strong> ARM CAD PRO</p><p><strong>Plan:</strong> ${pr.billing_period==='yearly'?'Anual':'Mensual'} — ${amount} €</p><p><strong>Método:</strong> ${pr.method==='bizum'?'Bizum':'Transferencia'}</p><p><strong>Referencia:</strong> ${esc(pr.reference)}</p><p><strong>Estado:</strong> Pendiente de validación</p><p>Accede al panel de administración ARM para comprobar el ingreso y validar la activación.</p>`;
    const mail=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:env.ARM_FROM_EMAIL,to:[env.ARM_ADMIN_EMAIL],subject:`Pago pendiente ${pr.reference} · ARM CAD PRO`,html})});
    return Response.json({ok:true,emailSent:mail.ok},{status:mail.ok?200:502});
  } catch(e){ return Response.json({ok:false,error:'unexpected error'},{status:500}); }
}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
