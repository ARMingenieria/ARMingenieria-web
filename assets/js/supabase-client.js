(()=>{
  const STATE={client:null,config:null,promise:null};
  const valid=(config)=>Boolean(
    config &&
    /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(String(config.supabaseUrl||'').trim()) &&
    /^(sb_publishable_[A-Za-z0-9_-]+|eyJ[A-Za-z0-9._-]+)$/.test(String(config.supabasePublishableKey||'').trim())
  );
  async function fetchRuntimeConfig(){
    if(location.protocol==='http:'||location.protocol==='https:'){
      try{
        const response=await fetch('/api/public-config',{headers:{Accept:'application/json'},cache:'no-store'});
        if(response.ok){
          const data=await response.json();
          if(valid(data)) return data;
        }
      }catch(_error){}
    }
    return window.ARM_CONFIG||{};
  }
  async function getConfig(){
    if(STATE.config) return STATE.config;
    STATE.config=await fetchRuntimeConfig();
    return STATE.config;
  }
  async function getClient(){
    if(STATE.client) return STATE.client;
    if(STATE.promise) return STATE.promise;
    STATE.promise=(async()=>{
      if(!window.supabase?.createClient) throw new Error('No se ha podido cargar la librería de Supabase.');
      const config=await getConfig();
      if(!valid(config)) throw new Error('Supabase todavía no está configurado. Revisa /api/public-config o assets/js/config.js.');
      STATE.client=window.supabase.createClient(config.supabaseUrl,config.supabasePublishableKey,{
        auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true},
        global:{headers:{'X-Client-Info':'arm-platform-web/5.3'}}
      });
      return STATE.client;
    })();
    try{return await STATE.promise}finally{STATE.promise=null}
  }
  window.ARM_SUPABASE=Object.freeze({getClient,getConfig,isConfigured:async()=>valid(await getConfig())});
})();
