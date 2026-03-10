import type { APIRoute } from 'astro';
import { supabaseAdmin, supabase } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { token, orderId, status, gift_card_url } = body;
    
    if (!token || !orderId) {
        return new Response(JSON.stringify({ error: 'Dati mancanti' }), { status: 400 });
    }
    
    // Verificar que el token pertenezca al admin
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user || user.email !== 'admin@pachamama.com') {
      return new Response(JSON.stringify({ error: 'Accesso non autorizzato' }), { status: 401 });
    }

    const { error } = await supabaseAdmin
      .from('gift_cards')
      .update({
          status: status,
          gift_card_url: gift_card_url 
      })
      .eq('id', orderId);

    if (error) throw error;
    
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};
