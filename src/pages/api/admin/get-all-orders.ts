import type { APIRoute } from 'astro';
import { supabaseAdmin, supabase } from '../../../lib/supabase';

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');
    
    if (!token) {
        return new Response(JSON.stringify({ error: 'Nessun token di accesso fornito' }), { status: 401 });
    }
    
    // Verificar que el token pertenezca al admin
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user || user.email !== 'admin@pachamama.com') {
      return new Response(JSON.stringify({ error: 'Accesso non autorizzato' }), { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from('gift_cards')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    return new Response(JSON.stringify(data), { status: 200 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};
