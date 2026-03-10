import type { APIRoute } from 'astro';
import { supabaseAdmin, supabase } from '../../../lib/supabase';

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');
    
    if (!token) {
        return new Response(JSON.stringify({ error: 'Nessun token' }), { status: 401 });
    }
    
    // Verify auth
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    const isMaster = user?.email === 'admin@pachamama.com';
    const isTeam = user?.user_metadata?.role === 'admin';

    if (authError || !user || (!isMaster && !isTeam)) {
      return new Response(JSON.stringify({ error: 'Non autorizzato' }), { status: 401 });
    }

    // Fetch all users
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) throw error;
    
    // Filter only those who are admins 
    const adminUsers = data.users.filter((u: any) => u.email === 'admin@pachamama.com' || u.user_metadata?.role === 'admin');

    // Return safely (exclude sensitive data)
    const safeUsers = adminUsers.map((u: any) => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        isMaster: u.email === 'admin@pachamama.com'
    }));

    return new Response(JSON.stringify(safeUsers), { status: 200 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};
