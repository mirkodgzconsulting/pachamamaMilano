import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../lib/supabase';

export const GET: APIRoute = async ({ url }) => {
  try {
    const email = url.searchParams.get('email')?.trim().toLowerCase();

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email mancante' }), { status: 400 });
    }

    // Usamos supabaseAdmin para saltar RLS y obtener las órdenes de ese email específico
    const { data, error } = await supabaseAdmin
      .from('gift_cards')
      .select('*')
      .eq('sender_email', email)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Error fetching orders:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};
