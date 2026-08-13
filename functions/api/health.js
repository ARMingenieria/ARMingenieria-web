export async function onRequestGet({ env }) {
  return Response.json({
    ok: true,
    service: 'ARM Platform',
    version: '5.3',
    supabaseConfigured: Boolean(env.PUBLIC_SUPABASE_URL && env.PUBLIC_SUPABASE_PUBLISHABLE_KEY),
    time: new Date().toISOString()
  }, { headers: { 'Cache-Control': 'no-store' } });
}
