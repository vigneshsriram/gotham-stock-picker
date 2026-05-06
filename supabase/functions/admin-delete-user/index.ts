import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL')!;

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response('Unauthorized', { status: 401 });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  // Verify the caller is the admin
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user } } = await callerClient.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) {
    return new Response('Forbidden', { status: 403 });
  }

  const { userId } = await req.json();
  if (!userId) return new Response('Missing userId', { status: 400 });

  const adminClient = createClient(supabaseUrl, serviceKey);
  const { error } = await adminClient.auth.admin.deleteUser(userId);
  if (error) return new Response(error.message, { status: 500 });

  return new Response('ok', { status: 200 });
});
