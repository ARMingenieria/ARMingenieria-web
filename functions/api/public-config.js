export async function onRequestGet({ env }) {
  const supabaseUrl = env.PUBLIC_SUPABASE_URL || '';
  const supabasePublishableKey = env.PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
  if (!supabaseUrl || !supabasePublishableKey) {
    return Response.json({ configured: false }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
  return Response.json(
    { supabaseUrl, supabasePublishableKey, siteUrl: env.PUBLIC_SITE_URL || 'https://arm-ingenieria.com' },
    { headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } }
  );
}
