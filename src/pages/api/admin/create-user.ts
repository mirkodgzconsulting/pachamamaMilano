import type { APIRoute } from 'astro';
import { supabaseAdmin, supabase } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { token, email, password } = body;
    
    if (!token || !email || !password) {
        return new Response(JSON.stringify({ error: 'Dati mancanti' }), { status: 400 });
    }
    
    // Verificar que el token pertenezca a un Admin (Master o Team)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    const isMaster = user?.email === 'admin@pachamama.com';
    // isTeam means they are already an admin
    const isTeam = user?.user_metadata?.role === 'admin';

    if (authError || !user || (!isMaster && !isTeam)) {
      return new Response(JSON.stringify({ error: 'Accesso non autorizzato per creare utenti' }), { status: 401 });
    }

    // Usar supabaseAdmin.auth.admin.createUser para crear sin necesidad de configuración extra de correo
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: email.trim().toLowerCase(),
        password: password,
        email_confirm: true,
        user_metadata: { role: 'admin' }
    });

    if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    }
    
    return new Response(JSON.stringify({ success: true, user: data.user }), { status: 200 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};
